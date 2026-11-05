/**
 * BeltPathSeatShakeController — the preview stand-in for shaking a real car seat.
 *
 * Owns: the grab collider + SIK Interactable on the SeatGrabHandle, the side-to-side
 * (world X) offset of the CarSeat root, the demo movement limit (Loose 4 cm / Tight 1 cm,
 * set by the main script), and the spring-back to the original position on release.
 * Motion (motion-spec 4): while dragging, the seat follows the hand 1:1 (no easing). On release it
 * returns along a critically damped spring, x(t) = x0 (1 + wt) e^(-wt), which never overshoots;
 * w is chosen so it is home in ~400 ms (BeltPathMotion.MotionMs.seatReturn, 0 under reduce motion).
 *
 * Expects (@input): seatRoot (the movable CarSeat root). Attach this script to the
 * SeatGrabHandle SceneObject (unit scale, identity rotation — Hard Rule 6 wrapper).
 *
 * Must not: decide anything about the result, show UI, or play sounds. It only reports
 * grab start/end, hover, and the current offset through events.
 *
 * Input path: SIK Interactable trigger events fire from the MouseInteractor in the
 * Lens Studio preview, the HandInteractor on Specs, and LEAF's scripted interactors, so
 * no manual editor mock is needed. While triggering, the interactor ray is intersected
 * with a vertical plane through the grab point and only the X component moves the seat.
 */
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event, { PublicApi } from "SpectaclesInteractionKit.lspkg/Utils/Event"
import { MotionMs, sec } from "./BeltPathMotion"

