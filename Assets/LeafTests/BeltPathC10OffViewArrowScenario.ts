/**
 * Done criterion 10 — the off-view arrow (BeltPathOffViewCueUI). showToward(camera, target) is called
 * directly for targets 2 m to the left and down-right of the eye. Checked in the same frame (the main
 * script hides the cue on its next update while the seat is in view): the arrow is on, 60 cm in front
 * of the camera and 9 cm from the view center, faces the camera, and its tip (+X) points toward the
 * target's direction in the view plane. hide() turns it off. The chime count does not change: only
 * the main script decides to chime.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { bp, camera, check, fmt, log, obj, resetToStartLoose, waitForLensReady, waitForSettled } from "./BeltPathLeafHelpers"

const TOL_CM = 0.5

@component
export class BeltPathC10OffViewArrowScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    await waitForSettled("start settled")
    check(!api.isOffViewCueVisible(), "start (seat in view): arrow hidden")
    const cue = api.offViewCue
    const chimes0: number = api.audio.getChimeCount()

    const cam = camera().getTransform()
    const eye = cam.getWorldPosition()
    const fwd = cam.forward.uniformScale(-1)
    this.checkToward(api, cue, "2 m left", eye.add(cam.right.uniformScale(-200)))
    this.checkToward(api, cue, "down-right", eye.add(cam.right.uniformScale(100)).add(cam.up.uniformScale(-100)).add(fwd.uniformScale(100)))

    check(api.audio.getChimeCount() === chimes0, "showToward/hide never chime (count " + api.audio.getChimeCount() + ", was " + chimes0 + ")")
    log("C10 done")
  }

  private checkToward(api: any, cue: any, label: string, target: vec3): void {
    const cam = camera().getTransform()
    const eye = cam.getWorldPosition()
    const fwd = cam.forward.uniformScale(-1)
    cue.showToward(cam, target)
    // Same frame from here on: no await until hide().
    check(cue.isShown() && api.isOffViewCueVisible(), label + ": arrow shown")
    check(obj("OffViewArrow").isEnabledInHierarchy, label + ": OffViewArrow enabled in the hierarchy")
    const t = cue.getSceneObject().getTransform()
    const rel = t.getWorldPosition().sub(eye)
    const ahead = rel.dot(fwd)
    const sx = rel.dot(cam.right)
    const sy = rel.dot(cam.up)
    const off = Math.sqrt(sx * sx + sy * sy)
    log(label + ": arrow at " + fmt(t.getWorldPosition()) + ", ahead " + ahead.toFixed(2) + " cm, off center " + off.toFixed(2) + " cm")
    check(Math.abs(ahead - 60) <= TOL_CM, label + ": 60 cm in front of the eyes (" + ahead.toFixed(2) + ")")
    check(Math.abs(off - 9) <= TOL_CM, label + ": 9 cm from the view center (" + off.toFixed(2) + ")")

    const to = target.sub(eye)
    let dx = to.dot(cam.right)
    let dy = to.dot(cam.up)
    const len = Math.sqrt(dx * dx + dy * dy)
    dx /= len
    dy /= len
    // The arrow sits on the target's side of the view center...
    const side = (sx * dx + sy * dy) / off
    check(side >= 0.999, label + ": arrow placed on the target's side (cos " + side.toFixed(4) + ")")
    // ...its tip (+X) points at the target's direction, and it faces the eyes.
    const rot = t.getWorldRotation()
    const tip = rot.multiplyVec3(vec3.right())
    const tipCos = tip.dot(cam.right) * dx + tip.dot(cam.up) * dy
    check(tipCos >= 0.999, label + ": tip points toward the target (cos " + tipCos.toFixed(4) + ")")
    const face = rot.multiplyVec3(vec3.forward()).dot(cam.forward)
    check(face >= 0.999, label + ": arrow faces the camera (cos " + face.toFixed(4) + ")")

    cue.hide()
    check(!cue.isShown() && !api.isOffViewCueVisible(), label + ": hide() -> not shown")
    check(!obj("OffViewArrow").isEnabledInHierarchy, label + ": OffViewArrow off after hide()")
  }
}
