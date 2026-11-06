/**
 * Done criterion 8 — shake hint (L2). Right after the align pinch the seat's side (LabelAnchorShell)
 * shows "Grab the seat here and shake" for 3 s, then it fades out. Grabbing the seat ends it at
 * once. It never shows in the far view.
 *
 * 1. debugResetAlignment -> real pinch on AlignTarget -> the hint is visible within 1 s, stands on
 *    LabelAnchorShell, is still there 2.8 s after it appeared and gone 3.6 s after it appeared.
 * 2. Shake + answer + real "Check again" (the hint shows again at every near start) -> start a real
 *    seat drag while it shows -> in the onGrabStart callback (right after BeltPathMain's handler)
 *    the text is already gone, and it stays gone during the drag.
 * 3. Far view: going far while the hint shows removes it; asking the labels to show while far does
 *    nothing. Back to near and the real camera.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, check, DRAG_SPEED_CM_S, interactable, log, obj, realDragSeat, realTap, resetToStartLoose, visibleTexts, waitFor,
  waitForLensReady, waitForSettled,
} from "./BeltPathLeafHelpers"

const HINT = "Grab the seat here and shake"

function hintShown(): boolean { return visibleTexts().indexOf(HINT) >= 0 }

/** The enabled Text showing the hint, or null. */
function hintTextObj(): SceneObject | null {
  const anchor = obj("LabelAnchorShell")
  for (let i = 0; i < anchor.getChildrenCount(); i++) {
    const c = anchor.getChild(i)
    const t = c.getComponent("Component.Text") as Text
    if (t && t.text === HINT && c.isEnabledInHierarchy) return c
  }
  return null
}

@component
export class BeltPathC8ShakeHintScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)

    // ── 1. After the align pinch: visible within 1 s, 3 s hold, gone by 3.6 s ──
    api.debugResetAlignment()
    await waitForSettled("align step settled")
    check(!api.isAligned() && !hintShown(), "align step: no shake hint before the pinch")
    log("real trigger AlignTarget")
    await ix.trigger(interactable("AlignTarget"))
    const tPinch = getTime()
    await waitFor(() => api.isAligned(), 2000, "aligned after the pinch")
    await waitFor(hintShown, 1000, "\"" + HINT + "\" within 1 s of the pinch")
    const tShow = getTime()
    log("hint appeared " + ((tShow - tPinch) * 1000).toFixed(0) + " ms after the pinch")
    check(tShow - tPinch <= 1.0, "hint visible within 1 s of the pinch")
    check(hintTextObj() !== null, "the hint stands on LabelAnchorShell (the seat's side)")
    check(visibleTexts().indexOf("Rear-facing car seat") < 0, "the old \"Rear-facing car seat\" label is gone")
    await sleep(Math.max(0, 2800 - (getTime() - tShow) * 1000))
    log("at +" + ((getTime() - tShow) * 1000).toFixed(0) + " ms: shown=" + hintShown())
    check(hintShown(), "hint still visible 2.8 s after it appeared (3 s hold)")
    await sleep(Math.max(0, 3600 - (getTime() - tShow) * 1000))
    const tGoneCheck = (getTime() - tShow) * 1000
    log("at +" + tGoneCheck.toFixed(0) + " ms: shown=" + hintShown())
    check(!hintShown(), "hint gone 3.6 s after it appeared (checked at +" + tGoneCheck.toFixed(0) + " ms)")
    check(api.startLabels.isShowing() === false, "start labels finished")

    // ── 2. Check again -> hint shows again -> a real grab ends it at once ──
    await realDragSeat(ix, DRAG_SPEED_CM_S, 1200)
    await waitFor(() => api.getStateName() === "answering", 2000, "answering")
    await realTap(ix, "StayedInsideButton")
    await realTap(ix, "CheckAgainButton")
    check(api.getStateName() === "start", "back to start")
    check(hintShown(), "hint shows again at the next start (before the grab)")
    let atGrab: boolean | null = null
    let shownDuringDrag = false
    const unsub = api.seatShake.onGrabStart.add(() => { atGrab = hintShown() })
    const seat = interactable("SeatGrabHandle")
    const unsub2 = seat.onDragUpdate.add(() => { if (hintShown()) shownDuringDrag = true })
    try {
      await realDragSeat(ix, DRAG_SPEED_CM_S, 1200)
    } finally {
      unsub()
      unsub2()
    }
    check(atGrab === false, "right at onGrabStart the hint is gone (shown=" + atGrab + ")")
    check(!shownDuringDrag, "the hint never came back during the drag")
    await waitFor(() => api.getStateName() === "answering", 2000, "answering after the release")
    check(!hintShown(), "no hint while answering")
    await realTap(ix, "StayedInsideButton")
    await realTap(ix, "CheckAgainButton")
    check(hintShown(), "hint shows at the near start after Check again")

    // ── 3. Never in the far view ──
    try {
      api.debugSetViewerDistanceCm(150)
      await waitFor(() => api.getViewMode() === "far", 2000, "far view")
      check(!hintShown(), "far: the hint ends as soon as the view goes far")
      api.startLabels.showBriefly()
      await sleep(500)
      check(!hintShown() && !api.startLabels.isShowing(), "far: asking the labels to show does nothing")
      await waitForSettled("far settled")
      check(!hintShown(), "far: still no hint after settling")
    } finally {
      api.debugSetViewerDistanceCm(null)
    }
    await waitFor(() => api.getViewMode() === "near", 2000, "near with the real camera")
    await waitForSettled("near settled")
    check(api.isAligned() && api.getStateName() === "start" && api.isRulerShown(), "recovered: aligned start, ruler on")
    log("C8 done")
  }
}
