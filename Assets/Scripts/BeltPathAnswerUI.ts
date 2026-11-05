/**
 * BeltPathAnswerUI — the two big answer buttons shown after the seat is released.
 *
 * Owns: a Canvas + a row of two UIKit Buttons (7 x 4 cm, 2 cm gap, before the root's 1.25x scale), left
 * "Crossed the line" with a red border, right "Stayed inside" with a green border,
 * white weight-600 two-line labels with a 1.2 cm em height, light frosted fill like the
 * cards (styleFrostedButton). The root starts hidden. The two buttons are placed by hand (no
 * FlexLayout) so each can move on its own:
 * Motion (motion spec 3, 5): each button rises 2 cm from below its spot while fading in (ease-out
 * 250 ms), left first, right 60 ms later; they leave by fading down 1 cm (ease-in 180 ms); a button
 * scales to 0.96 on pinch-down and back (ease-out 120 ms).
 *
 * Public API (main script / tests): show(), hide(), isShown(), onCrossed, onStayed.
 * Must not: hold domain state or decide anything — the parent judges, the main script
 * reacts to the events.
 */
import { Button } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import { RoundedRectangleVisual } from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { drawOverScene, styleFrostedButton } from "./BeltPathResultCardUI"
import { addPressFeedback, easeIn, easeOut, MotionCm, MotionMs, PressFeedback, Tween, tween } from "./BeltPathMotion"

type AnswerButton = { btn: Button, border: vec4, so: SceneObject, label: Text, homeX: number, alpha: number, rise: number, tw: Tween | null, press: PressFeedback }

const BUTTON_LABEL_Z = 0.08 // label sits just in front of the button face

