/**
 * Done criterion 15 — the card catches the pinch (regression). With either result card up (red card
 * with the buckle highlight on, and the Stayed card), a ray from the eye through the card's center
 * hits the card (or its Check again button) first, a ray at Check again hits Check again first, and
 * the seat grab is off, so a pinch on the card can never start a shake. Card and buttons come from
 * real SIK triggers.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {
  bp, check, eyeRayFirstHit, log, realTap, resetToStartLoose, shakeAndRelease, waitForLensReady,
} from "./BeltPathLeafHelpers"

@component
export class BeltPathC15CardTakesPinchScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)

    for (const answer of ["CrossedLineButton", "StayedInsideButton"]) {
      await shakeAndRelease(ix)
      await realTap(ix, answer)
      const kind: string = api.getCardKind()
      check(api.getStateName() === "result" && api.isResultCardVisible(), answer + ": card shown (" + kind + ")")
      if (kind === "crossed") check(api.isStepHighlightShown(), "crossed: buckle highlight is on during the ray check")
      check(!api.isGrabEnabled(), kind + ": seat grab is off while the card shows")

      const card = await eyeRayFirstHit("ResultCard")
      log(kind + ": eye ray at ResultCard first hits " + card.hitName)
      check(card.onTarget, kind + ": a pinch aimed at the card lands on the card (first hit: " + card.hitName + ")")
      check(card.hitName !== "SeatGrabHandle", kind + ": the seat grab box is not the first hit")
      const again = await eyeRayFirstHit("CheckAgainButton")
      log(kind + ": eye ray at CheckAgainButton first hits " + again.hitName)
      check(again.onTarget, kind + ": a pinch aimed at Check again lands on it (first hit: " + again.hitName + ")")

      await realTap(ix, "CheckAgainButton")
      check(api.getStateName() === "start", kind + ": Check again -> start")
    }
    check(api.isGrabEnabled(), "recovered: seat grab back on at start")
    log("C15 done")
  }
}
