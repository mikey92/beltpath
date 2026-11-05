/**
 * BeltPathOffViewCueUI — a small arrow at the edge of the view pointing toward the car seat.
 *
 * Owns: one arrow icon (Component.Image with a cloned ImageMaterial) that the main script
 * places each frame. It rides in front of the camera, near the edge of the view, rotated so
 * it points toward the target.
 * Public API: showToward(camera, targetWorld), hide(), isShown().
 * Must not: decide when the cue is needed or play the chime — the main script does both.
 */
const ARROW = requireAsset("../Icons/arrow_forward.png") as Texture
const IMAGE_MATERIAL = requireAsset("../Materials/ImageMaterial.mat") as Material

@component
export class BeltPathOffViewCueUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathOffViewCueUI – edge-of-view arrow toward the seat</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Distance in front of the eyes where the arrow floats (cm).")
  @widget(new SliderWidget(30, 120, 1))
  distanceCm: number = 60

  @input
  @hint("How far from the view center the arrow sits (cm at that distance).")
  @widget(new SliderWidget(2, 20, 0.5))
  edgeOffsetCm: number = 9

  @input
  @hint("Arrow size (cm).")
  @widget(new SliderWidget(1, 8, 0.25))
  arrowSizeCm: number = 3

  @input("vec4", "{0.45,0.85,1.0,1}")
  @widget(new ColorWidget())
  @hint("Arrow tint (light blue, matches the belt path band).")
  arrowColor: vec4 = new vec4(0.45, 0.85, 1.0, 1)
  @ui.group_end

  private arrow!: SceneObject
  private shown: boolean = false

  onAwake(): void {
    this.arrow = global.scene.createSceneObject("OffViewArrow")
    this.arrow.setParent(this.sceneObject)
    const img = this.arrow.createComponent("Component.Image") as Image
    const mat = IMAGE_MATERIAL.clone()
    mat.mainPass.baseTex = ARROW
    mat.mainPass.baseColor = this.arrowColor
    mat.mainPass.depthTest = false
    mat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(mat)
    this.arrow.getTransform().setLocalScale(new vec3(this.arrowSizeCm, this.arrowSizeCm, 1))
    this.sceneObject.enabled = false
  }

  /** Place the arrow at the edge of the camera view, pointing toward targetWorld. */
  showToward(cam: Transform, targetWorld: vec3): void {
    const camPos = cam.getWorldPosition()
    const fwd = cam.forward.uniformScale(-1) // camera looks along -forward in Lens Studio
    const right = cam.right
    const up = cam.up
    const to = targetWorld.sub(camPos)
    let dx = to.dot(right)
    let dy = to.dot(up)
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = -1
    const len = Math.sqrt(dx * dx + dy * dy)
    dx /= len
    dy /= len
    const pos = camPos.add(fwd.uniformScale(this.distanceCm))
      .add(right.uniformScale(dx * this.edgeOffsetCm))
      .add(up.uniformScale(dy * this.edgeOffsetCm))
    const t = this.sceneObject.getTransform()
    t.setWorldPosition(pos)
    // Face the camera, then roll so the icon's +X (arrow tip) points toward the target.
    const angle = Math.atan2(dy, dx)
    t.setWorldRotation(cam.getWorldRotation().multiply(quat.angleAxis(angle, vec3.forward())))
    if (!this.shown) {
      this.shown = true
      this.sceneObject.enabled = true
    }
  }

  hide(): void {
    this.shown = false
    this.sceneObject.enabled = false
  }

  isShown(): boolean { return this.shown }
}
