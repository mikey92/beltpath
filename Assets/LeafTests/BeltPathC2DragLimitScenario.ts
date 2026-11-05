/**
 * Done criterion 2 — Loose: a real grab-and-drag of the seat moves its edge past the 2.5 cm
 * red line, capped at 4 cm. Tight: capped at 1 cm. Seat moved through its SIK Interactable
 * (LEAF scripted interactor drag); the Tight mode is selected by triggering the real
 * DemoModeToggle UIKit button. Values read via global.beltPath.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { bp, check, log, realTap, resetToStartLoose, shakeAndRelease, waitForLensReady } from "./BeltPathLeafHelpers"

@component
export class BeltPathC2DragLimitScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)

    // Loose
    check(Math.abs(api.getLimitCm() - 4) < 1e-3, "Loose limit is 4 cm (got " + api.getLimitCm() + ")")
    const loose = await shakeAndRelease(ix)
    check(loose.peak > api.getRedLineCm(), "Loose: seat edge passed the red line (peak " + loose.peak.toFixed(3) + " > " + api.getRedLineCm() + ")")
    check(loose.peak <= 4 + 1e-3, "Loose: capped at 4 cm (peak " + loose.peak.toFixed(3) + ")")
    check(loose.peak >= 3.9, "Loose: reached the 4 cm cap (peak " + loose.peak.toFixed(3) + ")")
    await realTap(ix, "StayedInsideButton")
    await realTap(ix, "CheckAgainButton")

    // Tight, selected with the real demo toggle
    await realTap(ix, "DemoModeToggle")
    check(api.getMode() === "Tight", "demo toggle switched to Tight (got " + api.getMode() + ")")
    check(Math.abs(api.getLimitCm() - 1) < 1e-3, "Tight limit is 1 cm (got " + api.getLimitCm() + ")")
    const tight = await shakeAndRelease(ix)
    check(tight.peak <= 1 + 1e-3, "Tight: capped at 1 cm (peak " + tight.peak.toFixed(3) + ")")
    check(tight.peak >= 0.9, "Tight: seat did move up to the cap (peak " + tight.peak.toFixed(3) + ")")
    check(tight.peak < api.getRedLineCm(), "Tight: seat edge stays before the red plate (peak " + tight.peak.toFixed(3) + ")")
    await realTap(ix, "StayedInsideButton")
    await realTap(ix, "CheckAgainButton")
    await realTap(ix, "DemoModeToggle")
    check(api.getMode() === "Loose", "restored Loose mode")
    log("C2 done")
  }
}
