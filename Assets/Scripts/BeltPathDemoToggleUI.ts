/**
 * BeltPathDemoToggleUI — the small "DEMO: Loose / Tight" toggle on the left door armrest.
 *
 * DEMO ONLY: not part of the real-glasses design. It sets how far the virtual seat can
 * move (a demo setting, not a judgment by the Lens). Placed on the armrest so it stays
 * out of the main view while the parent looks at the belt path.
 *
 * Owns: a Canvas, one UIKit Button (9 x 4 cm, owner request 2026-11-05) whose two-line label
 * (1.0 cm text) shows the current mode; it scales to 0.96 on pinch-down (motion spec 5).
 * Public API: setMode(mode), onToggle (the main script flips the mode and calls setMode).
 * Must not: own the mode — the main script's state does.
 */
import { Button } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { DemoMode } from "./BeltPathSceneContracts"
import { styleFrostedButton } from "./BeltPathResultCardUI"
import { addPressFeedback } from "./BeltPathMotion"

@component
export class BeltPathDemoToggleUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathDemoToggleUI – demo-only Loose / Tight switch</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Top line of the toggle.")
  titleLabel: string = "DEMO: Loose / Tight"

  @input("vec2", "{9,4}")
  @hint("Toggle size (cm): 9 x 4.")
  toggleSizeCm: vec2 = new vec2(9, 4)

  @input
  @hint("Label text height (cm of em) for both lines.")
  @widget(new SliderWidget(0.5, 1.5, 0.05))
  textCm: number = 1.0

  @input("vec4", "{1,0.85,0.4,1}")
  @widget(new ColorWidget())
  @hint("Border color of the toggle (amber = demo only).")
  modeColor: vec4 = new vec4(1, 0.85, 0.4, 1)
  @ui.group_end

  private _onToggle = new Event<void>()
  get onToggle(): PublicApi<void> { return this._onToggle.publicApi() }

  private modeText!: Text
  private mode: DemoMode = "Loose"

  private get widthCm(): number { return this.toggleSizeCm.x }
  private get heightCm(): number { return this.toggleSizeCm.y }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const so = global.scene.createSceneObject("DemoModeToggle")
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(new vec3(0, 0, 0.3))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(this.widthCm, this.heightCm, 1)
    btn.initialize()
    btn.size = new vec3(this.widthCm, this.heightCm, 1)
    styleFrostedButton(btn, this.modeColor, 0.3)
    // The UI Kit theme writes its dark fill whenever its visual finishes initializing, which can be
    // a few frames after start. Restyle every frame for the first second so the frosted look wins.
    let frames = 0
    const keep = this.createEvent("UpdateEvent")
    keep.bind(() => {
      styleFrostedButton(btn, this.modeColor, 0.3)
      if (++frames >= 60) keep.enabled = false
    })
    btn.onTriggerUp.add(() => this._onToggle.invoke())
    addPressFeedback(this, btn, so)

    const size = this.textCm * 44
    this.line(so, this.titleLabel, size, this.heightCm * 0.22, new vec4(1, 1, 1, 1))
    this.modeText = this.line(so, "", size, -this.heightCm * 0.22, new vec4(1, 1, 1, 1))
    this.setMode(this.mode)
  }

  setMode(mode: DemoMode): void {
    this.mode = mode
    if (this.modeText) this.modeText.text = "Now: " + mode
  }

  getMode(): DemoMode { return this.mode }

  private line(parent: SceneObject, s: string, size: number, y: number, color: vec4): Text {
    const so = global.scene.createSceneObject("DemoToggleLabel")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, y, 0.08))
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.size = size
    ;(t as Text & { weight?: number }).weight = 600
    t.depthTest = true
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    const w = this.widthCm - 0.4
    t.layoutRect = Rect.create(-w / 2, w / 2, -this.heightCm * 0.22, this.heightCm * 0.22)
    return t
  }
}
