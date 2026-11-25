import Decimal from 'decimal.js'
import makerjs from 'makerjs'
import { CutoutGenerator } from './CutoutGenerator'

// PE Foam switch cutout
// PE foam sits on the PCB under the switches, so it only gets holes for the
// parts of an MX switch that pass into the PCB (Cherry MX 1-Pole footprint),
// plus a rounded window for a reverse-mount LED (SK6812MINI-E).
// The footprint is drawn south-facing (LED below the center post, as in the
// Cherry spec) and turned 180 degrees for north-facing: new SwitchPEFoam("north").

const INCH = new Decimal("25.4")

// [x, y, diameter] in inches, relative to the switch center, y up
const HOLES = [
    ["0", "0", "0.157"],        // center post
    ["-0.2", "0", "0.067"],     // plastic peg (5-pin switches)
    ["0.2", "0", "0.067"],      // plastic peg (5-pin switches)
    ["-0.15", "0.1", "0.059"],  // switch pin
    ["0.1", "0.2", "0.059"],    // switch pin
    // ["-0.05", "-0.2", "0.039"], // LED leg (soldered-on LEDs)
    // ["0.05", "-0.2", "0.039"],  // LED leg (soldered-on LEDs)
]

// LED window in mm, centered on the Cherry spec LED position (0, -0.2 in)
// SK6812MINI-E body (3.2 x 2.8) + 0.05 thermal isolation on each side
const LED_WIDTH = new Decimal("3.3")
const LED_HEIGHT = new Decimal("2.9")
const LED_CORNER_RADIUS = 0.2
const LED_CENTER_Y = new Decimal("-0.2").times(INCH)

export class SwitchPEFoam extends CutoutGenerator {

    constructor(orientation = "south") {
        super()
        this.orientation = orientation
    }

    generate(key, generatorOptions) {

        let model = { paths: {}, models: {} }

        HOLES.forEach(([x, y, d], i) => {
            const center = [new Decimal(x).times(INCH).toNumber(), new Decimal(y).times(INCH).toNumber()]
            const radius = new Decimal(d).times(INCH).dividedBy(2).minus(generatorOptions.kerf).toNumber()
            model.paths["hole" + i] = new makerjs.paths.Circle(center, radius)
        })

        const ledWidth = LED_WIDTH.minus(generatorOptions.kerf.times(2))
        const ledHeight = LED_HEIGHT.minus(generatorOptions.kerf.times(2))
        const led = new makerjs.models.RoundRectangle(ledWidth.toNumber(), ledHeight.toNumber(), LED_CORNER_RADIUS)
        led.origin = [ledWidth.dividedBy(-2).toNumber(), LED_CENTER_Y.minus(ledHeight.dividedBy(2)).toNumber()]
        model.models.led = led

        if (this.orientation === "north") {
            model = makerjs.model.rotate(model, 180)
        }

        if (!key.skipOrientationFix && key.height > key.width) {
            model = makerjs.model.rotate(model, -90)
        }

        return model;
    }
}
