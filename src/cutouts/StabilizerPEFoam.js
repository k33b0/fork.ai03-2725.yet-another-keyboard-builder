import Decimal from 'decimal.js'
import makerjs from 'makerjs'
import { CutoutGenerator } from './CutoutGenerator'
import { filletedOutline } from './FilletedOutline'

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
