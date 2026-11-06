/**
 * BeltPathOverlayController — the belt path band and the ghost outline.
 *
 * Owns: per-instance clones of the band material (fade + hover highlight) and the ghost
 * outline geometry (12 thin white edges around the seat base at its ORIGINAL position;
 * outline only, no fill, never black — the display is additive).
 *
 * Expects (@input): bandRoot (BeltPathBand group on the car seat, its children carry
 * RenderMeshVisuals), ghostRoot (GhostOutline, vehicle-anchored), edgeMesh (unit box).
 *
 * Step highlight (L3): buildHighlight(target) draws a band-colored 12-edge box (same edges as the
 * ghost) 2 cm around the target's mesh bounds — the real seat belt buckle, whose latch plate sits
 * inside that margin. setStepHighlight(true) shows it with the red card: fade in 250 ms (ease-out),
 * 3 gentle pulses like the align marker, then it holds alpha 0.55 (nothing loops); false fades it
 * out (180 ms) and switches it off. Reduce motion: no fade, no pulse. No collider (never takes a pinch).
 *
 * Must not: move the seat, judge anything, or own flow state. The main script drives the
 * fades: setOpacity() for both, or setBandOpacity()/setGhostOpacity() plus setBandRise()/
 * setGhostRise() (cm below the resting place) for the start stagger (motion spec 2).
 */
import { easeIn, easeOut, isReduceMotion, MotionMs, Tween, tween } from "./BeltPathMotion"