@component
export class BeltPathAnswerUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathAnswerUI – "Crossed the line" / "Stayed inside" buttons</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Left button label (wraps onto two lines inside the button).")
  crossedLabel: string = "Crossed the line"

  @input
  @hint("Right button label (wraps onto two lines inside the button).")
  stayedLabel: string = "Stayed inside"

  @input
  @hint("Button width (cm).")
  @widget(new SliderWidget(4, 12, 0.5))
  buttonWidthCm: number = 7

  @input
  @hint("Button height (cm).")
  @widget(new SliderWidget(2, 8, 0.5))
  buttonHeightCm: number = 4

  @input
  @hint("Gap between the two buttons (cm).")
  @widget(new SliderWidget(0, 6, 0.25))
  gapCm: number = 2

  @input
  @hint("Label text size (Text.size; 53 = 1.2 cm em height).")
  @widget(new SliderWidget(20, 80, 1))
  labelSize: number = 53

  @input("vec4", "{1,0.3,0.3,1}")
  @widget(new ColorWidget())
  @hint("Border color of the \"Crossed the line\" button.")
  crossedBorderColor: vec4 = new vec4(1, 0.3, 0.3, 1)

  @input("vec4", "{0.35,0.95,0.5,1}")
  @widget(new ColorWidget())
  @hint("Border color of the \"Stayed inside\" button.")
  stayedBorderColor: vec4 = new vec4(0.35, 0.95, 0.5, 1)

  @input
  @hint("Border thickness (cm).")
  @widget(new SliderWidget(0.05, 0.6, 0.05))
  borderCm: number = 0.3
  @ui.group_end

  private _onCrossed = new Event<void>()
  private _onStayed = new Event<void>()
  get onCrossed(): PublicApi<void> { return this._onCrossed.publicApi() }
  get onStayed(): PublicApi<void> { return this._onStayed.publicApi() }

  private shown: boolean = false
  /** One delayed callback, created once and re-armed with reset() on every show. */
  private restyleEv!: DelayedCallbackEvent

  onAwake(): void {
    this.restyleEv = this.createEvent("DelayedCallbackEvent")
    this.restyleEv.bind(() => {
      if (!this.sceneObject.enabled) return
      this.restyle()
      drawOverScene(this.sceneObject)
      for (const b of this.buttons) this.pose(b, b.alpha, b.rise)
    })
    this.sceneObject.createComponent("Component.Canvas")
    const row = global.scene.createSceneObject("AnswerRow")
    row.setParent(this.sceneObject)
    row.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const dx = (this.buttonWidthCm + this.gapCm) / 2
    this.addButton(row, "CrossedLineButton", this.crossedLabel, this.crossedBorderColor, -dx,
      () => this._onCrossed.invoke())
    this.addButton(row, "StayedInsideButton", this.stayedLabel, this.stayedBorderColor, dx,
      () => this._onStayed.invoke())
    this.sceneObject.enabled = false
  }

  show(): void {
    this.shown = true
    const fresh = !this.sceneObject.enabled
    this.sceneObject.enabled = true
    // Over the car seat (see drawOverScene); again next frame after UIKit builds its visuals.
    // The UI Kit theme writes its dark fill when the visual initializes, so the frosted
    // style is (re)applied here too.
    this.restyle()
    drawOverScene(this.sceneObject)
    this.restyleEv.reset(0)
    // Left first, right 60 ms later; each rises 2 cm while fading in.
    this.buttons.forEach((b, i) => {
      if (fresh) this.pose(b, 0, -MotionCm.slideInRise)
      this.animate(b, 1, 0, MotionMs.slideIn, easeOut, i * MotionMs.buttonStagger)
    })
  }

  private buttons: AnswerButton[] = []

  private restyle(): void {
    for (const b of this.buttons) styleFrostedButton(b.btn, b.border, this.borderCm)
  }

  /** Counts as hidden at once; the buttons fade down 1 cm (ease-in 180 ms), then switch off. */
  hide(immediate: boolean = false): void {
    const wasShown = this.shown
    this.shown = false
    for (const b of this.buttons) b.press.reset()
    if (immediate || !wasShown || !this.sceneObject.enabled) {
      for (const b of this.buttons) if (b.tw) b.tw.cancel()
      this.sceneObject.enabled = false
      return
    }
    let left = this.buttons.length
    for (const b of this.buttons) {
      this.animate(b, 0, -MotionCm.slideOutDrop, MotionMs.slideOut, easeIn, 0, () => {
        if (--left === 0 && !this.shown) this.sceneObject.enabled = false
      })
    }
  }

  isShown(): boolean { return this.shown }

  private animate(b: AnswerButton, toAlpha: number, toRise: number, ms: number, ease: (t: number) => number,
      delayMs: number, done?: () => void): void {
    if (b.tw) b.tw.cancel()
    const a0 = b.alpha
    const r0 = b.rise
    b.tw = tween(this, {
      durMs: ms, delayMs, ease,
      onUpdate: (k) => this.pose(b, a0 + (toAlpha - a0) * k, r0 + (toRise - r0) * k),
      onDone: done,
    })
  }

  private pose(b: AnswerButton, alpha: number, rise: number): void {
    b.alpha = alpha
    b.rise = rise
    b.so.getTransform().setLocalPosition(new vec3(b.homeX, rise, 0))
    const vis = b.btn.visual as RoundedRectangleVisual
    if (vis) vis.opacity = alpha
    b.label.textFill.color = new vec4(1, 1, 1, alpha)
  }

  private addButton(parent: SceneObject, name: string, label: string, border: vec4, x: number,
      onPress: () => void): void {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(x, 0, 0))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(this.buttonWidthCm, this.buttonHeightCm, 1)
    btn.initialize()
    btn.size = new vec3(this.buttonWidthCm, this.buttonHeightCm, 1)
    styleFrostedButton(btn, border, this.borderCm)
    btn.onTriggerUp.add(() => {
      if (this.shown) onPress()
    })
    const press = addPressFeedback(this, btn, so)

    const lab = global.scene.createSceneObject(name + "Label")
    lab.setParent(so)
    lab.getTransform().setLocalPosition(new vec3(0, 0, BUTTON_LABEL_Z))
    const t = lab.createComponent("Component.Text") as Text
    t.text = label
    t.size = this.labelSize
    ;(t as Text & { weight?: number }).weight = 600
    t.depthTest = true
    t.textFill.color = new vec4(1, 1, 1, 1)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Wrap
    t.verticalOverflow = VerticalOverflow.Overflow
    const w = this.buttonWidthCm - 0.8
    t.layoutRect = Rect.create(-w / 2, w / 2, -this.buttonHeightCm / 2, this.buttonHeightCm / 2)
    this.buttons.push({ btn, border, so, label: t, homeX: x, alpha: 1, rise: 0, tw: null, press })
  }
}
