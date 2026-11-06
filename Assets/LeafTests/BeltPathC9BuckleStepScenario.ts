/**
 * Done criterion 9 — "Lock the belt" points at the real buckle (L3). After a real "Crossed the line"
 * press the band-colored box BuckleHighlight is on, wraps the SeatBeltBuckle's live bounds with a
 * margin of 0..2.5 cm on every side (and holds the latch plate), is in the device camera's view,
 * pulses (alpha moves) and then holds alpha 0.55; no pass/safe/approved words. Check again switches
 * it off, and the "Stayed inside" card never shows it. Every press is a real SIK trigger.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, carLocalBounds, check, fmt, forbiddenWordHits, log, obj, realTap, resetToStartLoose, shakeAndRelease,
  viewReport, visibleTexts, waitFor, waitForLensReady,
} from "./BeltPathLeafHelpers"

const MAX_MARGIN_CM = 2.5

@component
export class BeltPathC9BuckleStepScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    check(!api.isStepHighlightShown() && !obj("BuckleHighlight").isEnabledInHierarchy, "start: no buckle highlight")

    // ── Crossed: the box comes with the red card ──
    await shakeAndRelease(ix)
    check(!obj("BuckleHighlight").isEnabledInHierarchy, "answering: no buckle highlight yet")
    await realTap(ix, "CrossedLineButton")
    check(api.getCardKind() === "crossed", "red card shown (got " + api.getCardKind() + ")")
    check(api.isStepHighlightShown() && obj("BuckleHighlight").isEnabledInHierarchy, "crossed: buckle highlight enabled")

    const hb = carLocalBounds("BuckleHighlight")
    const bb = carLocalBounds("SeatBeltBuckle")
    const lb = carLocalBounds("LapBeltLatchPlate")
    log("car-local highlight " + fmt(hb.min) + ".." + fmt(hb.max) + ", buckle " + fmt(bb.min) + ".." + fmt(bb.max)
      + ", latch plate " + fmt(lb.min) + ".." + fmt(lb.max))
    const margins = [
      bb.min.x - hb.min.x, hb.max.x - bb.max.x,
      bb.min.y - hb.min.y, hb.max.y - bb.max.y,
      bb.min.z - hb.min.z, hb.max.z - bb.max.z,
    ]
    log("margins (cm) -x +x -y +y -z +z: " + margins.map((m) => m.toFixed(2)).join(", "))
    check(margins.every((m) => m >= 0), "highlight encloses the buckle on every side")
    check(margins.every((m) => m <= MAX_MARGIN_CM), "highlight within " + MAX_MARGIN_CM + " cm of the buckle on every side")
    const holdsLatch = lb.min.x >= hb.min.x && lb.max.x <= hb.max.x && lb.min.y >= hb.min.y
      && lb.max.y <= hb.max.y && lb.min.z >= hb.min.z && lb.max.z <= hb.max.z
    check(holdsLatch, "highlight also holds the latch plate")

    const v = viewReport("BuckleHighlight", 4)
    check(v.centerInView, "buckle highlight center is in the camera view")
    const hits = forbiddenWordHits(visibleTexts())
    check(hits.length === 0, "crossed: no pass/safe/approved words" + (hits.length ? " — " + hits.join(" | ") : ""))

    // ── 3 gentle pulses, then it holds 0.55 ──
    if (!api.isReduceMotion()) {
      let lo = 1
      let hi = 0
      while (!api.isStepHighlightHolding()) {
        const a: number = api.getStepHighlightAlpha()
        lo = Math.min(lo, a)
        hi = Math.max(hi, a)
        await sleep(33)
        if (!api.isStepHighlightShown()) break
      }
      log("alpha during the pulses: " + lo.toFixed(3) + ".." + hi.toFixed(3))
      check(hi - lo >= 0.2, "the highlight pulses (alpha range " + (hi - lo).toFixed(3) + ")")
    }
    await waitFor(() => api.isStepHighlightHolding(), 5000, "pulses over")
    await sleep(100)
    const a1: number = api.getStepHighlightAlpha()
    await sleep(500)
    const a2: number = api.getStepHighlightAlpha()
    check(Math.abs(a1 - 0.55) <= 0.01 && Math.abs(a2 - 0.55) <= 0.01, "holds alpha 0.55 after the pulses (" + a1.toFixed(3) + ", " + a2.toFixed(3) + ")")

    // ── Check again: gone ──
    await realTap(ix, "CheckAgainButton")
    check(api.getStateName() === "start", "Check again: start")
    check(!api.isStepHighlightShown() && !obj("BuckleHighlight").isEnabledInHierarchy, "Check again: buckle highlight disabled")

    // ── Stayed inside: never shown ──
    await shakeAndRelease(ix)
    await realTap(ix, "StayedInsideButton")
    check(api.getCardKind() === "stayed", "stayed card shown (got " + api.getCardKind() + ")")
    check(!api.isStepHighlightShown() && !obj("BuckleHighlight").isEnabledInHierarchy, "stayed: buckle highlight disabled")

    await realTap(ix, "CheckAgainButton")
    check(!obj("BuckleHighlight").isEnabledInHierarchy, "recovered: start, no highlight")
    log("C9 done")
  }
}
