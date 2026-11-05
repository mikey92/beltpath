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
 * Must not: measure or judge anything.
 */
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

  private texts: Text[] = []
  private showing: boolean = false
  private alpha: number = 0
  private tw: Tween | null = null
  private holdEv: DelayedCallbackEvent | null = null

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
