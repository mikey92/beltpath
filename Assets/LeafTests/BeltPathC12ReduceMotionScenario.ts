/**
 * Done criterion 12 — reduce motion (accessibility). With BeltPathMain.setReduceMotion(true) every
 * arrival and departure finishes inside the call that starts it (same frame): no tween left running
 * (isMotionSettled), things that arrive are at full opacity, things that leave are switched off.
 *
 * Cycle, each step checked synchronously right after the call (no await in between):
 *   release -> seat home, answer buttons opaque  |  answer -> buttons off, card opaque  |
 *   Check again -> card off, band/ghost/ruler/pin stagger done (overlay + ruler opacity 1), labels opaque  |
 *   far / near switches -> settled the frame they happen.
 * The original reduce-motion value is restored at the end (finally), and one Check again with motion
 * back on shows the stagger running again (so the switch really went back).
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, check, log, obj, resetToStartLoose, visibleTexts, waitFor, waitForLensReady, waitForSettled,
} from "./BeltPathLeafHelpers"

const HINT = "Grab the seat here and shake"

function settledNow(api: any, where: string): void {
  check(api.isMotionSettled(), where + ": settled in the same frame (isMotionSettled)")
}

@component
export class BeltPathC12ReduceMotionScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    await waitForSettled("start settled")
    const original: boolean = api.isReduceMotion()
    log("reduce motion was " + original)
    try {
      api.setReduceMotion(true)
      check(api.isReduceMotion(), "reduce motion on")

      // ── Grab, drag past the plate, release: the seat is home and the buttons are opaque at once ──
      api.debugBeginGrab()
      api.debugDragTo(4)
      await sleep(100)
      api.debugRelease()
      check(api.getStateName() === "answering", "release: answering")
      check(api.getSeatOffsetCm() === 0, "release: seat back home in the same frame (offset " + api.getSeatOffsetCm() + ")")
      check(api.areAnswerButtonsVisible() && obj("AnswerButtons").enabled, "release: answer buttons on")
      const alphas: number[] = api.answers.buttons.map((b: any) => b.alpha)
      check(alphas.every((a) => a >= 0.999), "release: both buttons fully opaque (" + alphas.join(", ") + ")")
      settledNow(api, "release")

      // ── Answer: buttons gone, card opaque, same frame ──
      api.pressCrossedLine()
      check(!obj("AnswerButtons").enabled, "answer: button row switched off at once")
      check(api.isResultCardVisible() && obj("ResultCard").enabled, "answer: card on")
      check(api.resultCard.alpha >= 0.999, "answer: card fully opaque (" + api.resultCard.alpha + ")")
      settledNow(api, "answer")

      // ── Check again: card gone, start stagger and labels done at once ──
      api.pressCheckAgain()
      check(api.getStateName() === "start", "Check again: start")
      check(!obj("ResultCard").enabled && !api.isResultCardVisible(), "Check again: card switched off at once")
      check(api.getOverlayOpacity() >= 0.999, "Check again: overlay opacity 1 (" + api.getOverlayOpacity().toFixed(3) + ")")
      check(api.getRulerOpacity() >= 0.999, "Check again: ruler opacity 1 (" + api.getRulerOpacity().toFixed(3) + ")")
      check(visibleTexts().indexOf(HINT) >= 0 && api.startLabels.alpha >= 0.999,
        "Check again: shake hint fully shown at once (alpha " + api.startLabels.alpha + ")")
      settledNow(api, "Check again")

      // ── The 3 s hold is a hold, not an animation: it stays, then the labels leave at once ──
      await sleep(1000)
      check(visibleTexts().indexOf(HINT) >= 0, "reduce motion keeps the 3 s hold (still shown at +1 s)")
      await waitFor(() => !api.startLabels.isShowing(), 3500, "labels gone after the hold")
      check(visibleTexts().indexOf(HINT) < 0 && api.startLabels.alpha === 0, "labels left at once after the hold")
      settledNow(api, "labels gone")

      // ── Far / near switches: settled the frame they happen ──
      api.debugSetViewerDistanceCm(150)
      await waitFor(() => api.getViewMode() === "far", 2000, "far view")
      settledNow(api, "far")
      check(!obj("Ruler").isEnabledInHierarchy && api.isFarLabelShown(), "far: ruler off, word on")
      api.debugSetViewerDistanceCm(70)
      await waitFor(() => api.getViewMode() === "near", 2000, "near view")
      settledNow(api, "near")
      check(api.getRulerOpacity() >= 0.999 && !api.isFarLabelShown(), "near: ruler opacity 1, word off")
    } finally {
      api.debugSetViewerDistanceCm(null)
      api.setReduceMotion(original)
    }
    check(api.isReduceMotion() === original, "reduce motion restored to " + original)
    if (!original) {
      // Motion back on: a Check again cycle animates again (the stagger is still running right after).
      api.debugBeginGrab()
      api.debugDragTo(1)
      api.debugRelease()
      await waitFor(() => api.getStateName() === "answering", 2000, "answering")
      await waitForSettled("buttons arrived")
      api.pressStayedInside()
      await waitForSettled("card arrived")
      api.pressCheckAgain()
      check(!api.isMotionSettled(), "motion on again: the start stagger is running right after Check again")
      await waitForSettled("start stagger settled")
    }
    await waitFor(() => api.getViewMode() === "near", 2000, "near with the real camera")
    check(api.getStateName() === "start" && api.getRulerOpacity() >= 0.99, "recovered: start, ruler shown")
    log("C12 done")
  }
}
