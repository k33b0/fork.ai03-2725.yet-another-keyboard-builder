import Decimal from 'decimal.js'
import makerjs from 'makerjs'
import { CutoutGenerator } from './CutoutGenerator'

// PE Foam stabilizer cutout
// PCB-mount stabilizer housings sit on the PCB, so the foam is removed around both
// housings and along the wire between them. The result is one U-shaped outline
// that leaves an island of foam under the switch, joined to the sheet at the top.
// The wire runs on the south side (same as the MX cutouts); use _rs: 180 to flip it.

// Housing and wire sizes in mm from the switch center, based on Durock V2 screw-in stabilizers
const HOUSING_HALF_WIDTH = new Decimal("3.5")  // 7mm wide
const HOUSING_TOP = new Decimal("9")           // screw side
const HOUSING_BOTTOM = new Decimal("-11.5")    // wire side
const WIRE_CENTER = new Decimal("-9.5")
const WIRE_THICKNESS = new Decimal("3")

// Closed outline through points (all corners 90 degrees) with every corner rounded.
// Each corner radius is capped at half of its shorter neighboring edge, so close
// corners (the 0.5mm wire step) become two arcs that meet in an S-bend.
function filletedOutline(points, radius) {

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

export class StabilizerPEFoam extends CutoutGenerator {

    generate(key, generatorOptions) {

        // Stabilizer spacing, same as StabilizerMXBasic
        let keySize = key.width

        if (!key.skipOrientationFix && key.height > key.width) {
            keySize = key.height
        }

        let left = null
        let right = null

        if (keySize.gte(8)) {
            left = right = new Decimal("66.675")
        }
        else if (keySize.gte(7)) {
            left = right = new Decimal("57.15")
        }
        else if (keySize.gte(6.25)) {
            left = right = new Decimal("50")
        }
        else if (keySize.gte(6)) {
            if (key.shift6UStabilizers) {
                left = new Decimal("57.15")
                right = new Decimal("38.1")
            } else {
                left = right = new Decimal("47.625")
            }
        }
        else if (keySize.gte(4.5)) {
            left = right = new Decimal("35")
        }
        else if (keySize.gte(4.25)) {
            left = right = new Decimal("30")
        }
        else if (keySize.gte(3)) {
            left = right = new Decimal("19.05")
        }
        else if (keySize.gte(2)) {
            left = right = new Decimal("11.938")
        }
        else {
            return null
        }

        const k = generatorOptions.kerf

        // Positive kerf shrinks the opening: outer edges move in, edges of the switch island move out
        const outerLeft = left.times(-1).minus(HOUSING_HALF_WIDTH).plus(k)
        const innerLeft = left.times(-1).plus(HOUSING_HALF_WIDTH).minus(k)
        const innerRight = right.minus(HOUSING_HALF_WIDTH).plus(k)
        const outerRight = right.plus(HOUSING_HALF_WIDTH).minus(k)
        const top = HOUSING_TOP.minus(k)
        const bottom = HOUSING_BOTTOM.plus(k)
        const channelTop = WIRE_CENTER.plus(WIRE_THICKNESS.dividedBy(2)).minus(k)
        const channelBottom = WIRE_CENTER.minus(WIRE_THICKNESS.dividedBy(2)).plus(k)

        const points = [
            [outerLeft, top],
            [innerLeft, top],
            [innerLeft, channelTop],
            [innerRight, channelTop],
            [innerRight, top],
            [outerRight, top],
            [outerRight, bottom],
            [innerRight, bottom],
            [innerRight, channelBottom],
            [innerLeft, channelBottom],
            [innerLeft, bottom],
            [outerLeft, bottom],
        ].map(([x, y]) => [x.toNumber(), y.toNumber()])

        let cutouts = filletedOutline(points, generatorOptions.stabilizerFilletRadius.toNumber())

        if (!key.skipOrientationFix && key.height > key.width) {
            cutouts = makerjs.model.rotate(cutouts, -90)
        }

        return cutouts;
    }
}
