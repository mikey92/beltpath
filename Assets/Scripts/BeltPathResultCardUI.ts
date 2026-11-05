/**
 * BeltPathResultCardUI — the result card shown in the same spot as the answer buttons.
 *
 * Owns: a Canvas, a UIKit RoundedRectangle card surface (used instead of BackPlate
 * because the brief needs a colored border: red for "Crossed the line", white for
 * "Stayed inside" — BackPlate exposes no border), a FlexLayout column with the body
 * text, an optional footnote line and a UIKit "Check again" Button. All strings are @inputs
 * that default to the brief text (see "Changes after review"). White text only, no black.
 * The Lens shows no raw URL; the locator link lives in the brief's Sources.
 *
 * Motion (motion spec 3, 5): the card rises 2 cm from below its spot while fading in (ease-out
 * 250 ms) and leaves by fading down 1 cm (ease-in 180 ms); "Check again" scales to 0.96 on
 * pinch-down. Fades need the UI Kit rectangles in blended (Normal) mode.
 *
 * Public API: showCrossed(), showStayed(), hide(), isShown(), getKind(),
 * getVisibleText() (every visible string, joined by newlines), onCheckAgain.
 * Must not: decide which card to show — the main script calls showCrossed/showStayed
 * from the parent's own answer.
 */
import { Button } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import { RoundedRectangleVisual } from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import { RoundedRectangle, RoundedRectBlendMode } from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import { FlexLayout } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import { FlexItem } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import { FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify } from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { CardKind } from "./BeltPathSceneContracts"
import { addPressFeedback, easeIn, easeOut, MotionCm, MotionMs, PressFeedback, Tween, tween } from "./BeltPathMotion"

const BUTTON_LABEL_Z = 0.08
/** Text.size units per cm of em height. */
const SIZE_PER_CM = 44

/** "a|b|c" -> "a\nb\nc" (string @input defaults cannot carry a newline escape). */
function lines(s: string): string {
  return s.split("|").map((x) => x.trim()).join("\n")
}

/**
 * Draws a UI subtree over the car seat: no depth test, drawn after the scene in hierarchy
 * order (parents before children, mesh before text). On glasses the real seat never hides
 * the Lens UI; in the preview the virtual seat's backrest would, so the cards and buttons
 * must not depth-test against it. Re-run after UIKit (re)initializes its visuals.
 */
export function drawOverScene(root: SceneObject, baseOrder: number = 200): void {
  let order = baseOrder
  const visit = (so: SceneObject): void => {
    // A Canvas re-sorts its children by hierarchy and overrides the orders set here;
    // this function sets the same hierarchy order itself, but above the rest of the scene.
    for (const cv of so.getComponents("Component.Canvas") as Canvas[]) cv.enabled = false
    for (const c of so.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]) {
      if (c.mainMaterial) c.mainPass.depthTest = false
      c.setRenderOrder(order++)
    }
    for (const t of so.getComponents("Component.Text") as Text[]) {
      t.depthTest = false
      t.setRenderOrder(order++)
    }
    for (let i = 0; i < so.getChildrenCount(); i++) visit(so.getChild(i))
  }
  visit(root)
}

/**
 * Frosted fill shared by the cards and every button (never the dark UI Kit default). Review 2:
 * (0.35, 0.42, 0.55) gives ~5.4:1 with white text; hover ~5.0:1 and press ~4.7:1 stay >= 4.5:1.
 */
export const FROSTED_FILL = new vec4(0.35, 0.42, 0.55, 0.85)
const FROSTED_HOVER = new vec4(0.37, 0.44, 0.57, 0.9)
const FROSTED_PRESS = new vec4(0.39, 0.46, 0.59, 0.95)

function lighten(c: vec4, k: number): vec4 {
  return new vec4(c.x + (1 - c.x) * k, c.y + (1 - c.y) * k, c.z + (1 - c.z) * k, 1)
}

/**
 * Restyles a UIKit Button: light frosted fill (like the cards) with a colored border.
 * Hover brightens the fill and thickens the border; press brightens both further, so the
 * aimed-at and pressed states stay visible on an additive display. Call after initialize().
 */
