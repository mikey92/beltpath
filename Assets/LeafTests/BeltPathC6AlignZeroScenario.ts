/**
 * Done criterion 6 — align zero. Before the first shake the parent pinches the seat's side edge
 * once at the belt path; the ruler's 0 and the ghost outline's edge snap to that point.
 *
 * Before the pinch: the ruler, ghost and edge pin are hidden, the seat cannot be grabbed, and the
 * hint "Pinch the seat edge at the belt path" shows. The pinch is a real SIK trigger on the
 * AlignTarget Interactable (LEAF scripted interactor, ray hit on the edge collider).
 * After the pinch: the hint hides, the ruler/ghost/pin show, and at rest the edge pin's centre lies
 * within 0.5 cm of the ruler 0 along the ruler (the ruler measures side to side; it stays on the
 * cushion in the seat's front-face plane, so its height differs from the belt path by design).
 * The ghost's seat-edge line is checked against the same 0, from the overlay's real inputs.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { findInteractablesByName } from "Leaf.lspkg/Interactors/InteractableUtils"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, carLocalBounds, check, fmt, interactable, log, obj, toCarLocal, visibleTexts, waitFor, waitForLensUp,
  waitForSettled,
} from "./BeltPathLeafHelpers"

const HINT = "Pinch the seat edge at the belt path"

@component
export class BeltPathC6AlignZeroScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensUp()
    const api = bp()
    if (api.isAligned()) {
      log("already aligned from an earlier run; going back to the align step")
      api.debugResetAlignment()
      await waitForSettled("align step fade-in settled")
    }

    // ── Before the pinch ──
    check(api.getStateName() === "start", "state is start (got " + api.getStateName() + ")")
    check(!api.isAligned(), "not aligned yet")
    check(!api.isRulerShown() && !obj("Ruler").isEnabledInHierarchy, "before pinch: ruler hidden")
    check(!obj("GhostOutline").isEnabledInHierarchy, "before pinch: ghost outline hidden")
    check(!obj("EdgePin").isEnabledInHierarchy, "before pinch: edge pin hidden")
    check(api.isAlignHintShown(), "before pinch: align hint shown")
    const textsBefore = visibleTexts()
    check(textsBefore.indexOf(HINT) >= 0, "before pinch: hint text visible: \"" + HINT + "\"")
    check(obj("AlignHint").isEnabledInHierarchy, "before pinch: hint object enabled")
    check(findInteractablesByName("SeatGrabHandle", undefined, true).length === 0,
      "before pinch: the seat cannot be grabbed yet")

    // ── Real pinch on the seat edge ──
    const ix = new DefaultLeafInteractor()
    log("real trigger AlignTarget")
    await ix.trigger(interactable("AlignTarget"))
    await waitFor(() => api.isAligned(), 2000, "aligned after the edge pinch")
    await waitForSettled("stagger after the align pinch settled")
    check(api.getRulerOpacity() >= 0.99, "ruler fully faded in after the stagger (" + api.getRulerOpacity().toFixed(3) + ")")

    // ── After the pinch ──
    const pinchW: vec3 = api.getAlignPointWorld()
    check(!!pinchW, "pinched point recorded")
    const pinch = toCarLocal(pinchW)
    const zero = toCarLocal(api.getRulerZeroWorld())
    check(Math.abs(api.getSeatOffsetCm()) < 1e-3, "seat at rest (offset " + api.getSeatOffsetCm().toFixed(3) + " cm)")
    const pinB = carLocalBounds("EdgePin")
    const pinX = (pinB.min.x + pinB.max.x) / 2
    const pinToZero = Math.abs(pinX - zero.x)
    log("pinched point car-local " + fmt(pinch) + ", ruler 0 car-local " + fmt(zero)
      + ", edge pin centre x " + pinX.toFixed(3) + ", pin to ruler 0 " + pinToZero.toFixed(3) + " cm, pinch to ruler 0 "
      + Math.abs(zero.x - pinch.x).toFixed(3) + " cm, height below the belt path " + (pinch.y - zero.y).toFixed(2) + " cm")
    check(pinToZero <= 0.5, "at rest the edge pin stands on ruler 0 (|pin centre x - ruler 0 x| = " + pinToZero.toFixed(3) + " cm <= 0.5)")

    check(api.isRulerShown() && obj("Ruler").isEnabledInHierarchy, "after pinch: ruler shown")
    check(obj("GhostOutline").isEnabledInHierarchy, "after pinch: ghost outline shown")
    check(obj("EdgePin").isEnabledInHierarchy, "after pinch: edge pin shown")
    // Ghost seat-edge line = outline max x minus half the edge thickness and the inflate (real inputs).
    const ov = api.overlay
    const halfEdge = ov.ghostEdgeCm / 2
    const inflate = ov.ghostInflateCm
    const g = carLocalBounds("GhostOutline")
    const ghostEdge = g.max.x - halfEdge - inflate
    log("ghost edge inputs: edge " + ov.ghostEdgeCm + " cm, inflate " + inflate + " cm")
    check(Math.abs(ghostEdge - zero.x) <= 0.5,
      "ghost edge within 0.5 cm of ruler 0 along the ruler (ghost " + ghostEdge.toFixed(2) + ", ruler 0 " + zero.x.toFixed(2) + ")")
    check(Math.abs(ghostEdge - pinX) <= 0.5,
      "ghost edge within 0.5 cm of the edge pin (ghost " + ghostEdge.toFixed(2) + ", pin " + pinX.toFixed(2) + ")")

    check(!api.isAlignHintShown(), "after pinch: align hint hidden")
    check(visibleTexts().indexOf(HINT) < 0, "after pinch: hint text no longer visible")
    check(findInteractablesByName("AlignTarget", undefined, true).length === 0, "after pinch: edge target off")
    check(findInteractablesByName("SeatGrabHandle", undefined, true).length === 1, "after pinch: the seat can be grabbed")
    log("C6 done")
  }
}