@component
export class BeltPathOverlayController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathOverlayController – belt path band + ghost outline</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("BeltPathBand group on the car seat; every RenderMeshVisual under it is faded and highlighted.")
  bandRoot!: SceneObject

  @input
  @hint("GhostOutline SceneObject at the seat's original position (vehicle-anchored, does not move).")
  ghostRoot!: SceneObject

  @input
  @hint("Unit box mesh used to draw the ghost outline edges.")
  edgeMesh!: RenderMesh

  @input
  @hint("Unlit transparent material cloned for the ghost edges.")
  overlayMaterial!: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input("vec4", "{0.45,0.85,1.0,0.95}")
  @widget(new ColorWidget())
  @hint("Belt path band color (bright light blue).")
  bandColor: vec4 = new vec4(0.45, 0.85, 1.0, 0.95)

  @input("vec4", "{0.75,0.95,1.0,1.0}")
  @widget(new ColorWidget())
  @hint("Band color while the seat is aimed at (hover highlight).")
  bandHighlightColor: vec4 = new vec4(0.75, 0.95, 1.0, 1.0)

  @input("vec4", "{1,1,1,0.6}")
  @widget(new ColorWidget())
  @hint("Ghost outline color — white, semi-transparent, outline only.")
  ghostColor: vec4 = new vec4(1, 1, 1, 0.6)

  @input("vec3", "{44,16,42}")
  @hint("Size (cm) of the box the ghost outlines — the car seat base.")
  ghostBoxSizeCm: vec3 = new vec3(44, 16, 42)

  @input
  @hint("Ghost edge thickness (cm).")
  @widget(new SliderWidget(0.1, 0.8, 0.05))
  ghostEdgeCm: number = 0.3

  @input
  @hint("How far (cm) the ghost sits outside the seat surface so it stays visible at rest.")
  @widget(new SliderWidget(0, 1.5, 0.05))
  ghostInflateCm: number = 0.4

  @input
  @hint("Margin (cm) between the buckle and its highlight box.")
  @widget(new SliderWidget(0, 4, 0.1))
  highlightPadCm: number = 2

  @input
  @hint("Highlight alpha it holds after its 3 pulses.")
  @widget(new SliderWidget(0.1, 1, 0.05))
  highlightHoldAlpha: number = 0.55
  @ui.group_end

  private bandMats: Material[] = []
  private ghostMat: Material | null = null
  private bandOpacity: number = 1
  private ghostOpacity: number = 1
  private highlighted: boolean = false
  private bandHome: vec3 = vec3.zero()
  private ghostRise!: SceneObject
  private highlightRoot: SceneObject | null = null
  private highlightMat: Material | null = null
  private highlightShown: boolean = false
  private highlightFade: number = 0
  private highlightT: number = 0
  private highlightTw: Tween | null = null

  onAwake(): void {
    if (!this.bandRoot || !this.ghostRoot || !this.edgeMesh || !this.overlayMaterial) {
      print("BeltPathOverlayController: required @input not wired.")
      return
    }
    this.collectBand(this.bandRoot)
    this.bandHome = this.bandRoot.getTransform().getLocalPosition()
    // The ghost's edges hang under a child so the stagger can lift them without touching
    // ghostRoot, whose position the main script sets at the align pinch.
    this.ghostRise = global.scene.createSceneObject("GhostRise")
    this.ghostRise.setParent(this.ghostRoot)
    this.buildGhost()
    this.refresh()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ── Step highlight (the real buckle, with the red card) ────────────

  /**
   * Builds the highlight box around `target`'s render mesh bounds (+ highlightPadCm). It hangs under
   * the target's parent with the target's local pose, so a non-uniform target scale does not stretch
   * the edges. Built once; starts switched off.
   */
  buildHighlight(target: SceneObject): void {
    if (this.highlightRoot || !target || !this.edgeMesh || !this.overlayMaterial) return
    const rmv = target.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (!rmv || !rmv.mesh) {
      print("BeltPathOverlayController: highlight target " + target.name + " has no render mesh.")
      return
    }
    const tt = target.getTransform()
    const sc = tt.getLocalScale()
    const a = rmv.mesh.aabbMin
    const b = rmv.mesh.aabbMax
    const center = new vec3((a.x + b.x) / 2 * sc.x, (a.y + b.y) / 2 * sc.y, (a.z + b.z) / 2 * sc.z)
    const pad = this.highlightPadCm
    const hx = Math.abs(b.x - a.x) * Math.abs(sc.x) / 2 + pad
    const hy = Math.abs(b.y - a.y) * Math.abs(sc.y) / 2 + pad
    const hz = Math.abs(b.z - a.z) * Math.abs(sc.z) / 2 + pad
    const root = global.scene.createSceneObject("BuckleHighlight")
    const parent = target.getParent()
    if (parent) root.setParent(parent)
    const rt = root.getTransform()
    rt.setLocalPosition(tt.getLocalPosition())
    rt.setLocalRotation(tt.getLocalRotation())
    this.highlightMat = this.overlayMaterial.clone()
    const t = this.ghostEdgeCm
    const add = (pos: vec3, scale: vec3): void => {
      const so = global.scene.createSceneObject("BuckleHighlightEdge")
      so.setParent(root)
      so.getTransform().setLocalPosition(center.add(pos))
      so.getTransform().setLocalScale(scale)
      const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      r.mesh = this.edgeMesh
      r.mainMaterial = this.highlightMat
    }
    for (const y of [-hy, hy]) for (const z of [-hz, hz]) add(new vec3(0, y, z), new vec3(2 * hx + t, t, t))
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) add(new vec3(x, 0, z), new vec3(t, 2 * hy + t, t))
    for (const x of [-hx, hx]) for (const y of [-hy, hy]) add(new vec3(x, y, 0), new vec3(t, t, 2 * hz + t))
    this.highlightRoot = root
    root.enabled = false
    this.paintHighlight()
  }

  /** Shows (with the red card) or hides the buckle highlight. */
  setStepHighlight(on: boolean): void {
    if (!this.highlightRoot) return
    if (on === this.highlightShown) return
    this.highlightShown = on
    if (this.highlightTw) { this.highlightTw.cancel(); this.highlightTw = null }
    if (on) {
      this.highlightT = 0
      this.highlightRoot.enabled = true
      this.highlightTw = tween(this, {
        durMs: MotionMs.slideIn, ease: easeOut, from: this.highlightFade, to: 1,
        onUpdate: (v) => { this.highlightFade = v; this.paintHighlight() },
      })
    } else {
      this.highlightTw = tween(this, {
        durMs: MotionMs.slideOut, ease: easeIn, from: this.highlightFade, to: 0,
        onUpdate: (v) => { this.highlightFade = v; this.paintHighlight() },
        onDone: () => { if (!this.highlightShown && this.highlightRoot) this.highlightRoot.enabled = false },
      })
    }
  }

  isStepHighlightShown(): boolean { return this.highlightShown }
  getStepHighlightObject(): SceneObject | null { return this.highlightRoot }
  /** Highlight alpha right now (tests). */
  getStepHighlightAlpha(): number { return this.highlightMat ? this.highlightMat.mainPass.baseColor.w : 0 }
  /** True once the 3 pulses are over (or under reduce motion): the alpha holds. */
  isStepHighlightHolding(): boolean {
    return isReduceMotion() || this.highlightT >= 3 * MotionMs.markerPulse / 1000
  }

  private onUpdate(): void {
    if (!this.highlightRoot || !this.highlightRoot.enabled) return
    this.highlightT += getDeltaTime()
    this.paintHighlight()
  }

  /** AlignZeroUI.paint pattern: 3 gentle pulses around the hold alpha, then it holds. */
  private paintHighlight(): void {
    if (!this.highlightMat) return
    let a = this.highlightHoldAlpha
    if (!isReduceMotion() && this.highlightT < 3 * MotionMs.markerPulse / 1000) {
      a = this.highlightHoldAlpha + 0.3 * Math.sin(this.highlightT * 2 * Math.PI / (MotionMs.markerPulse / 1000))
    }
    const c = this.bandColor
    this.highlightMat.mainPass.baseColor = new vec4(c.x, c.y, c.z, Math.max(0, Math.min(1, a)) * this.highlightFade)
  }

  /** 0..1 multiplier on band + ghost alpha (used by the start fade-in). */
  setOpacity(a: number): void {
    this.bandOpacity = this.ghostOpacity = Math.max(0, Math.min(1, a))
    this.refresh()
  }

  setBandOpacity(a: number): void { this.bandOpacity = Math.max(0, Math.min(1, a)); this.refresh() }
  setGhostOpacity(a: number): void { this.ghostOpacity = Math.max(0, Math.min(1, a)); this.refresh() }
  getBandOpacity(): number { return this.bandOpacity }

  /** Lowest of the band and ghost opacity (1 = both fully faded in). */
  getOpacity(): number { return Math.min(this.bandOpacity, this.ghostOpacity) }

  /** Band sits `cm` below its resting place (0 = at rest). It rides on the seat, so it moves with it. */
  setBandRise(cm: number): void {
    if (!this.bandRoot) return
    const h = this.bandHome
    this.bandRoot.getTransform().setLocalPosition(new vec3(h.x, h.y - cm, h.z))
  }

  /** Ghost outline sits `cm` below its resting place (0 = at rest). */
  setGhostRise(cm: number): void {
    if (this.ghostRise) this.ghostRise.getTransform().setLocalPosition(new vec3(0, -cm, 0))
  }

  /** Brighten the band while the seat is aimed at. */
  setHighlight(on: boolean): void {
    this.highlighted = on
    this.refresh()
  }

  private collectBand(obj: SceneObject): void {
    const rmv = obj.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (rmv && rmv.mainMaterial) {
      const m = rmv.mainMaterial.clone()
      rmv.mainMaterial = m
      this.bandMats.push(m)
    }
    for (let i = 0; i < obj.getChildrenCount(); i++) this.collectBand(obj.getChild(i))
  }

  private buildGhost(): void {
    this.ghostMat = this.overlayMaterial.clone()
    const s = this.ghostBoxSizeCm
    const hx = s.x / 2 + this.ghostInflateCm
    const hy = s.y / 2 + this.ghostInflateCm
    const hz = s.z / 2 + this.ghostInflateCm
    const t = this.ghostEdgeCm
    // 4 edges along X, 4 along Y, 4 along Z. Ghost root sits at the base center.
    for (const y of [-hy, hy]) for (const z of [-hz, hz]) this.edge(new vec3(0, y, z), new vec3(2 * hx + t, t, t))
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) this.edge(new vec3(x, 0, z), new vec3(t, 2 * hy + t, t))
    for (const x of [-hx, hx]) for (const y of [-hy, hy]) this.edge(new vec3(x, y, 0), new vec3(t, t, 2 * hz + t))
  }

  private edge(pos: vec3, scale: vec3): void {
    const so = global.scene.createSceneObject("GhostEdge")
    so.setParent(this.ghostRise)
    so.getTransform().setLocalPosition(pos)
    so.getTransform().setLocalScale(scale)
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = this.edgeMesh
    rmv.mainMaterial = this.ghostMat
  }

  private refresh(): void {
    const b = this.highlighted ? this.bandHighlightColor : this.bandColor
    for (const m of this.bandMats) m.mainPass.baseColor = new vec4(b.x, b.y, b.z, b.w * this.bandOpacity)
    if (this.ghostMat) {
      const g = this.ghostColor
      this.ghostMat.mainPass.baseColor = new vec4(g.x, g.y, g.z, g.w * this.ghostOpacity)
    }
  }
}
