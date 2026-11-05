/**
 * Done criterion 5 — the demo toggle sits on the left door armrest and is not visible
 * from the main (kneeling) view of the belt path. Also proves the toggle works with a
 * real SIK trigger.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {
  bp, carLocalOf, check, checkKneelingEyePose, fmt, log, obj, realTap, resetToStartLoose,
  viewReport, waitForLensReady, briefViewFraction, meshCorners,
} from "./BeltPathLeafHelpers"

@component
export class BeltPathC5DemoToggleScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    checkKneelingEyePose()

    const toggle = carLocalOf("DemoToggle")
    const armrest = carLocalOf("LeftArmrest")
    const d = toggle.sub(armrest)
    log("DemoToggle car-local " + fmt(toggle) + ", LeftArmrest " + fmt(armrest) + ", offset " + fmt(d))
    check(toggle.x < -40, "toggle is on the left side of the car (x " + toggle.x.toFixed(1) + ")")
    check(Math.abs(d.x) <= 8 && Math.abs(d.z) <= 15 && d.y >= -1 && d.y <= 8,
      "toggle sits on the left armrest (offset " + fmt(d) + ")")

    const v = viewReport("DemoToggle", 3.5)
    check(!v.sphereVisible, "toggle sphere (r 3.5 cm) not visible from the main view")
    check(v.cornersInView === 0, "no part of the toggle bounds in the main view (" + v.cornersInView + "/8)")
    check(briefViewFraction("DemoToggle", meshCorners("DemoToggle")) === 0, "no toggle corner inside the brief's 23x38 cm main view")
    check(!v.centerInView, "toggle center outside the main view")

    await realTap(ix, "DemoModeToggle")
    check(api.getMode() === "Tight", "real toggle press -> Tight (got " + api.getMode() + ")")
    await realTap(ix, "DemoModeToggle")
    check(api.getMode() === "Loose", "second press -> Loose (got " + api.getMode() + ")")
    log("C5 done")
  }
}
