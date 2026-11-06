/**
 * Done criterion 7 — distance view. Standing back (camera >= 95 cm from the belt path target for
 * 0.3 s) only the band and the one word "Belt path" show: ruler, edge pin and ghost line are off,
 * the seat cannot be grabbed, no "pass/safe" words. 80..95 cm keeps the current mode (hysteresis).
 * Kneeling (<= 80 cm) the word leaves and the ruler comes back; before the align pinch the align
 * hint shows only near. The preview camera cannot be moved by the test, so the distance is set
 * through BeltPathMain.debugSetViewerDistanceCm (null = the real camera, ~60 cm at the start pose).
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { findInteractablesByName } from "Leaf.lspkg/Interactors/InteractableUtils"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, check, ensureAligned, forbiddenWordHits, log, obj, visibleTexts, waitFor, waitForLensReady, waitForSettled,
} from "./BeltPathLeafHelpers"

const WORD = "Belt path"
const HINT = "Pinch the seat edge at the belt path"

function grabbable(): number { return findInteractablesByName("SeatGrabHandle", undefined, true).length }
function alignTargets(): number { return findInteractablesByName("AlignTarget", undefined, true).length }

async function goTo(cm: number | null, mode: string): Promise<void> {
  const api = bp()
  log("viewer distance -> " + (cm === null ? "real camera" : cm + " cm"))
  api.debugSetViewerDistanceCm(cm)
  await waitFor(() => api.getViewMode() === mode, 2000, "view mode " + mode)
  await waitForSettled("view " + mode + " transition settled")
}

@component
export class BeltPathC7DistanceModeScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const api = bp()
    try {
      const d0 = api.getViewerDistanceCm()
      log("real viewer distance " + (d0 === null ? "unknown" : d0.toFixed(1)) + " cm")
      check(api.getStateName() === "start", "state is start (got " + api.getStateName() + ")")
      check(api.getViewMode() === "near", "start pose is near (got " + api.getViewMode() + ")")
      check(grabbable() === 1, "near: the seat can be grabbed")

      // ── Far ──
      await goTo(150, "far")
      check(!obj("Ruler").isEnabledInHierarchy, "far: ruler off")
      check(!obj("EdgePin").isEnabledInHierarchy, "far: edge pin off")
      check(!obj("GhostOutline").isEnabledInHierarchy, "far: ghost outline off")
      const texts = visibleTexts()
      log("far visible texts: " + JSON.stringify(texts))
      check(texts.indexOf(WORD) >= 0 && api.isFarLabelShown(), "far: \"" + WORD + "\" shown")
      const lw: vec3 = api.getFarLabelWorld()
      const tw = obj("BeltPathTarget").getTransform().getWorldPosition()
      const dl = lw.distance(tw)
      check(dl <= 15, "far: word within 15 cm of BeltPathTarget (" + dl.toFixed(1) + " cm)")
      const band = api.overlay.getBandOpacity()
      check(band >= 0.99, "far: band opacity " + band.toFixed(3) + " >= 0.99")
      check(grabbable() === 0, "far: no active SeatGrabHandle Interactable")
      check(!api.isAlignHintShown(), "far: align hint hidden")
      const hits = forbiddenWordHits(texts)
      check(hits.length === 0, "far: no pass/safe words (" + hits.join("; ") + ")")

      // ── Hysteresis ──
      api.debugSetViewerDistanceCm(85)
      await sleep(800)
      check(api.getViewMode() === "far", "85 cm keeps far (got " + api.getViewMode() + ")")
      check(!obj("Ruler").isEnabledInHierarchy && api.isFarLabelShown(), "85 cm: still band + word only")

      // ── Near ──
      await goTo(70, "near")
      check(api.isRulerShown() && obj("Ruler").isEnabledInHierarchy, "near: ruler on")
      check(api.getRulerOpacity() >= 0.99, "near: ruler opacity " + api.getRulerOpacity().toFixed(3) + " >= 0.99")
      check(obj("EdgePin").isEnabledInHierarchy && obj("GhostOutline").isEnabledInHierarchy, "near: edge pin and ghost on")
      check(!api.isFarLabelShown() && visibleTexts().indexOf(WORD) < 0, "near: the word is gone")
      check(grabbable() === 1, "near: the seat can be grabbed")

      // ── Real camera again ──
      api.debugSetViewerDistanceCm(null)
      await sleep(800)
      check(api.getViewMode() === "near", "real camera keeps near (got " + api.getViewMode() + ")")

      // ── Align step: hint only near ──
      api.debugResetAlignment()
      await waitForSettled("align step settled")
      check(!api.isAligned() && api.isAlignHintShown(), "after reset (near): align hint shown")
      await goTo(150, "far")
      check(!api.isAlignHintShown() && visibleTexts().indexOf(HINT) < 0, "align step far: hint hidden")
      check(alignTargets() === 0, "align step far: edge target off")
      check(!obj("Ruler").isEnabledInHierarchy && grabbable() === 0, "align step far: ruler off, no grab")
      await goTo(70, "near")
      check(api.isAlignHintShown() && visibleTexts().indexOf(HINT) >= 0, "align step near: hint shown")
      check(alignTargets() === 1, "align step near: edge target on")
      check(!obj("Ruler").isEnabledInHierarchy && grabbable() === 0, "align step near: ruler still hidden until the pinch")
    } finally {
      api.debugSetViewerDistanceCm(null)
    }
    await waitFor(() => api.getViewMode() === "near", 2000, "near with the real camera")
    await ensureAligned()
    check(api.isAligned() && api.isRulerShown() && grabbable() === 1, "recovered: aligned, ruler on, seat grabbable")
    log("C7 done")
  }
}