@component
export class BeltPathSeatShakeController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathSeatShakeController – grab-and-shake stand-in for the car seat</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The movable CarSeat root. Only its X position changes; it springs back to where it started.")
  seatRoot!: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input("vec3", "{48,14,46}")
  @hint("Size (cm) of the grab box around the seat base (belt path height). Big so it is easy to pinch, but no taller than 14 cm: the answer buttons and card float just above it, and a taller box would catch the click ray before them.")
  grabBoxSizeCm: vec3 = new vec3(48, 14, 46)

  @input
  @hint("Critically damped return: w*T at which the spring counts as home (6.4 leaves ~1% of the offset, then it snaps to 0). Keep it at 6 or more: lower values leave a visible snap at the end.")
  @widget(new SliderWidget(6, 10, 0.1))
  returnSettleWT: number = 6.4

  @input
  @hint("Show the grab collider wireframe for debugging.")
  debugCollider: boolean = false
  @ui.group_end

  private interactable!: Interactable
  private collider!: ColliderComponent
  private originLocal: vec3 = vec3.zero()
  private offsetCm: number = 0
  private limitCm: number = 4
  /** Spring-back state: offset at release and time since release (s); returning = spring running. */
  private returning: boolean = false
  private releaseOffset: number = 0
  private returnT: number = 0

  private dragging: boolean = false
  private externalDrag: boolean = false
  private activeInteractor: any = null
  private planeZ: number = 0
  private grabStartX: number = 0
  private grabStartOffset: number = 0
  /** False until the interactor ray has met the grab plane once (no hit = that frame is skipped). */
  private grabStartValid: boolean = false

  private _onGrabStart = new Event<void>()
  private _onGrabEnd = new Event<void>()
  private _onOffsetChanged = new Event<number>()
  private _onHoverChanged = new Event<boolean>()

  get onGrabStart(): PublicApi<void> { return this._onGrabStart.publicApi() }
  get onGrabEnd(): PublicApi<void> { return this._onGrabEnd.publicApi() }
  /** Fires every frame the offset changes (cm, + = toward the ruler). */
  get onOffsetChanged(): PublicApi<number> { return this._onOffsetChanged.publicApi() }
  get onHoverChanged(): PublicApi<boolean> { return this._onHoverChanged.publicApi() }

  onAwake(): void {
    if (!this.seatRoot) {
      print("BeltPathSeatShakeController: seatRoot @input not wired.")
      return
    }
    this.originLocal = this.seatRoot.getTransform().getLocalPosition()

    const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    this.collider = collider
    const shape = Shape.createBoxShape()
    shape.size = this.grabBoxSizeCm
    collider.shape = shape
    collider.fitVisual = false
    collider.debugDrawEnabled = this.debugCollider

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerStart.add((e: InteractorEvent) => this.beginDrag(e))
      this.interactable.onTriggerEnd.add((e: InteractorEvent) => this.endDrag(e))
      this.interactable.onTriggerEndOutside.add((e: InteractorEvent) => this.endDrag(e))
      this.interactable.onTriggerCanceled.add((e: InteractorEvent) => this.endDrag(e))
      this.interactable.onHoverEnter.add(() => this._onHoverChanged.invoke(true))
      this.interactable.onHoverExit.add(() => this._onHoverChanged.invoke(false))
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ── Public API (main script + tests) ─────────────────────────────

  /** Movement limit in cm (demo setting: Loose 4, Tight 1). */
  setLimitCm(cm: number): void {
    this.limitCm = Math.max(0, cm)
    // Also clamp the spring's start, or toggling Tight mid spring-back would jump back out.
    this.releaseOffset = this.clamp(this.releaseOffset)
    this.applyOffset(this.clamp(this.offsetCm))
  }

  getLimitCm(): number { return this.limitCm }

  /** Turns the seat grab on/off (off until the parent has pinched the seat edge to set the ruler 0). */
  setGrabEnabled(on: boolean): void {
    if (this.collider) this.collider.enabled = on
    if (this.interactable) this.interactable.enabled = on
  }

  isGrabEnabled(): boolean { return !!this.collider && this.collider.enabled }

  /** Current side-to-side offset of the seat from its original position (cm). */
  getOffsetCm(): number { return this.offsetCm }

  isDragging(): boolean { return this.dragging }

  /** True while the seat is still springing back after a release. */
  isReturning(): boolean { return this.returning }

  /** Instantly return the seat to its original position (used by "Check again"). */
  snapHome(): void {
    this.returning = false
    this.applyOffset(0)
  }

  /** Test/debug: start a scripted drag without an interactor. */
  debugBeginDrag(): void {
    if (this.dragging) return
    this.externalDrag = true
    this.dragging = true
    this.returning = false
    this._onGrabStart.invoke()
  }

  /** Test/debug: request an offset during a scripted drag; the demo limit still applies. */
  debugDragTo(offsetCm: number): void {
    if (!this.dragging) this.debugBeginDrag()
    this.applyOffset(this.clamp(offsetCm))
  }

  /** Test/debug: release a scripted drag; the seat springs back. */
  debugRelease(): void {
    if (!this.dragging || !this.externalDrag) return
    this.externalDrag = false
    this.dragging = false
    this.startReturn()
    this._onGrabEnd.invoke()
  }

  // ── Internals ─────────────────────────────────────────────────────

  private beginDrag(e: InteractorEvent): void {
    if (this.dragging) return
    this.dragging = true
    this.externalDrag = false
    this.activeInteractor = e.interactor
    this.returning = false
    this.grabStartOffset = this.offsetCm
    const hit = this.interactorPoint(true)
    this.grabStartValid = hit !== null
    this.grabStartX = hit !== null ? hit.x : 0
    this._onGrabStart.invoke()
  }

  private endDrag(e: InteractorEvent): void {
    if (!this.dragging || this.externalDrag) return
    if (this.activeInteractor && e.interactor !== this.activeInteractor) return
    this.dragging = false
    this.activeInteractor = null
    this.startReturn()
    this._onGrabEnd.invoke()
  }

  /**
   * Point where the interactor ray meets the vertical plane through the grab point, expressed in
   * the CAR frame (the seat root's parent), so the shake follows the car seat's own left-right
   * axis whatever angle the parent views it from. Returns null when the ray does not meet the
   * plane (no ray, ray parallel to it, or plane behind the ray): the caller skips that frame.
   */
  private interactorPoint(capturePlane: boolean): vec3 | null {
    const it = this.activeInteractor
    if (!it) return null
    const parent = this.seatRoot.getParent()
    const toCar = parent ? parent.getTransform().getInvertedWorldTransform() : mat4.identity()
    if (capturePlane) {
      const hitInfo = it.targetHitInfo
      const hitPos: vec3 | null = hitInfo && hitInfo.hit ? hitInfo.hit.position : null
      const ref = hitPos ? hitPos : this.sceneObject.getTransform().getWorldPosition()
      this.planeZ = toCar.multiplyPoint(ref).z
    }
    const originW: vec3 | null = it.startPoint
    const dirW: vec3 | null = it.direction
    if (!originW || !dirW) return null
    const origin = toCar.multiplyPoint(originW)
    const dir = toCar.multiplyDirection(dirW)
    if (Math.abs(dir.z) <= 1e-4) return null
    const t = (this.planeZ - origin.z) / dir.z
    if (t <= 0) return null
    return origin.add(dir.uniformScale(t))
  }

  private onUpdate(): void {
    if (!this.seatRoot) return
    if (this.dragging) {
      if (!this.externalDrag) {
        const p = this.interactorPoint(false)
        if (p !== null && !this.grabStartValid) {
          // First frame with a hit: the drag starts here, so the seat does not jump.
          this.grabStartValid = true
          this.grabStartX = p.x
        } else if (p !== null) {
          this.applyOffset(this.clamp(this.grabStartOffset + (p.x - this.grabStartX)))
        }
      }
      return
    }
    if (!this.returning) return
    // Critically damped spring back to 0 (no overshoot): x(t) = x0 (1 + wt) e^(-wt).
    const T = sec(MotionMs.seatReturn)
    this.returnT += getDeltaTime()
    if (T <= 0 || this.returnT >= T) {
      this.returning = false
      this.applyOffset(0)
      return
    }
    const w = this.returnSettleWT / T
    const wt = w * this.returnT
    this.applyOffset(this.releaseOffset * (1 + wt) * Math.exp(-wt))
  }

  private startReturn(): void {
    this.releaseOffset = this.offsetCm
    this.returnT = 0
    this.returning = this.offsetCm !== 0
    if (this.returning && sec(MotionMs.seatReturn) <= 0) {
      this.returning = false
      this.applyOffset(0)
    }
  }

  private clamp(cm: number): number {
    return Math.max(-this.limitCm, Math.min(this.limitCm, cm))
  }

  private applyOffset(cm: number): void {
    if (cm === this.offsetCm) return
    this.offsetCm = cm
    const o = this.originLocal
    this.seatRoot.getTransform().setLocalPosition(new vec3(o.x + cm, o.y, o.z))
    this._onOffsetChanged.invoke(cm)
  }
}
