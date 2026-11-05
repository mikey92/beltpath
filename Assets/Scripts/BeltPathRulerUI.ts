/**
 * BeltPathRulerUI — the 10 cm vehicle-anchored ruler lying on the seat cushion.
 *
 * Owns: the ruler strip, 0.5 cm ticks (the regular part is script-built under the
 * authored Ruler root), the upright red plate at 2.5 cm (1 inch) with its "1 in / 2.5 cm" label and
 * a thin red leader line, the tick numbers, and their fades. Nothing flashes or sounds: the Lens
 * never measures.
 *
 * Fades (motion spec 2 + review 2 item 5): three groups the main script staggers, fade only (no
 * rise: the ruler sits in the lower periphery) — setStripOpacity (strip + ticks), setNumbersOpacity
 * (0..10), setPlateOpacity (red plate, its label and leader). setOpacity sets all three.
 * Numbers stand on the strip's back edge right under their ticks, 0.8 cm tall, weight 600, and turn
 * about the vertical only (yaw billboard) to face the parent. The "0" sits 0.4 cm toward the parent
 * and 0.4 cm to their left of its tick (zeroLabelNudgeCm) and draws over the seat corner, ghost
 * line and edge pin at 0 so they do not cover it.
 *
 * Local frame of the Ruler root: origin = zero mark = the car seat's side edge at its
 * original position; +X runs away from the seat along the cushion; +Y is up; +Z is toward
 * the parent. Labels sit at their measurement positions (that is what a ruler is), not
 * in a stacked text layout, so this view does not use FlexLayout.
 *
 * Must not: measure the seat or judge anything — it only draws.
 */