export function styleFrostedButton(btn: Button, border: vec4, borderCm: number = 0.3): void {
  const vis = btn.visual as RoundedRectangleVisual
  if (!vis) return
  // Blended like the card surface (fill at 85%), which also lets the button fade in and out.
  vis.transparencyEnabled = true
  vis.shouldColorChange = true
  vis.defaultBaseType = "Color"
  vis.hoveredBaseType = "Color"
  vis.triggeredBaseType = "Color"
  vis.inactiveBaseType = "Color"
  vis.baseDefaultColor = FROSTED_FILL
  vis.baseHoveredColor = FROSTED_HOVER
  vis.baseTriggeredColor = FROSTED_PRESS
  vis.baseInactiveColor = FROSTED_FILL
  vis.defaultHasBorder = true
  vis.hoveredHasBorder = true
  vis.triggeredHasBorder = true
  vis.defaultBorderType = "Color"
  vis.hoveredBorderType = "Color"
  vis.triggeredBorderType = "Color"
  vis.defaultBorderSize = borderCm
  vis.hoveredBorderSize = borderCm * 1.6
  vis.triggeredBorderSize = borderCm * 1.8
  vis.borderDefaultColor = border
  vis.borderHoveredColor = lighten(border, 0.35)
  vis.borderTriggeredColor = lighten(border, 0.7)
  // UI Kit only tweens toward a state color on a state change; when the default color itself
  // changes while idle the tween has zero length and the old theme fill stays. Paint it now.
  const st = (vis as unknown as { stateName?: string }).stateName
  const rr = (vis as unknown as { roundedRectangle?: RoundedRectangle }).roundedRectangle
  if (rr) rr.blendMode = RoundedRectBlendMode.Normal
  if (rr && (st === undefined || st === "default")) {
    rr.gradient = false
    rr.backgroundColor = FROSTED_FILL
    rr.border = true
    rr.borderType = "Color"
    rr.borderSize = borderCm
    rr.borderColor = border
  }
}

