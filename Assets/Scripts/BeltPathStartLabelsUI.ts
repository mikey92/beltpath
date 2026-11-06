/**
 * BeltPathStartLabelsUI — two short on-object labels at the start of each check:
 * "Belt path" beside the band and "Rear-facing car seat" on the shell. White, 1.2 cm tall,
 * shown for 2 s and then faded out, so the parent knows what they are looking at and then
 * the view is clear for the check.
 *
 * Expects (@input): two anchor SceneObjects placed on the car seat (they move with it).
 * Public API: showBriefly() (called by BeltPathMain at every start), isShowing().
 * Motion (motion spec 1): fade in ease-out 300 ms, hold 2 s, fade out ease-in 250 ms
 * (BeltPathMotion; under reduce motion the fades are instant, the 2 s hold stays).
 * Far view (setFar): when the parent stands back (BeltPathMain's distance mode) one word, "Belt path",
 * stands 12 cm above the belt path target: white, 3 cm, weight 600, turned about the vertical only to
 * face the parent (yaw billboard), steady (fade in 300 ms ease-out, out 180 ms ease-in, no blinking).
 * Must not: measure or judge anything.
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import { easeIn, easeOut, MotionMs, sec, Tween, tween } from "./BeltPathMotion"

@component
export class BeltPathStartLabelsUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathStartLabelsUI – "Belt path" / "Rear-facing car seat" for 2 s</span>')
  @ui.separator

  @input
  @hint("Anchor beside the belt path band.")
  beltPathAnchor!: SceneObject

  @input
  @hint("Anchor on the car seat shell.")
  shellAnchor!: SceneObject

  @input
  beltPathText: string = "Belt path"

  @input
  shellText: string = "Rear-facing car seat"

  @input
  @hint("Text height (cm of em).")
  @widget(new SliderWidget(0.5, 2, 0.05))
  textCm: number = 1.2

  @input
  @hint("Far view: height (cm of em) of the one word shown above the belt path.")
  @widget(new SliderWidget(1, 6, 0.1))
  farTextCm: number = 3

  @input
  @hint("Far view: how far (cm) above the belt path target the word stands.")
  @widget(new SliderWidget(0, 30, 0.5))
  farAboveCm: number = 12

  private texts: Text[] = []
  private showing: boolean = false
  private alpha: number = 0
  private tw: Tween | null = null
  private holdEv: DelayedCallbackEvent | null = null
  private farText: Text | null = null
  private farTarget: SceneObject | null = null
  private farOn: boolean = false
  private farAlpha: number = 0
  private farTw: Tween | null = null
  private cam: Transform | null = null

  onAwake(): void {
    if (!this.beltPathAnchor || !this.shellAnchor) {
      print("BeltPathStartLabelsUI: anchors not wired.")
      return
    }
    this.texts.push(this.makeText(this.beltPathAnchor, this.beltPathText))
    this.texts.push(this.makeText(this.shellAnchor, this.shellText))
    this.setAlpha(0)
    this.holdEv = this.createEvent("DelayedCallbackEvent")
    this.holdEv.bind(() => this.fadeOut())
    this.farText = this.makeText(this.beltPathAnchor, this.beltPathText)
    this.farText.getSceneObject().name = "FarBeltPathLabel"
    this.farText.size = this.farTextCm * 44
    this.farText.layoutRect = Rect.create(-30, 30, -2.5, 2.5)
    this.setFarAlpha(0)
    this.createEvent("UpdateEvent").bind(() => this.placeFar())
  }

  /**
   * Far view on/off. On: the brief labels end at once and the one word fades in 12 cm above
   * `target` (world up). Off: the word fades out (180 ms).
   */
  setFar(on: boolean, target?: SceneObject): void {
    if (target) this.farTarget = target
    if (on === this.farOn) return
    this.farOn = on
    if (on) this.endNow()
    if (this.farTw) this.farTw.cancel()
    this.farTw = on
      ? tween(this, { durMs: MotionMs.fadeIn, ease: easeOut, from: this.farAlpha, to: 1, onUpdate: (v) => this.setFarAlpha(v) })
      : tween(this, { durMs: MotionMs.hintFadeOut, ease: easeIn, from: this.farAlpha, to: 0, onUpdate: (v) => this.setFarAlpha(v) })
    this.placeFar()
  }

  isFar(): boolean { return this.farOn }

  /** True while the far-view word is drawn (alpha > 0). */
  isFarLabelShown(): boolean { return !!this.farText && this.farText.getSceneObject().enabled }

  getFarLabelWorld(): vec3 | null { return this.farText ? this.farText.getSceneObject().getTransform().getWorldPosition() : null }

  private setFarAlpha(a: number): void {
    this.farAlpha = a
    if (!this.farText) return
    this.farText.textFill.color = new vec4(1, 1, 1, a)
    this.farText.getSceneObject().enabled = a > 0
  }

  /** Keeps the word above the target and turned toward the parent about the vertical only. */
  private placeFar(): void {
    if (!this.farText || !this.farTarget || this.farAlpha <= 0) return
    const tr = this.farText.getSceneObject().getTransform()
    const p = this.farTarget.getTransform().getWorldPosition().add(new vec3(0, this.farAboveCm, 0))
    tr.setWorldPosition(p)
    if (!this.cam) {
      try { this.cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform() } catch (e) { this.cam = null }
    }
    if (!this.cam) return
    const c = this.cam.getWorldPosition()
    const yaw = Math.atan2(c.x - p.x, c.z - p.z)
    tr.setWorldRotation(quat.angleAxis(yaw, vec3.up()))
  }

  /**
   * Fade in, hold 2 s (fully visible), fade out. Restarts if called again. `delayMs` waits first
   * (after the align pinch: until the align hint has faded out, so the two never overlap).
   */
  showBriefly(delayMs: number = 0): void {
    this.showing = true
    this.fade(1, MotionMs.fadeIn, easeOut, undefined, delayMs)
    if (this.holdEv) this.holdEv.reset(sec(delayMs) + sec(MotionMs.fadeIn) + MotionMs.labelHold / 1000)
  }

  isShowing(): boolean { return this.showing }

  /** Gone at once (the parent grabbed the seat: nothing moves or fades during the shake). */
  endNow(): void {
    if (!this.showing) return
    if (this.tw) this.tw.cancel()
    this.setAlpha(0)
    this.showing = false
  }

  private fadeOut(): void {
    if (!this.showing) return
    this.fade(0, MotionMs.labelFadeOut, easeIn, () => { this.showing = false })
  }

  private fade(to: number, ms: number, ease: (t: number) => number, done?: () => void, delayMs: number = 0): void {
    if (this.tw) this.tw.cancel()
    this.tw = tween(this, { durMs: ms, delayMs, ease, from: this.alpha, to, onUpdate: (v) => this.setAlpha(v), onDone: done })
  }

  private setAlpha(a: number): void {
    this.alpha = a
    for (const t of this.texts) {
      t.textFill.color = new vec4(1, 1, 1, a)
      t.getSceneObject().enabled = a > 0
    }
  }

  private makeText(anchor: SceneObject, s: string): Text {
    const so = global.scene.createSceneObject("StartLabel")
    so.setParent(anchor)
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.size = this.textCm * 44
    ;(t as Text & { weight?: number }).weight = 600
    t.depthTest = false
    t.setRenderOrder(50)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(-12, 12, -1, 1)
    return t
  }
}
