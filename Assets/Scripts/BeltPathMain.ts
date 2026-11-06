/**
 * BeltPathMain — orchestrates the 1-inch belt path check.
 *
 * Flow (owned by BeltPathState):
 *   align     → once, before the first shake: the band shows with the hint "Pinch the seat edge
 *               at the belt path"; ruler, ghost and edge pin are hidden and the seat cannot be
 *               grabbed. The pinch moves the ruler's 0 and the ghost's edge to the seat edge
 *               (snapped to the edge pin, at most 0.5 cm; the Lens still never measures). Then the ruler fades in and the start labels show:
 *               "Belt path" and, on the seat's side, "Grab the seat here and shake" for 3 s (gone at once on a grab;
 *               never in the far view).
 *   start     → band, ghost, ruler strip, numbers, red plate, edge pin come in one after another
 *               (stagger: 80 ms apart, 220 ms ease-out each; band/ghost/pin also rise 0.5 cm, the
 *               ruler parts only fade). No cards. If the belt path is out of view, a chime plays
 *               and an edge arrow points toward it.
 *
 * View distance (start only): d = device camera to BeltPathTarget. far when d >= 95 cm for 0.3 s,
 * near when d <= 80 cm for 0.3 s; in between the mode stays (hysteresis). far (the parent stands at
 * the door): ruler, numbers, red plate, edge pin, ghost line and align hint/marker fade out (250 ms)
 * and the seat cannot be grabbed; the band stays at full opacity with the one word "Belt path" 12 cm
 * above it, and the off-view arrow + chime may point at the seat again. near (kneeling): the word
 * leaves (180 ms) and the ruler comes back with the start stagger (or the align hint, if not aligned
 * yet). Distance only changes how much is drawn; nothing is measured.
 *
 * Motion lives in BeltPathMotion.ts (agent/motion-spec.md); `reduceMotion` turns it all off.
 *   grabbing  → buttons + card hidden. Nothing reacts to the red plate: the Lens never
 *               measures, the parent judges the edge pin against the plate by eye.
 *   answering → on release, the two answer buttons appear 10 cm above the belt path.
 *   result    → the parent's own answer picks the card; "Check again" restores start.
 *
 * Expects (@input): every controller/UI component below (wired by the bootstrap) and the
 * BeltPathTarget anchor (a point on the belt path used for the off-view check).
 * Must not: author UI or text (UI modules own that), or measure/judge the movement.
 *
 * Test API (LEAF): getStateName, getMode/setMode/toggleMode, getSeatOffsetCm,
 * getPeakOffsetCm, getLimitCm, getRedLineCm, getCardKind,
 * getCardText, areAnswerButtonsVisible, isAligned, isAlignHintShown, getAlignPointWorld,
 * isRulerShown, debugResetAlignment, isResultCardVisible, isOffViewCueVisible,
 * pressCrossedLine, pressStayedInside, pressCheckAgain, debugBeginGrab, debugDragTo,
 * debugRelease, getOverlayOpacity, isMotionSettled, setReduceMotion, getViewMode,
 * getViewerDistanceCm, debugSetViewerDistanceCm, isFarLabelShown, isGrabEnabled. The instance is also
 * published as global.beltPath.
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import { BeltPathState } from "./BeltPathState"
import { CardKind, DemoMode } from "./BeltPathSceneContracts"
import { BeltPathSeatShakeController } from "./BeltPathSeatShakeController"
import { BeltPathOverlayController } from "./BeltPathOverlayController"
import { BeltPathAudioController } from "./BeltPathAudioController"
import { BeltPathRulerUI } from "./BeltPathRulerUI"
import { BeltPathAnswerUI } from "./BeltPathAnswerUI"
import { BeltPathResultCardUI } from "./BeltPathResultCardUI"
import { BeltPathDemoToggleUI } from "./BeltPathDemoToggleUI"
import { BeltPathOffViewCueUI } from "./BeltPathOffViewCueUI"
import { BeltPathStartLabelsUI } from "./BeltPathStartLabelsUI"
import { BeltPathAlignZeroUI } from "./BeltPathAlignZeroUI"
type ViewMode = "near" | "far"

import {
  activeTweenCount, debugSetMotionClock, easeIn, easeOut, finishAllTweens, isReduceMotion, MotionCm, MotionMs, setReduceMotion,
  setTweenDriver, Tween, tween,
} from "./BeltPathMotion"

@component
export class BeltPathMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathMain – flow of the 1-inch belt path check</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Grab-and-shake controller on CarSeat/SeatGrabHandle.")
  seatShake!: BeltPathSeatShakeController

  @input
  @hint("Belt path band + ghost outline controller.")
  overlay!: BeltPathOverlayController

  @input
  @hint("Vehicle-anchored 10 cm ruler.")
  ruler!: BeltPathRulerUI

  @input
  @hint("The two answer buttons (10 cm above the belt path).")
  answers!: BeltPathAnswerUI

  @input
  @hint("Result card (same spot as the buttons).")
  resultCard!: BeltPathResultCardUI

  @input
  @hint("Demo-only Loose/Tight toggle on the left door armrest.")
  demoToggle!: BeltPathDemoToggleUI

  @input
  @hint("Edge-of-view arrow pointing at the seat when it is out of view at start.")
  offViewCue!: BeltPathOffViewCueUI

  @input
  @hint("Chime / click cues.")
  audio!: BeltPathAudioController

  @input
  @hint("Point on the belt path used to test whether the seat is in view.")
  beltPathTarget!: SceneObject

  @input
  @allowUndefined
  @hint("\"Belt path\" + the shake hint \"Grab the seat here and shake\", shown for 3 s at every near start.")
  startLabels: BeltPathStartLabelsUI

  @input
  @allowUndefined
  @hint("One-time pinch on the seat edge that sets the ruler 0 (no input = ruler already aligned).")
  alignZero: BeltPathAlignZeroUI

  @input
  @allowUndefined
  @hint("Edge pin on the car seat; hidden until the ruler is aligned.")
  edgePin: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Demo setting: how far the seat can move in Loose mode (cm). Crosses the 2.5 cm line.")
  @widget(new SliderWidget(0.5, 8, 0.5))
  looseLimitCm: number = 4

  @input
  @hint("Demo setting: how far the seat can move in Tight mode (cm).")
  @widget(new SliderWidget(0, 4, 0.25))
  tightLimitCm: number = 1

  @input("string", "Loose")
  @hint("Demo mode at start.")
  @widget(new ComboBoxWidget([new ComboBoxItem("Loose", "Loose"), new ComboBoxItem("Tight", "Tight")]))
  defaultMode: string = "Loose"

  @input
  @hint("Reduce motion: every animation is instant (all durations 0). The seat still follows the hand 1:1.")
  reduceMotion: boolean = false

  @input
  @hint("Radius (cm) around the belt path target that must be in view to count as 'in view'.")
  @widget(new SliderWidget(1, 20, 0.5))
  inViewRadiusCm: number = 4
  @ui.group_end

  private state = new BeltPathState()
  private prevOffset: number = 0
  private cueChimed: boolean = false
  private cueDone: boolean = false
  private cam: Camera | null = null
  private aligned: boolean = false
  private alignPointWorld: vec3 | null = null
  private stagger: Tween[] = []
  private pinMats: { mat: Material, base: vec4 }[] = []
  private pinHome: vec3 = vec3.zero()
  private rulerHome: vec3 = vec3.zero()
  private ghostHome: vec3 = vec3.zero()
  private viewMode: ViewMode = "near"
  private pendingMode: ViewMode | null = null
  private pendingSince: number = 0
  private distOverrideCm: number | null = null

  /** View distance thresholds (cm) and how long (s) a side must hold before the mode switches. */
  private static readonly FAR_CM = 95
  private static readonly NEAR_CM = 80
  private static readonly MODE_HOLD_S = 0.3

  onAwake(): void {
    if (!this.seatShake || !this.overlay || !this.ruler || !this.answers || !this.resultCard
        || !this.demoToggle || !this.offViewCue || !this.audio || !this.beltPathTarget) {
      print("BeltPathMain: required @input not wired. Check the Phase B wiring.")
      return
    }
    ;(global as any).beltPath = this
    setReduceMotion(this.reduceMotion)
    // Every tween runs from this always-enabled script (a card that switches off must not freeze one).
    setTweenDriver(this)

    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onStart(): void {
    this.state.mode = this.defaultMode === "Tight" ? "Tight" : "Loose"
    this.applyMode()

    this.seatShake.onGrabStart.add(() => this.onGrabStart())
    this.seatShake.onGrabEnd.add(() => this.onGrabEnd())
    this.seatShake.onOffsetChanged.add((cm) => this.onOffset(cm))
    this.seatShake.onHoverChanged.add((on) => this.overlay.setHighlight(on))

    this.answers.onCrossed.add(() => this.pressCrossedLine())
    this.answers.onStayed.add(() => this.pressStayedInside())
    this.resultCard.onCheckAgain.add(() => this.pressCheckAgain())
    this.demoToggle.onToggle.add(() => { this.audio.playClick(); this.toggleMode() })

    this.rulerHome = this.ruler.getSceneObject().getTransform().getLocalPosition()
    this.ghostHome = this.overlay.ghostRoot.getTransform().getLocalPosition()
    if (this.edgePin) {
      this.pinHome = this.edgePin.getTransform().getLocalPosition()
      this.collectPinMats(this.edgePin)
    }
    if (this.alignZero) {
      this.alignZero.onPinched.add((p) => this.onAlignPinched(p))
    } else {
      this.aligned = true
    }

    try {
      this.cam = WorldCameraFinderProvider.getInstance().getComponent()
    } catch (e) {
      this.cam = null
    }
    if (this.cam) {
      const p = this.cam.getTransform().getWorldPosition()
      print("BeltPath: camera at " + p.toString() + ", belt path target at "
        + this.beltPathTarget.getTransform().getWorldPosition().toString())
    }
    // The first view mode comes straight from the distance (no hold); between 80 and 95 cm it is near.
    const d = this.getViewerDistanceCm()
    this.viewMode = d !== null && d >= BeltPathMain.FAR_CM ? "far" : "near"
    print("BeltPath: view distance " + (d === null ? "unknown" : d.toFixed(1) + " cm") + " -> " + this.viewMode)
    if (this.startLabels) this.startLabels.setFar(this.viewMode === "far", this.beltPathTarget)
    this.enterStart()
  }

  // ── Flow ──────────────────────────────────────────────────────────

  private enterStart(): void {
    this.state.restart()
    this.answers.hide()
    this.resultCard.hide()
    this.seatShake.snapHome()
    this.prevOffset = 0
    this.cueChimed = false
    this.cueDone = false
    // Labels from an earlier start never carry over (the align step and the far view show none).
    if (this.startLabels) this.startLabels.endNow()
    this.applyAlignVisibility()
    if (this.viewMode === "far") {
      // Far: only the band (fading in, full opacity) and the one word; the ruler waits for near.
      this.cancelStagger()
      this.overlay.setOpacity(0)
      this.overlay.setBandRise(0)
      this.stagger.push(tween(this, {
        durMs: MotionMs.fadeIn, ease: easeOut, onUpdate: (v) => this.overlay.setBandOpacity(v),
      }))
    } else if (this.aligned) {
      this.runStagger(true)
      if (this.startLabels) this.startLabels.showBriefly()
    } else {
      // Align step: only the band shows, fading in with the hint (ease-out 300 ms).
      this.cancelStagger()
      this.overlay.setOpacity(0)
      this.overlay.setBandRise(0)
      this.stagger.push(tween(this, {
        durMs: MotionMs.fadeIn, ease: easeOut, onUpdate: (v) => this.overlay.setOpacity(v),
      }))
    }
  }

  /**
   * Motion spec 2: band -> ghost -> ruler strip -> numbers 0..10 -> red plate -> edge pin, 80 ms
   * apart, each 220 ms ease-out. Band, ghost and pin fade + rise 0.5 cm; the ruler parts fade only
   * (review 2: the ruler sits in the lower periphery). Total 620 ms. After the align pinch the band
   * is already showing, so its slot keeps the timing but it does not blink off and on.
   */
  private runStagger(includeBand: boolean): void {
    this.cancelStagger()
    const rise = MotionCm.staggerRise
    const steps: (((k: number) => void) | null)[] = [
      includeBand ? (k) => { this.overlay.setBandOpacity(k); this.overlay.setBandRise(rise * (1 - k)) } : null,
      (k) => { this.overlay.setGhostOpacity(k); this.overlay.setGhostRise(rise * (1 - k)) },
      (k) => this.ruler.setStripOpacity(k),
      (k) => this.ruler.setNumbersOpacity(k),
      (k) => this.ruler.setPlateOpacity(k),
      (k) => this.setPinPose(k, rise * (1 - k)),
    ]
    if (!includeBand) { this.overlay.setBandOpacity(1); this.overlay.setBandRise(0) }
    steps.forEach((step, i) => {
      if (!step) return
      this.stagger.push(tween(this, {
        durMs: MotionMs.staggerItem, delayMs: i * MotionMs.staggerStep, ease: easeOut, onUpdate: step,
      }))
    })
  }

  private cancelStagger(): void {
    for (const t of this.stagger) t.finish()
    this.stagger = []
  }

  private collectPinMats(so: SceneObject): void {
    for (const r of so.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]) {
      if (!r.mainMaterial) continue
      const m = r.mainMaterial.clone()
      r.mainMaterial = m
      this.pinMats.push({ mat: m, base: m.mainPass.baseColor })
    }
    for (let i = 0; i < so.getChildrenCount(); i++) this.collectPinMats(so.getChild(i))
  }

  /** Edge pin opacity and how far (cm) below its place it sits; it rides on the seat, so it moves with it. */
  private setPinPose(alpha: number, below: number): void {
    if (!this.edgePin) return
    for (const p of this.pinMats) p.mat.mainPass.baseColor = new vec4(p.base.x, p.base.y, p.base.z, p.base.w * alpha)
    const h = this.pinHome
    this.edgePin.getTransform().setLocalPosition(new vec3(h.x, h.y - below, h.z))
  }

  /**
   * Before the align pinch: hint on, ruler/ghost/pin hidden, seat not grabbable. After: the reverse.
   * In the far view everything but the band is off and the hint is hidden.
   */
  private applyAlignVisibility(): void {
    const far = this.viewMode === "far"
    const on = this.aligned && !far
    this.ruler.getSceneObject().enabled = on
    this.overlay.ghostRoot.enabled = on
    if (this.edgePin) this.edgePin.enabled = on
    this.seatShake.setGrabEnabled(on)
    if (this.alignZero) {
      if (this.aligned || far) this.alignZero.hidePrompt()
      else this.alignZero.showPrompt()
    }
  }

  /** Max distance (cm) the align pinch may move the ruler 0 away from the seat edge. */
  private static readonly ALIGN_MAX_DX_CM = 0.5

  /**
   * The parent pinched the seat edge: the ruler's 0 and the ghost's edge move along the ruler to
   * the seat edge at the pinch. The pinch only says "this edge"; the 0 snaps to the seat edge (the
   * edge pin's centre) and never moves more than 0.5 cm, so at rest the pin stands on ruler 0
   * wherever on the 3 cm target the pinch landed. The ruler stays on the cushion in the seat's
   * front-face plane; only its position along its own axis changes. Nothing is measured.
   */
  private onAlignPinched(world: vec3): void {
    if (this.aligned || this.state.phase !== "start" || this.viewMode === "far") return
    const rulerT = this.ruler.getSceneObject().getTransform()
    const parent = this.ruler.getSceneObject().getParent()
    const toLocal = parent ? parent.getTransform().getInvertedWorldTransform() : mat4.identity()
    const edgeW = this.seatEdgeWorld()
    const local = toLocal.multiplyPoint(edgeW ? edgeW : world)
    const maxDx = BeltPathMain.ALIGN_MAX_DX_CM
    const dx = Math.max(-maxDx, Math.min(maxDx, local.x - this.rulerHome.x))
    rulerT.setLocalPosition(new vec3(this.rulerHome.x + dx, this.rulerHome.y, this.rulerHome.z))
    const g = this.ghostHome
    this.overlay.ghostRoot.getTransform().setLocalPosition(new vec3(g.x + dx, g.y, g.z))
    this.alignPointWorld = world
    this.aligned = true
    this.audio.playClick()
    print("BeltPath: ruler 0 aligned to the pinched seat edge (moved " + dx.toFixed(2) + " cm along the ruler)")
    this.applyAlignVisibility()
    this.runStagger(false)
    // The labels wait until the align hint has faded out (they would overlap it otherwise).
    if (this.startLabels) this.startLabels.showBriefly(MotionMs.hintFadeOut)
  }

  /** World centre of the edge pin's visuals (the seat's side edge at the belt path), or null. */
  private seatEdgeWorld(): vec3 | null {
    if (!this.edgePin) return null
    const pts: vec3[] = []
    const walk = (so: SceneObject): void => {
      if (so.getComponents("Component.RenderMeshVisual").length > 0) pts.push(so.getTransform().getWorldPosition())
      for (let i = 0; i < so.getChildrenCount(); i++) walk(so.getChild(i))
    }
    walk(this.edgePin)
    if (pts.length === 0) return null
    let sum = vec3.zero()
    for (const p of pts) sum = sum.add(p)
    return sum.uniformScale(1 / pts.length)
  }

  private onGrabStart(): void {
    this.state.beginGrab()
    // Nothing moves or fades while the parent shakes the seat: everything jumps to rest.
    this.answers.hide(true)
    this.resultCard.hide(true)
    if (this.startLabels) this.startLabels.endNow()
    this.stagger = []
    finishAllTweens()
  }

  private onGrabEnd(): void {
    this.state.release()
    if (this.state.phase === "answering") this.answers.show()
  }

  private onOffset(cm: number): void {
    // Peak travel is kept only for tests/debug; nothing on screen reacts to it.
    if (this.seatShake.isDragging()) {
      this.state.peakOffsetCm = Math.max(this.state.peakOffsetCm, Math.abs(cm))
    }
    this.prevOffset = cm
  }

  private onUpdate(): void {
    this.updateViewMode()
    this.updateOffViewCue()
  }

  /** Camera to belt path target (cm); the test override wins. Null without a camera. */
  getViewerDistanceCm(): number | null {
    if (this.distOverrideCm !== null) return this.distOverrideCm
    if (!this.cam) return null
    return this.cam.getTransform().getWorldPosition().distance(this.beltPathTarget.getTransform().getWorldPosition())
  }

  /** Hysteresis + 0.3 s hold; switches only in the start phase (never while answering or on a card). */
  private updateViewMode(): void {
    const d = this.getViewerDistanceCm()
    if (d === null) return
    const want: ViewMode = d >= BeltPathMain.FAR_CM ? "far" : d <= BeltPathMain.NEAR_CM ? "near" : this.viewMode
    if (want === this.viewMode || this.state.phase !== "start") { this.pendingMode = null; return }
    const now = getTime()
    if (this.pendingMode !== want) { this.pendingMode = want; this.pendingSince = now; return }
    if (now - this.pendingSince < BeltPathMain.MODE_HOLD_S) return
    this.pendingMode = null
    if (want === "far") this.enterFar()
    else this.enterNear()
  }

  /** Parent stepped back: everything but the band fades out (250 ms ease-in), the seat cannot be grabbed. */
  private enterFar(): void {
    this.viewMode = "far"
    print("BeltPath: view far (d " + (this.getViewerDistanceCm() || 0).toFixed(1) + " cm)")
    this.cancelStagger()
    this.overlay.setBandOpacity(1)
    this.overlay.setBandRise(0)
    this.seatShake.setGrabEnabled(false)
    this.overlay.setHighlight(false)
    if (this.alignZero) this.alignZero.hidePrompt()
    if (this.startLabels) this.startLabels.setFar(true, this.beltPathTarget)
    // Standing at the door looking elsewhere: the edge arrow and chime may point at the seat again.
    this.cueDone = false
    this.cueChimed = false
    if (this.aligned) {
      this.stagger.push(tween(this, {
        durMs: MotionMs.labelFadeOut, ease: easeIn, from: 1, to: 0,
        onUpdate: (v) => { this.ruler.setOpacity(v); this.overlay.setGhostOpacity(v); this.setPinPose(v, 0) },
        onDone: () => { if (this.viewMode === "far") this.applyAlignVisibility() },
      }))
    } else {
      this.applyAlignVisibility()
    }
  }

  /** Parent knelt: the word leaves (180 ms) and the ruler comes back with the start stagger. */
  private enterNear(): void {
    this.viewMode = "near"
    print("BeltPath: view near (d " + (this.getViewerDistanceCm() || 0).toFixed(1) + " cm)")
    this.cancelStagger()
    if (this.startLabels) this.startLabels.setFar(false)
    if (this.aligned) {
      this.ruler.setOpacity(0)
      this.overlay.setGhostOpacity(0)
      this.setPinPose(0, MotionCm.staggerRise)
    }
    this.applyAlignVisibility()
    if (this.aligned) this.runStagger(false)
  }

  private updateOffViewCue(): void {
    if (!this.cam) return
    const target = this.beltPathTarget.getTransform().getWorldPosition()
    const visible = this.cam.isSphereVisible(target, this.inViewRadiusCm)
    if (this.state.phase !== "start" || this.cueDone || visible) {
      if (this.offViewCue.isShown()) this.offViewCue.hide()
      if (visible && this.state.phase === "start") this.cueDone = true
      return
    }
    this.offViewCue.showToward(this.cam.getTransform(), target)
    if (!this.cueChimed) {
      this.cueChimed = true
      this.audio.playChime()
    }
  }

  private applyMode(): void {
    this.seatShake.setLimitCm(this.state.mode === "Loose" ? this.looseLimitCm : this.tightLimitCm)
    this.demoToggle.setMode(this.state.mode)
  }

  // ── Public API (UI events + LEAF tests) ──────────────────────────

  pressCrossedLine(): void {
    if (this.state.phase !== "answering") return
    this.audio.playClick()
    this.state.answer(true)
    this.overlay.setHighlight(false)
    this.answers.hide()
    // The card floats over the seat; a pinch on it must never start a shake.
    this.seatShake.setGrabEnabled(false)
    this.resultCard.showCrossed()
  }

  pressStayedInside(): void {
    if (this.state.phase !== "answering") return
    this.audio.playClick()
    this.state.answer(false)
    this.overlay.setHighlight(false)
    this.answers.hide()
    this.seatShake.setGrabEnabled(false)
    this.resultCard.showStayed()
  }

  pressCheckAgain(): void {
    if (this.state.phase !== "result") return
    this.audio.playClick()
    this.enterStart()
  }

  setMode(mode: string): void {
    this.state.mode = mode === "Tight" ? "Tight" : "Loose"
    this.applyMode()
  }

  toggleMode(): DemoMode {
    this.state.toggleMode()
    this.applyMode()
    return this.state.mode
  }

  getMode(): DemoMode { return this.state.mode }
  getStateName(): string { return this.state.phase }
  getSeatOffsetCm(): number { return this.seatShake.getOffsetCm() }
  getPeakOffsetCm(): number { return this.state.peakOffsetCm }
  getLimitCm(): number { return this.seatShake.getLimitCm() }
  getRedLineCm(): number { return this.ruler.redLineAtCm }
  getCardKind(): CardKind { return this.resultCard.getKind() }
  getCardText(): string { return this.resultCard.getVisibleText() }
  areAnswerButtonsVisible(): boolean { return this.answers.isShown() }
  isResultCardVisible(): boolean { return this.resultCard.isShown() }
  isOffViewCueVisible(): boolean { return this.offViewCue.isShown() }
  getOverlayOpacity(): number { return this.overlay.getOpacity() }
  getRulerOpacity(): number { return this.ruler.getOpacity() }

  /** True when no animation is running and the seat is at rest (tests wait for this). */
  isMotionSettled(): boolean {
    return activeTweenCount() === 0 && !this.seatShake.isReturning() && !this.seatShake.isDragging()
  }

  /** Capture only: freeze the motion clock at t seconds (null = real time). */
  debugSetMotionClock(t: number | null): void { debugSetMotionClock(t) }

  setReduceMotion(on: boolean): void { this.reduceMotion = on; setReduceMotion(on) }
  isReduceMotion(): boolean { return isReduceMotion() }
  isAligned(): boolean { return this.aligned }
  isAlignHintShown(): boolean { return !!this.alignZero && this.alignZero.isPromptShown() }
  getAlignHintText(): string { return this.alignZero ? this.alignZero.getHintText() : "" }
  getAlignPointWorld(): vec3 | null { return this.alignPointWorld }
  isRulerShown(): boolean { return this.ruler.getSceneObject().isEnabledInHierarchy }
  getRulerZeroWorld(): vec3 { return this.ruler.getSceneObject().getTransform().getWorldPosition() }

  /** Test/debug: forget the alignment and go back to the align step (ruler/ghost back home). */
  debugResetAlignment(): void {
    if (!this.alignZero) return
    this.aligned = false
    this.alignPointWorld = null
    this.ruler.getSceneObject().getTransform().setLocalPosition(this.rulerHome)
    this.overlay.ghostRoot.getTransform().setLocalPosition(this.ghostHome)
    this.enterStart()
  }

  getViewMode(): ViewMode { return this.viewMode }
  isGrabEnabled(): boolean { return this.seatShake.isGrabEnabled() }
  isFarLabelShown(): boolean { return !!this.startLabels && this.startLabels.isFarLabelShown() }
  getFarLabelWorld(): vec3 | null { return this.startLabels ? this.startLabels.getFarLabelWorld() : null }

  /** Test/debug: pretend the camera is `cm` from the belt path target (null = the real camera). */
  debugSetViewerDistanceCm(cm: number | null): void {
    this.distOverrideCm = cm === null || cm === undefined ? null : cm
    this.pendingMode = null
  }

  debugBeginGrab(): void { this.seatShake.debugBeginDrag() }
  debugDragTo(offsetCm: number): void { this.seatShake.debugDragTo(offsetCm) }
  debugRelease(): void { this.seatShake.debugRelease() }
}
