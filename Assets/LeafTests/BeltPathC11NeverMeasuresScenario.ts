/**
 * Done criterion 11 — the Lens never measures. While the parent drags the seat edge past the red
 * plate nothing reacts: the state stays "grabbing", no answer buttons and no card, the red plate's
 * colors do not change, the set of visible texts does not change, and no sound plays (chime count
 * unchanged, no AudioComponent playing). Only the parent's own eyes judge the pin against the plate.
 *
 * Scripted drag (BeltPathMain.debugBeginGrab / debugDragTo / debugRelease), stepping the seat from
 * 0 to 4 cm (past the 2.5 cm plate) one step per frame, then holding at 4 cm; every frame is checked.
 * The start labels are waited out first so the visible-text set is the same before and during the drag.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import {
  bp, check, log, obj, realTap, resetToStartLoose, visibleTexts, waitFor, waitForLensReady, waitForSettled,
} from "./BeltPathLeafHelpers"

const RED_PARTS = ["RulerRedLine", "RulerRedLeader"]

function colorKey(c: vec4): string {
  return [c.x, c.y, c.z, c.w].map((v) => v.toFixed(4)).join(",")
}

/** Base colors of every material on the red plate and its leader, plus the plate label's text color. */
function redPlateColors(api: any): string {
  const out: string[] = []
  for (const name of RED_PARTS) {
    for (const r of obj(name).getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]) {
      out.push(name + "=" + colorKey(r.mainMaterial.mainPass.baseColor))
    }
  }
  const lbl = api.ruler.redLabel as Text
  if (lbl) out.push("label=" + colorKey(lbl.textFill.color))
  return out.join(" ")
}

function collectAudio(so: SceneObject, out: AudioComponent[]): void {
  for (const a of so.getComponents("Component.AudioComponent") as AudioComponent[]) out.push(a)
  for (let i = 0; i < so.getChildrenCount(); i++) collectAudio(so.getChild(i), out)
}

function allAudio(): AudioComponent[] {
  const out: AudioComponent[] = []
  for (let i = 0; i < global.scene.getRootObjectsCount(); i++) collectAudio(global.scene.getRootObject(i), out)
  return out
}

function playingCount(audios: AudioComponent[]): number {
  let n = 0
  for (const a of audios) if (a.isPlaying()) n++
  return n
}

function textKey(): string { return JSON.stringify(visibleTexts().slice().sort()) }

@component
export class BeltPathC11NeverMeasuresScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    await waitFor(() => !api.startLabels.isShowing(), 5000, "start labels finished")
    await waitForSettled("start settled")
    const audios = allAudio()
    check(audios.length >= 2, "found the Lens's AudioComponents (" + audios.length + ")")
    await waitFor(() => playingCount(audios) === 0, 3000, "no sound playing before the drag")

    const redLine = api.getRedLineCm()
    const colors0 = redPlateColors(api)
    const texts0 = textKey()
    const chimes0 = api.audio.getChimeCount()
    const ruler0 = api.getRulerOpacity()
    const band0 = api.overlay.getBandOpacity()
    log("before: red plate " + colors0 + "; texts " + texts0 + "; chimes " + chimes0)

    api.debugBeginGrab()
    let frames = 0
    let crossedFrames = 0
    let peak = 0
    const checkFrame = (where: string): void => {
      frames++
      const off = api.getSeatOffsetCm()
      peak = Math.max(peak, off)
      if (off > redLine) crossedFrames++
      const tag = where + " (offset " + off.toFixed(2) + " cm)"
      if (api.getStateName() !== "grabbing") check(false, tag + ": state stays grabbing (got " + api.getStateName() + ")")
      if (api.areAnswerButtonsVisible() || api.isResultCardVisible()
          || obj("AnswerButtons").isEnabledInHierarchy || obj("ResultCard").isEnabledInHierarchy) {
        check(false, tag + ": no buttons, no card")
      }
      const c = redPlateColors(api)
      if (c !== colors0) check(false, tag + ": red plate colors unchanged (" + colors0 + " -> " + c + ")")
      const t = textKey()
      if (t !== texts0) check(false, tag + ": visible texts unchanged (" + texts0 + " -> " + t + ")")
      if (api.audio.getChimeCount() !== chimes0) check(false, tag + ": no chime (count " + api.audio.getChimeCount() + ")")
      if (playingCount(audios) !== 0) check(false, tag + ": no sound playing (" + playingCount(audios) + ")")
      if (Math.abs(api.getRulerOpacity() - ruler0) > 1e-4 || Math.abs(api.overlay.getBandOpacity() - band0) > 1e-4) {
        check(false, tag + ": ruler/band opacity unchanged")
      }
    }
    try {
      for (let cm = 0; cm <= 4.0001; cm += 0.25) {
        api.debugDragTo(cm)
        await sleep(33)
        checkFrame("step to " + cm.toFixed(2))
      }
      const tHold = getTime()
      while (getTime() - tHold < 0.6) {
        api.debugDragTo(4)
        await sleep(33)
        checkFrame("hold at 4")
      }
    } finally {
      api.debugRelease()
    }
    log("checked " + frames + " frames, " + crossedFrames + " past the red plate, peak " + peak.toFixed(2) + " cm")
    check(peak > redLine && peak >= 3.9, "the seat edge went past the red plate to the 4 cm cap (peak " + peak.toFixed(2) + ")")
    check(crossedFrames >= 5, "several frames past the plate were checked (" + crossedFrames + ")")
    check(frames > 0, "while grabbing: state grabbing, no buttons/card, red plate colors, texts, sound all unchanged ("
      + frames + " frames)")

    // Release: only now do the parent's two answer buttons appear (the parent answers, not the Lens).
    await waitFor(() => api.getStateName() === "answering", 2000, "answering after the release")
    await waitForSettled("seat spring-back settled")
    check(redPlateColors(api) === colors0, "after release: red plate colors unchanged")
    check(api.audio.getChimeCount() === chimes0, "after release: no chime")
    await realTap(ix, "StayedInsideButton")
    await realTap(ix, "CheckAgainButton")
    check(api.getStateName() === "start", "recovered: start")
    log("C11 done")
  }
}
