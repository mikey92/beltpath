/**
 * BeltPathAlignZeroUI — the one-time "align zero" pinch before the first shake.
 *
 * Real-glasses behavior (demoable in preview): the parent pinches the car seat's side edge once
 * at the belt path. The pinched point becomes the ruler's 0 and the ghost outline's edge. The Lens
 * still never measures the seat: it only places the ruler where the parent pinched.
 *
 * Owns: a SIK Interactable + box collider on this SceneObject (put it on the seat's side edge at
 * the belt path, unit scale), a faint marker the size of the collider, and the one-line
 * hint "Pinch the seat edge at the belt path" (white, 1.0 cm) on the hint anchor next to the band.
 * Motion: hint and marker fade in (ease-out 300 ms); the marker pulses 3 times, then holds alpha
 * 0.55; aimed at, it brightens to 0.9. After the pinch they fade out (ease-in 180 ms).
 *
 * Public API: showPrompt(), hidePrompt(), isPromptShown(), getHintText(), onPinched(worldPoint).
 * Must not: move the ruler or ghost itself, or own flow state — BeltPathMain reacts to onPinched.
 */
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { easeIn, easeOut, isReduceMotion, MotionMs, Tween, tween } from "./BeltPathMotion"

@component
export class BeltPathAlignZeroUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathAlignZeroUI – pinch the seat edge once to set the ruler 0</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Anchor next to the belt path band where the hint text sits (faces the kneeling parent).")
  hintAnchor!: SceneObject

  @input
  @hint("Unit box mesh for the faint edge marker.")
  boxMesh!: RenderMesh

  @input
  @hint("Unlit transparent material cloned for the edge marker.")
  overlayMaterial!: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("One-line hint shown until the parent pinches the seat edge.")
  hintText: string = "Pinch the seat edge at the belt path"

  @input
  @hint("Hint text height (cm of em).")
  @widget(new SliderWidget(0.5, 2, 0.05))
  hintTextCm: number = 1.0

  @input("vec3", "{3,8,4}")
  @hint("Size (cm) of the pinch target on the seat's side edge (x across the edge, y up, z along the side).")
  targetSizeCm: vec3 = new vec3(3, 8, 4)

  @input("vec3", "{0.75,0.95,1}")
  @widget(new ColorWidget())
  @hint("Edge marker color (light, never black).")
  markerRgb: vec3 = new vec3(0.75, 0.95, 1)

  @input
  @hint("Marker alpha it holds after its 3 pulses.")
  @widget(new SliderWidget(0.1, 1, 0.05))
  markerHoldAlpha: number = 0.55

  @input
  @hint("Marker alpha while aimed at.")
  @widget(new SliderWidget(0.1, 1, 0.05))
  markerHoverAlpha: number = 0.9
  @ui.group_end

  private _onPinched = new Event<vec3>()
  /** Fires once per pinch with the pinched point in world space. */
  get onPinched(): PublicApi<vec3> { return this._onPinched.publicApi() }

  private interactable!: Interactable
  private collider!: ColliderComponent
  private marker!: SceneObject
  private markerMat!: Material
  private hint!: Text
  private shown: boolean = false
  private t: number = 0
  private hovered: boolean = false
  /** 0..1 fade of hint + marker. */
  private fade: number = 0
  private fadeTw: Tween | null = null
  /** One delayed callback, created once and re-armed with reset() on every pinch release. */
  private pinchEv!: DelayedCallbackEvent
  private pendingPinch: vec3 | null = null

  onAwake(): void {
    this.pinchEv = this.createEvent("DelayedCallbackEvent")
    this.pinchEv.bind(() => {
      const p = this.pendingPinch
      this.pendingPinch = null
      if (p && this.shown) this._onPinched.invoke(p)
    })
    if (!this.hintAnchor || !this.boxMesh || !this.overlayMaterial) {
      print("BeltPathAlignZeroUI: required @input not wired.")
      return
    }
    this.collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.targetSizeCm
    this.collider.shape = shape
    this.collider.fitVisual = false
    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable

    this.markerMat = this.overlayMaterial.clone()
    this.marker = global.scene.createSceneObject("AlignEdgeMarker")
    this.marker.setParent(this.sceneObject)
    this.marker.getTransform().setLocalScale(this.targetSizeCm)
    const rmv = this.marker.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = this.boxMesh
    rmv.mainMaterial = this.markerMat
    rmv.setRenderOrder(45)

    const ho = global.scene.createSceneObject("AlignHint")
    ho.setParent(this.hintAnchor)
    this.hint = ho.createComponent("Component.Text") as Text
    this.hint.text = this.hintText
    this.hint.size = this.hintTextCm * 44
    ;(this.hint as Text & { weight?: number }).weight = 600
    this.hint.depthTest = false
    this.hint.setRenderOrder(50)
    this.hint.textFill.color = new vec4(1, 1, 1, 1)
    this.hint.horizontalAlignment = HorizontalAlignment.Center
    this.hint.verticalAlignment = VerticalAlignment.Center
    this.hint.horizontalOverflow = HorizontalOverflow.Overflow
    this.hint.layoutRect = Rect.create(-14, 14, -1, 1)

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerStart.add((e: InteractorEvent) => this.onTriggerStart(e))
      this.interactable.onTriggerEnd.add(() => this.onTriggerEnd())
      this.interactable.onHoverEnter.add(() => { this.hovered = true })
      this.interactable.onHoverExit.add(() => { this.hovered = false })
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    this.hidePrompt()
  }

  /** Shows the hint and the edge marker and makes the edge pinchable. */
  showPrompt(): void {
    const wasShown = this.shown
    this.shown = true
    this.setActive(true)
    if (wasShown) return
    this.t = 0
    this.fadeTo(1, MotionMs.fadeIn, true)
  }

  /** Hides the hint and marker; the edge stops being a pinch target at once (the seat grab takes over). */
  hidePrompt(): void {
    this.shown = false
    this.hovered = false
    if (this.collider) this.collider.enabled = false
    if (this.interactable) this.interactable.enabled = false
    if (this.fade <= 0) { this.setActive(false); return }
    this.fadeTo(0, MotionMs.hintFadeOut, false, () => { if (!this.shown) this.setActive(false) })
  }

  private fadeTo(to: number, ms: number, arriving: boolean, done?: () => void): void {
    if (this.fadeTw) this.fadeTw.cancel()
    this.fadeTw = tween(this, {
      durMs: ms, ease: arriving ? easeOut : easeIn, from: this.fade, to,
      onUpdate: (v) => { this.fade = v; this.paint() },
      onDone: done,
    })
  }

  private paint(): void {
    if (this.hint) this.hint.textFill.color = new vec4(1, 1, 1, this.fade)
    if (!this.markerMat) return
    const c = this.markerRgb
    let a = this.markerHoldAlpha
    if (this.hovered) a = this.markerHoverAlpha
    else if (!isReduceMotion() && this.t < 3 * MotionMs.markerPulse / 1000) {
      // 3 gentle pulses around the hold alpha, then it holds (nothing loops).
      a = this.markerHoldAlpha + 0.3 * Math.sin(this.t * 2 * Math.PI / (MotionMs.markerPulse / 1000))
    }
    this.markerMat.mainPass.baseColor = new vec4(c.x, c.y, c.z, Math.max(0, Math.min(1, a)) * this.fade)
  }

  isPromptShown(): boolean { return this.shown }
  getHintText(): string { return this.hint ? this.hint.text : "" }

  private setActive(on: boolean): void {
    if (this.collider) this.collider.enabled = on
    if (this.interactable) this.interactable.enabled = on
    if (this.marker) this.marker.enabled = on
    if (this.hint) this.hint.getSceneObject().enabled = on
  }

  private pinchPoint: vec3 | null = null

  /** The pinch lands: remember where the ray hit the seat edge. */
  private onTriggerStart(e: InteractorEvent): void {
    if (!this.shown) return
    const hitInfo = e.interactor ? e.interactor.targetHitInfo : null
    const hit = hitInfo && hitInfo.hit ? hitInfo.hit.position : null
    this.pinchPoint = hit ? hit : this.sceneObject.getTransform().getWorldPosition()
  }

  /**
   * The pinch is released: align. Done one frame later so the interaction finishes cleanly
   * before this target is switched off (switching it off mid-pinch leaves the pinch hanging).
   */
  private onTriggerEnd(): void {
    if (!this.shown || !this.pinchPoint) return
    this.pendingPinch = this.pinchPoint
    this.pinchPoint = null
    this.pinchEv.reset(0)
  }

  private onUpdate(): void {
    if (!this.markerMat || !this.marker.enabled) return
    this.t += getDeltaTime()
    this.paint()
  }

  /** Marker alpha right now (tests). */
  getMarkerAlpha(): number { return this.markerMat ? this.markerMat.mainPass.baseColor.w : 0 }
}
