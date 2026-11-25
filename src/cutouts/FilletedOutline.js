import makerjs from 'makerjs'

// Closed outline through points (all corners 90 degrees) with every corner rounded.
// Each corner radius is capped at half of its shorter neighboring edge, so two close
// corners (such as a 0.5mm step) become two arcs that meet in an S-bend.
export function filletedOutline(points, radius) {

    const n = points.length
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
    const len = (v) => Math.hypot(v[0], v[1])

    // Tangent points and arc for each corner
    const corners = points.map((p, i) => {
        const toPrev = sub(points[(i + n - 1) % n], p)
        const toNext = sub(points[(i + 1) % n], p)
        const r = Math.min(radius, len(toPrev) / 2, len(toNext) / 2)
        const u = [toPrev[0] / len(toPrev), toPrev[1] / len(toPrev)]
        const v = [toNext[0] / len(toNext), toNext[1] / len(toNext)]
        const start = [p[0] + u[0] * r, p[1] + u[1] * r]
        const end = [p[0] + v[0] * r, p[1] + v[1] * r]
        let arc = null
        if (r > 0) {
            const center = [p[0] + (u[0] + v[0]) * r, p[1] + (u[1] + v[1]) * r]
            const a1 = makerjs.angle.ofPointInDegrees(center, start)
            const a2 = makerjs.angle.ofPointInDegrees(center, end)
            // Arcs run counterclockwise, so pick the order that gives the 90 degree arc
            arc = ((a2 - a1 + 360) % 360) < 180
                ? new makerjs.paths.Arc(center, r, a1, a2)
                : new makerjs.paths.Arc(center, r, a2, a1)
        }
        return { start, end, arc }
    })

    const model = { paths: {} }
    corners.forEach((c, i) => {
        if (c.arc) {
            model.paths["arc" + i] = c.arc
        }
        const next = corners[(i + 1) % n]
        if (len(sub(next.start, c.end)) > 1e-9) {
            model.paths["line" + i] = new makerjs.paths.Line(c.end, next.start)
        }
    })
    return model
}
