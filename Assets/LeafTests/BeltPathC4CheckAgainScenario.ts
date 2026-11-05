/**
 * Done criterion 4 — "Check again" hides the buttons and card, returns the seat to its
 * original position and restores the start state. Real seat drag and real button triggers;
 * checked for both card kinds.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {
  bp, check, DRAG_SPEED_CM_S, fmt, log, obj, realDragSeat, realTap, resetToStartLoose, waitFor, waitForLensReady,
} from "./BeltPathLeafHelpers"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"

@component
export class BeltPathC4CheckAgainScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    const seat = obj("CarSeat").getTransform()
    const home = seat.getLocalPosition()
    log("CarSeat home local " + fmt(home))

    for (const answer of ["CrossedLineButton", "StayedInsideButton"]) {
      await realDragSeat(ix, DRAG_SPEED_CM_S, 1200)
      await waitFor(() => api.getStateName() === "answering", 2000, "answering")
      await realTap(ix, answer)
      check(api.getStateName() === "result", answer + ": state result")
      check(api.isResultCardVisible(), answer + ": card visible")

      log(answer + ": seat offset just before Check again " + api.getSeatOffsetCm().toFixed(3) + " cm (still springing back if > 0)")
      await realTap(ix, "CheckAgainButton")
      const p = seat.getLocalPosition()
      log(answer + " -> after Check again: state=" + api.getStateName() + " buttons=" + api.areAnswerButtonsVisible()
        + " card=" + api.isResultCardVisible() + " kind=" + api.getCardKind() + " offset=" + api.getSeatOffsetCm()
        + " seatLocal=" + fmt(p) + " peak=" + api.getPeakOffsetCm()
        + " opacity=" + api.getOverlayOpacity().toFixed(3))
      check(api.getStateName() === "start", answer + ": state back to start")
      check(!api.areAnswerButtonsVisible(), answer + ": buttons hidden")
      check(!api.isResultCardVisible() && api.getCardKind() === "none", answer + ": card hidden")
      check(!obj("AnswerButtons").enabled && !obj("ResultCard").enabled, answer + ": button and card objects disabled")
      check(api.getSeatOffsetCm() === 0, answer + ": seat offset 0 (got " + api.getSeatOffsetCm() + ")")
      check(p.distance(home) < 0.01, answer + ": seat at original position (moved " + p.distance(home).toFixed(4) + " cm)")
      check(api.getPeakOffsetCm() === 0, answer + ": peak travel reset")
      check(api.getMode() === "Loose", answer + ": demo mode unchanged")
      await waitFor(() => api.getOverlayOpacity() >= 0.99, 2000, "start fade-in replays")
      log(answer + ": overlay faded back in")
      await sleep(200)
    }
    log("C4 done")
  }
}