@component
export class BeltPathResultCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathResultCardUI – red tightening card / inspection-station card</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Card text (brief, review 2)</span>')
  @ui.group_start("Text")
  @input
  @widget(new TextAreaWidget())
  @hint("Red card: the three tightening steps (NHTSA install order), separated by | (one line each).")
  crossedBody: string = "1  Lock the belt|2  Press the seat down hard|3  Pull the belt tight"

  @input
  @hint("Red card footnote (0.7 cm).")
  crossedFootnote: string = "Lock = vehicle belt lock or the seat's lock-off"

  @input
  @widget(new TextAreaWidget())
  @hint("White card body lines, separated by | (one line each).")
  stayedBody: string = "No problem seen at the belt path.|One check, not a full inspection."

  @input
  @hint("White card footnote (0.7 cm).")
  stayedFootnote: string = "Free check: nhtsa.gov > Car Seats > Inspection, or Safe Kids Worldwide"

  @input
  @hint("Label of the restart button.")
  checkAgainLabel: string = "Check again"
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Card size (cm) before the root's 1.25x scale (review 2: both cards 16 x 8).")
  cardSizeCm: vec2 = new vec2(16, 8)

  @input
  @hint("Body text height (cm of em) for both cards.")
  @widget(new SliderWidget(0.4, 1.5, 0.05))
  bodyTextCm: number = 0.8

  @input
  @hint("Footnote height (cm of em, >= 0.7).")
  @widget(new SliderWidget(0.4, 1.5, 0.05))
  footnoteTextCm: number = 0.7

  @input
  @hint("Text weight (600 = semibold).")
  @widget(new SliderWidget(300, 900, 100))
  textWeight: number = 600

  @input("vec4", "{1,0.3,0.3,1}")
  @widget(new ColorWidget())
  @hint("Border color of the \"Crossed the line\" card.")
  crossedBorderColor: vec4 = new vec4(1, 0.3, 0.3, 1)

  @input("vec4", "{1,1,1,1}")
  @widget(new ColorWidget())
  @hint("Border color of the \"Stayed inside\" card (white, not green).")
  stayedBorderColor: vec4 = new vec4(1, 1, 1, 1)

  @input("vec4", "{0.35,0.42,0.55,0.85}")
  @widget(new ColorWidget())
  @hint("Frosted card fill (review 2 contrast: ~5.4:1 with white text; never black).")
  cardFill: vec4 = new vec4(0.35, 0.42, 0.55, 0.85)

  @input
  @hint("Card border thickness (cm).")
  @widget(new SliderWidget(0.05, 0.8, 0.05))
  borderCm: number = 0.3
  @ui.group_end

  private _onCheckAgain = new Event<void>()
  get onCheckAgain(): PublicApi<void> { return this._onCheckAgain.publicApi() }

  private surface!: RoundedRectangle
  private col!: FlexLayout
  private bodyText!: Text
  private bodyItem!: FlexItem
  private noteText!: Text
  private noteItem!: FlexItem
  private kind: CardKind = "none"
  private checkAgainBtn!: Button
  private checkAgainText!: Text
  private blockerShape!: BoxShape
  private home: vec3 = vec3.zero()
  private alpha: number = 0
  private rise: number = 0
  private tw: Tween | null = null
  private checkPress: PressFeedback | null = null
  /** One delayed callback, created once and re-armed with reset() on every show. */
  private onTopEv!: DelayedCallbackEvent
  private static readonly PAD_V = 0.35
  private static readonly GAP = 0.2
  private static readonly CHECK_W = 9
  private static readonly CHECK_H = 2.4

  onAwake(): void {
    this.onTopEv = this.createEvent("DelayedCallbackEvent")
    this.onTopEv.bind(() => {
      if (!this.sceneObject.enabled) return
      // The UI Kit theme writes its dark fill when the visual initializes; restyle after it.
      if (this.checkAgainBtn) styleFrostedButton(this.checkAgainBtn, this.surface.borderColor, this.borderCm)
      drawOverScene(this.sceneObject)
      this.pose(this.alpha, this.rise)
    })
    this.sceneObject.createComponent("Component.Canvas")
    this.home = this.getTransform().getLocalPosition()
    const W = this.cardSizeCm.x
    const H = this.cardSizeCm.y

    // Surface first so the hierarchy sort paints it behind the content.
    const surfaceObj = global.scene.createSceneObject("ResultCardSurface")
    surfaceObj.setParent(this.sceneObject)
    this.surface = surfaceObj.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    this.surface.size = new vec2(W, H)
    this.surface.cornerRadius = 0.8
    this.surface.backgroundColor = this.cardFill
    this.surface.border = true
    this.surface.borderSize = this.borderCm
    this.surface.borderColor = this.crossedBorderColor
    this.surface.initialize()
    this.surface.blendMode = RoundedRectBlendMode.Normal

    // The card body catches pinches that miss "Check again", so they never fall through to the
    // car seat's grab box behind the card (that would start a shake and dismiss the card).
    const blocker = global.scene.createSceneObject("ResultCardBlocker")
    blocker.setParent(this.sceneObject)
    blocker.getTransform().setLocalPosition(new vec3(0, 0, -0.1))
    const col = blocker.createComponent("Physics.ColliderComponent") as ColliderComponent
    this.blockerShape = Shape.createBoxShape()
    this.blockerShape.size = new vec3(W, H, 0.2)
    col.shape = this.blockerShape
    col.fitVisual = false
    blocker.createComponent(Interactable.getTypeName())

    const content = global.scene.createSceneObject("ResultCardContent")
    content.setParent(this.sceneObject)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.col = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    this.col.direction = FlexDirection.Column
    this.col.width = W
    this.col.height = H
    this.col.paddingTop = BeltPathResultCardUI.PAD_V
    this.col.paddingBottom = BeltPathResultCardUI.PAD_V
    this.col.paddingLeft = 0.9
    this.col.paddingRight = 0.9
    this.col.rowGap = BeltPathResultCardUI.GAP
    this.col.alignItems = FlexAlign.Stretch
    this.col.justifyContent = FlexJustify.Start

    const body = this.addRow(content, "ResultCardBody", 3)
    this.bodyText = body.text
    this.bodyItem = body.item
    const note = this.addRow(content, "ResultCardFootnote", 0.01)
    this.noteText = note.text
    this.noteItem = note.item
    this.addCheckAgain(content)
    // FlexLayout auto-discovers FlexItem children on start (addItems is only for post-init additions)

    this.sceneObject.enabled = false
  }

  showCrossed(): void {
    this.kind = "crossed"
    this.fill(this.crossedBorderColor, this.crossedBody, this.crossedFootnote)
    this.appear()
  }

  showStayed(): void {
    this.kind = "stayed"
    this.fill(this.stayedBorderColor, this.stayedBody, this.stayedFootnote)
    this.appear()
  }

  /** Leaves by fading down 1 cm (ease-in 180 ms); counts as hidden at once. */
  hide(immediate: boolean = false): void {
    const wasShown = this.kind !== "none"
    this.kind = "none"
    if (this.checkPress) this.checkPress.reset()
    if (immediate || !wasShown || !this.sceneObject.enabled) {
      if (this.tw) this.tw.cancel()
      this.sceneObject.enabled = false
      return
    }
    this.animate(0, -MotionCm.slideOutDrop, MotionMs.slideOut, easeIn, () => {
      if (this.kind === "none") this.sceneObject.enabled = false
    })
  }

  /** Body + footnote layout: the footnote wraps to as many 0.7 cm lines as it needs. */
  private fill(border: vec4, body: string, note: string): void {
    const H = this.cardSizeCm.y
    const innerW = this.cardSizeCm.x - 1.8
    const noteLines = Math.max(1, Math.ceil(note.length * this.footnoteTextCm * 0.5 / innerW))
    const noteH = noteLines * this.footnoteTextCm * 1.25
    this.layout(border)
    this.bodyText.size = this.bodyTextCm * SIZE_PER_CM
    this.bodyText.text = lines(body)
    this.bodyItem.overrideHeight = H - 2 * BeltPathResultCardUI.PAD_V - 2 * BeltPathResultCardUI.GAP
      - BeltPathResultCardUI.CHECK_H - noteH
    this.noteText.size = this.footnoteTextCm * SIZE_PER_CM
    this.noteText.text = note
    this.noteItem.overrideHeight = noteH
  }

  /** Rises 2 cm from below its spot while fading in (ease-out 250 ms). */
  private appear(): void {
    const fresh = !this.sceneObject.enabled
    this.sceneObject.enabled = true
    if (fresh) { this.alpha = 0; this.rise = -MotionCm.slideInRise }
    this.drawOnTop()
    this.animate(1, 0, MotionMs.slideIn, easeOut)
  }

  private animate(toAlpha: number, toRise: number, ms: number, ease: (t: number) => number, done?: () => void): void {
    if (this.tw) this.tw.cancel()
    const a0 = this.alpha
    const r0 = this.rise
    this.tw = tween(this, {
      durMs: ms, ease,
      onUpdate: (k) => this.pose(a0 + (toAlpha - a0) * k, r0 + (toRise - r0) * k),
      onDone: done,
    })
  }

  /** Applies opacity (surface, button, every text) and the vertical offset from the card's spot. */
  private pose(alpha: number, rise: number): void {
    this.alpha = alpha
    this.rise = rise
    const h = this.home
    this.getTransform().setLocalPosition(new vec3(h.x, h.y + rise, h.z))
    if (this.surface) this.surface.opacity = alpha
    const vis = this.checkAgainBtn ? (this.checkAgainBtn.visual as RoundedRectangleVisual) : null
    if (vis) vis.opacity = alpha
    for (const t of [this.bodyText, this.noteText, this.checkAgainText]) {
      if (t) t.textFill.color = new vec4(1, 1, 1, alpha)
    }
  }

  /** Now and again next frame, after UIKit has (re)built its visuals on enable. */
  private drawOnTop(): void {
    drawOverScene(this.sceneObject)
    this.onTopEv.reset(0)
  }

  isShown(): boolean { return this.kind !== "none" }
  getKind(): CardKind { return this.kind }

  /** Every visible string on the card, joined by newlines ("" when hidden). */
  getVisibleText(): string {
    if (this.kind === "none") return ""
    return [this.bodyText.text, this.noteText.text, this.checkAgainLabel]
      .filter((s) => s.length > 0).join("\n")
  }

  private layout(border: vec4): void {
    this.surface.borderColor = border
    // "Check again" wears the card's own border color (red card -> red, white card -> white).
    if (this.checkAgainBtn) styleFrostedButton(this.checkAgainBtn, border, this.borderCm)
  }

  private addRow(parent: SceneObject, name: string, heightCm: number): { text: Text, item: FlexItem } {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, 0, 0.02))
    const t = so.createComponent("Component.Text") as Text
    t.text = ""
    t.size = 0.8 * SIZE_PER_CM
    ;(t as Text & { weight?: number }).weight = this.textWeight
    t.depthTest = true
    t.textFill.color = new vec4(1, 1, 1, 1)
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Top
    t.horizontalOverflow = HorizontalOverflow.Wrap
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-0.5, 0.5, -0.5, 0.5)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.alignSelf = FlexAlignSelf.Stretch
    item.overrideHeight = heightCm
    return { text: t, item }
  }

  private addCheckAgain(parent: SceneObject): FlexItem {
    const w = BeltPathResultCardUI.CHECK_W
    const h = BeltPathResultCardUI.CHECK_H
    const so = global.scene.createSceneObject("CheckAgainButton")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, 0, 0.02))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.initialize()
    btn.size = new vec3(w, h, 1)
    styleFrostedButton(btn, this.crossedBorderColor, this.borderCm)
    this.checkAgainBtn = btn
    btn.onTriggerUp.add(() => {
      if (this.kind !== "none") this._onCheckAgain.invoke()
    })
    this.checkPress = addPressFeedback(this, btn, so)
    const lab = global.scene.createSceneObject("CheckAgainLabel")
    lab.setParent(so)
    lab.getTransform().setLocalPosition(new vec3(0, 0, BUTTON_LABEL_Z))
    const t = lab.createComponent("Component.Text") as Text
    this.checkAgainText = t
    t.text = this.checkAgainLabel
    t.size = 40
    ;(t as Text & { weight?: number }).weight = 600
    t.depthTest = true
    t.textFill.color = new vec4(1, 1, 1, 1)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(-(w - 0.5) / 2, (w - 0.5) / 2, -h / 2, h / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.alignSelf = FlexAlignSelf.Center
    item.overrideWidth = w
    item.overrideHeight = h
    return item
  }
}