@component
export class BeltPathRulerUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathRulerUI – 10 cm ruler with the 1-inch red line</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Unit box mesh used for the strip, ticks and red line.")
  boxMesh!: RenderMesh

  @input
  @hint("Unlit transparent material cloned for every ruler part.")
  overlayMaterial!: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Ruler length (cm).")
  @widget(new SliderWidget(5, 20, 0.5))
  lengthCm: number = 10

  @input
  @hint("Spacing between tick marks (cm).")
  @widget(new SliderWidget(0.1, 2, 0.1))
  tickSpacingCm: number = 0.5

  @input
  @hint("Position of the red line (cm). 2.5 cm = 1 inch, the NHTSA movement limit.")
  @widget(new SliderWidget(0.5, 10, 0.1))
  redLineAtCm: number = 2.5

  @input
  @hint("Red plate width along the ruler (cm).")
  @widget(new SliderWidget(0.1, 1.5, 0.05))
  redLineWidthCm: number = 0.6

  @input
  @hint("Red plate height (cm). It stands upright so the edge pin visibly passes it.")
  @widget(new SliderWidget(0.5, 6, 0.1))
  redPlateHeightCm: number = 3

  @input("vec4", "{0.42,0.45,0.52,0.9}")
  @widget(new ColorWidget())
  @hint("Ruler strip color: mid gray so the white numbers stand out (never black — additive display).")
  stripColor: vec4 = new vec4(0.42, 0.45, 0.52, 0.9)

  @input("vec4", "{1,1,1,1}")
  @widget(new ColorWidget())
  @hint("Tick mark color.")
  tickColor: vec4 = new vec4(1, 1, 1, 1)

  @input("vec4", "{1,0.2,0.2,1}")
  @widget(new ColorWidget())
  @hint("Red line color.")
  redLineColor: vec4 = new vec4(1, 0.2, 0.2, 1)


  @input
  @hint("Label just above the red line.")
  redLineLabel: string = "1 in / 2.5 cm"

  @input
  @hint("Tick number size (Text.size units; 35 gives ~0.8 cm tall digits, 31 ~0.7 cm). 0.8 cm still leaves a gap between numbers 1 cm apart.")
  @widget(new SliderWidget(10, 90, 1))
  labelSize: number = 35

  @input
  @hint("Red-line label size (~61 gives ~1.0 cm tall capitals/digits).")
  @widget(new SliderWidget(10, 90, 1))
  redLabelSize: number = 61

  @input
  @hint("Tilt (degrees) of the standing labels toward the kneeling parent's eyes (0 = upright, 90 = flat).")
  @widget(new SliderWidget(0, 90, 1))
  labelTiltDeg: number = 32

  @input
  @hint("Turn (degrees, about the vertical) of the labels toward the kneeling parent, who kneels in front of the seat ~35 deg off its side axis.")
  @widget(new SliderWidget(-90, 90, 1))
  labelYawDeg: number = 33

  @input
  @hint("Where the tick numbers stand across the strip (cm, ruler z; -1.2 = the strip's back edge, under the ticks).")
  @widget(new SliderWidget(-1.5, 1.5, 0.1))
  numberZCm: number = -1.2

  @input
  @hint("How far (cm) the \"0\" number moves toward the parent and to their left so the ghost line, edge pin and seat corner at 0 do not cover it. The other numbers stay under their ticks.")
  @widget(new SliderWidget(0, 1.5, 0.05))
  zeroLabelNudgeCm: number = 0.4

  @input
  @hint("Red leader line thickness (cm) from the label to the top of the red plate.")
  @widget(new SliderWidget(0.02, 0.3, 0.01))
  leaderCm: number = 0.08

  @input
  @hint("Where (cm along the ruler) the red-plate label starts; keep it past the 4 cm demo travel.")
  @widget(new SliderWidget(0, 10, 0.1))
  labelStartCm: number = 4.8

  @ui.group_end

  private stripMat!: Material
  private tickMat!: Material
  private redMat!: Material
  private redLine!: SceneObject
  private numberLabels: Text[] = []
  private numberObjs: SceneObject[] = []
  /** Where each number stands (under its tick); the "0" is drawn nudged left of this spot. */
  private numberHomes: vec3[] = []
  private redLabel!: Text
  private stripOpacity: number = 1
  private numbersOpacity: number = 1
  private plateOpacity: number = 1

  onAwake(): void {
    if (!this.boxMesh || !this.overlayMaterial) {
      print("BeltPathRulerUI: required @input not wired.")
      return
    }
    this.stripMat = this.overlayMaterial.clone()
    this.tickMat = this.overlayMaterial.clone()
    this.redMat = this.overlayMaterial.clone()
    this.build()
    this.refresh()
    this.createEvent("UpdateEvent").bind(() => this.billboardNumbers())
  }

  /** 0..1 multiplier on every ruler part. */
  setOpacity(a: number): void {
    this.stripOpacity = this.numbersOpacity = this.plateOpacity = clamp01(a)
    this.refresh()
  }

  setStripOpacity(a: number): void { this.stripOpacity = clamp01(a); this.refresh() }
  setNumbersOpacity(a: number): void { this.numbersOpacity = clamp01(a); this.refresh() }
  setPlateOpacity(a: number): void { this.plateOpacity = clamp01(a); this.refresh() }

  /** Lowest opacity of the three groups (1 = the whole ruler has faded in). */
  getOpacity(): number { return Math.min(this.stripOpacity, this.numbersOpacity, this.plateOpacity) }

  /** Turns each number about the vertical only so it faces the parent (yaw billboard; tilt stays). */
  private billboardNumbers(): void {
    if (!this.sceneObject.isEnabledInHierarchy || this.numberObjs.length === 0) return
    const cam = BeltPathRulerUI.cameraWorld()
    if (!cam) return
    const inv = this.getTransform().getInvertedWorldTransform()
    const c = inv.multiplyPoint(cam)
    const tilt = quat.angleAxis(-this.labelTiltDeg * Math.PI / 180, vec3.right())
    this.numberObjs.forEach((so, i) => {
      const p = this.numberHomes[i]
      const yaw = Math.atan2(c.x - p.x, c.z - p.z)
      const turn = quat.angleAxis(yaw, vec3.up())
      so.getTransform().setLocalRotation(turn.multiply(tilt))
      // "0" (index 0): nudged toward the parent and to their left (the facing label's own +Z and -X).
      // Left alone would push it inside the seat's corner; toward the parent brings it back out.
      const n = this.zeroLabelNudgeCm
      const nudge = i === 0 ? turn.multiplyVec3(new vec3(-n, 0, n)) : vec3.zero()
      so.getTransform().setLocalPosition(p.add(nudge))
    })
  }

  private static camObj: SceneObject | null = null
  private static cameraWorld(): vec3 | null {
    if (!BeltPathRulerUI.camObj) {
      const find = (so: SceneObject): SceneObject | null => {
        if (so.getComponent("Component.Camera") && so.getComponent("Component.DeviceTracking")) return so
        for (let i = 0; i < so.getChildrenCount(); i++) { const r = find(so.getChild(i)); if (r) return r }
        return null
      }
      for (let i = 0; i < global.scene.getRootObjectsCount() && !BeltPathRulerUI.camObj; i++) {
        BeltPathRulerUI.camObj = find(global.scene.getRootObject(i))
      }
    }
    return BeltPathRulerUI.camObj ? BeltPathRulerUI.camObj.getTransform().getWorldPosition() : null
  }

  private build(): void {
    const L = this.lengthCm
    // Strip: lies flat, ticks along its back edge (toward the seat), labels in front.
    this.box("RulerStrip", new vec3(L / 2, 0, 0), new vec3(L + 0.6, 0.15, 3.0), this.stripMat, 1)
    const n = Math.round(L / this.tickSpacingCm)
    for (let i = 0; i <= n; i++) {
      const x = i * this.tickSpacingCm
      const whole = Math.abs(x - Math.round(x)) < 1e-3
      const len = whole ? 1.4 : 0.8
      this.box("RulerTick", new vec3(x, 0.12, -1.5 + len / 2), new vec3(0.08, 0.06, len), this.tickMat, 2)
    }
    // Upright red plate at 2.5 cm: 0.6 cm wide, 3 cm tall, standing in the ruler's center plane
    // (the same vertical plane as the seat's edge pin, which passes it when the seat moves).
    const ph = this.redPlateHeightCm
    this.redLine = this.box("RulerRedLine", new vec3(this.redLineAtCm, 0.1 + ph / 2, 0),
      new vec3(this.redLineWidthCm, ph, 0.25), this.redMat, 3)

    // Numbers stand on the strip's back edge, right under their ticks (no view-specific shift).
    for (const v of [0, 1, 2, 3, 4, 5, L]) {
      const t = this.label(String(v), v, this.numberZCm, this.labelSize, HorizontalAlignment.Center)
      this.numberLabels.push(t)
      this.numberObjs.push(t.getSceneObject())
      this.numberHomes.push(t.getSceneObject().getTransform().getLocalPosition())
      if (v === 0) {
        // The "0" stands at the seat's corner, where the seat body, ghost line and pin meet: draw
        // it over them so it stays readable.
        t.depthTest = false
        t.setRenderOrder(60)
      }
    }
    // Beside the top of the red plate, starting just past the pin's 4 cm travel so it never
    // covers the pin or the seat edge; a thin red leader ties it to the plate top.
    const labelY = this.redPlateHeightCm - 1.2
    this.redLabel = this.label(this.redLineLabel, this.labelStartCm, -1.6, this.redLabelSize, HorizontalAlignment.Left, labelY)
    const lt = this.redLabel.getSceneObject().getTransform()
    const labelLeftMid = lt.getLocalPosition().add(lt.getLocalRotation().multiplyVec3(new vec3(-0.1, this.redLabelSize / 44 * 0.45, 0)))
    const plateTop = new vec3(this.redLineAtCm, 0.1 + ph, 0)
    const d = labelLeftMid.sub(plateTop)
    const leader = this.box("RulerRedLeader", plateTop.add(d.uniformScale(0.5)),
      new vec3(this.leaderCm, this.leaderCm, d.length), this.redMat, 3)
    leader.getTransform().setLocalRotation(quat.lookAt(d.normalize(), vec3.up()))
  }

  // Transparent parts never write depth, so draw order is set explicitly:
  // strip (1) under ticks (2) under the red line (3) under labels (4).
  private box(name: string, pos: vec3, scale: vec3, mat: Material, order: number): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(pos)
    so.getTransform().setLocalScale(scale)
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = this.boxMesh
    rmv.mainMaterial = mat
    rmv.setRenderOrder(order)
    return so
  }

  private label(s: string, x: number, z: number, size: number, align: HorizontalAlignment, y: number = 0.1): Text {
    const so = global.scene.createSceneObject("RulerLabel")
    so.setParent(this.sceneObject)
    // Stands on the strip edge, leaned back toward the kneeling parent's eyes (flat text is
    // foreshortened to about half its height from 55 cm). The text's bottom edge rests on the strip.
    const tilt = this.labelTiltDeg * Math.PI / 180
    const h = size / 44 // em height in cm
    so.getTransform().setLocalPosition(new vec3(x, y, z))
    const yaw = this.labelYawDeg * Math.PI / 180
    so.getTransform().setLocalRotation(
      quat.angleAxis(yaw, vec3.up()).multiply(quat.angleAxis(-tilt, vec3.right())))
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.size = size
    ;(t as Text & { weight?: number }).weight = 600
    t.depthTest = true
    t.setRenderOrder(4)
    t.horizontalAlignment = align
    t.verticalAlignment = VerticalAlignment.Bottom
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = align === HorizontalAlignment.Left
      ? Rect.create(0, 12, 0, h)
      : Rect.create(-1.5, 1.5, 0, h)
    return t
  }

  private refresh(): void {
    if (!this.stripMat) return
    const s = this.stripColor
    const k = this.tickColor
    const r = this.redLineColor
    const a = this.stripOpacity
    this.stripMat.mainPass.baseColor = new vec4(s.x, s.y, s.z, s.w * a)
    this.tickMat.mainPass.baseColor = new vec4(k.x, k.y, k.z, k.w * a)
    this.redMat.mainPass.baseColor = new vec4(r.x, r.y, r.z, r.w * this.plateOpacity)
    for (const t of this.numberLabels) t.textFill.color = new vec4(1, 1, 1, this.numbersOpacity)
    if (this.redLabel) this.redLabel.textFill.color = new vec4(1, 1, 1, this.plateOpacity)
  }
}

function clamp01(a: number): number { return Math.max(0, Math.min(1, a)) }
