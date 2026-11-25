import Decimal from 'decimal.js'
import makerjs from 'makerjs'
import { CutoutGenerator } from './CutoutGenerator'
import { filletedOutline } from './FilletedOutline'

// Bottom Foam switch cutout
// Bottom foam sits under the PCB, so it is voided around each Kailh MX hotswap socket
// (CPG151101S11-16): the socket body plus the solder wings on each side, with clearance.
// Drawn top-down, south-facing (same as SwitchPEFoam); new SwitchBottomFoam("north") turns it 180 degrees.
//
// The datasheet's recommended PCB layout is a bottom view, so it is mirrored here:
// the lower socket hole sits on switch pin (-3.81, 2.54), the higher one on pin (2.54, 5.08).

const CLEARANCE = new Decimal("0.5")

const PIN_LOW = [new Decimal("-3.81"), new Decimal("2.54")]
const PIN_HIGH = [new Decimal("2.54"), new Decimal("5.08")]

// Socket body, from the datasheet
const BODY_LENGTH = new Decimal("10.90")
const BODY_HEIGHT = new Decimal("5.89")      // high (right) part
const BODY_LOW_HEIGHT = new Decimal("4.00")  // low (left) part
const BODY_STEP = new Decimal("3.27")        // step between the parts, measured left of PIN_HIGH

// Solder wings: recommended PCB pads, out from each end of the body, centered on their pin
const WING_LENGTH = new Decimal("2.55")
const WING_HEIGHT = new Decimal("2.5")

export class SwitchBottomFoam extends CutoutGenerator {

    constructor(orientation = "south") {
        super()
        this.orientation = orientation
    }

    generate(key, generatorOptions) {

        // Positive kerf shrinks the opening
        const e = CLEARANCE.minus(generatorOptions.kerf)

        const bodyCenterX = PIN_LOW[0].plus(PIN_HIGH[0]).dividedBy(2)
        const bodyLeft = bodyCenterX.minus(BODY_LENGTH.dividedBy(2))
        const bodyRight = bodyCenterX.plus(BODY_LENGTH.dividedBy(2))
        const bodyBottom = PIN_LOW[1].minus(BODY_HEIGHT.minus(PIN_HIGH[1].minus(PIN_LOW[1])).dividedBy(2))
        const lowTop = bodyBottom.plus(BODY_LOW_HEIGHT)
        const highTop = bodyBottom.plus(BODY_HEIGHT)
        const stepX = PIN_HIGH[0].minus(BODY_STEP)
        const halfWing = WING_HEIGHT.dividedBy(2)

        const xWingL = bodyLeft.minus(WING_LENGTH).minus(e)
        const xBodyL = bodyLeft.minus(e)
        const xStep = stepX.minus(e)
        const xBodyR = bodyRight.plus(e)
        const xWingR = bodyRight.plus(WING_LENGTH).plus(e)

        const points = [
            [xBodyL, bodyBottom.minus(e)],
            [xBodyR, bodyBottom.minus(e)],
            [xBodyR, PIN_HIGH[1].minus(halfWing).minus(e)],
            [xWingR, PIN_HIGH[1].minus(halfWing).minus(e)],
            [xWingR, PIN_HIGH[1].plus(halfWing).plus(e)],
            [xBodyR, PIN_HIGH[1].plus(halfWing).plus(e)],
            [xBodyR, highTop.plus(e)],
            [xStep, highTop.plus(e)],
            [xStep, lowTop.plus(e)],
            [xBodyL, lowTop.plus(e)],
            [xBodyL, PIN_LOW[1].plus(halfWing).plus(e)],
            [xWingL, PIN_LOW[1].plus(halfWing).plus(e)],
            [xWingL, PIN_LOW[1].minus(halfWing).minus(e)],
            [xBodyL, PIN_LOW[1].minus(halfWing).minus(e)],
        ].map(([x, y]) => [x.toNumber(), y.toNumber()])

        let model = filletedOutline(points, generatorOptions.switchFilletRadius.toNumber())

        if (this.orientation === "north") {
            model = makerjs.model.rotate(model, 180)
        }

        if (!key.skipOrientationFix && key.height > key.width) {
            model = makerjs.model.rotate(model, -90)
        }

        return model;
    }
}
