/**
 * BeltPathLeafHelpers — shared helpers for the BeltPath LEAF scenarios.
 *
 * Reads Lens state through the test API published by BeltPathMain on global.beltPath,
 * drives interactions through LEAF's scripted SIK interactor (real Interactable events),
 * and measures geometry in the car's local frame (the "BeltPath" root).
 * Test-only: never changes the Lens's behavior scripts.
 */
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { findInteractablesByName } from "Leaf.lspkg/Interactors/InteractableUtils"
import { findSceneObjectByName, sleep } from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

export const TAG = "[BeltPathLeaf]"

export function log(msg: string): void {
  print(TAG + " " + msg)
}

/** Throws with the measured values so the LEAF FAILED line is self-explanatory. */
export function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(TAG + " CHECK FAILED: " + msg)
  log("ok: " + msg)
}

export function bp(): any {
  const api = (global as any).beltPath
  if (!api) throw new Error(TAG + " global.beltPath is missing (BeltPathMain not initialized)")
  return api
}

export async function waitFor(pred: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const start = getTime()
  while (!pred()) {
    if ((getTime() - start) * 1000 > timeoutMs) {
      throw new Error(TAG + " timed out after " + timeoutMs + " ms waiting for: " + what)
    }
    await sleep(33)
  }
}

/**
 * Waits until every animation has settled (BeltPathMain.isMotionSettled: no tween running, seat at
 * rest). Motion stays on in the tests; this is what keeps them from racing the animations.
 */
export async function waitForSettled(what: string = "animations settled", timeoutMs: number = 4000): Promise<void> {
  await waitFor(() => bp().isMotionSettled(), timeoutMs, what)
}

/** Waits until the Lens is up and the start fade has finished (no align pinch). */
export async function waitForLensUp(): Promise<void> {
  await sleep(1500)
  await waitFor(() => !!(global as any).beltPath, 5000, "global.beltPath")
  await waitForSettled("start fade settled")
  await waitFor(() => bp().getOverlayOpacity() >= 0.99, 3000, "overlay fade-in to 1")
}

/** Real align pinch on the seat edge (AlignTarget Interactable), if the ruler is not aligned yet. */
export async function ensureAligned(): Promise<void> {
  const api = bp()
  if (api.isAligned()) return
  log("real trigger AlignTarget (align the ruler 0 to the seat edge)")
  await new DefaultLeafInteractor().trigger(interactable("AlignTarget"))
  await waitFor(() => api.isAligned(), 2000, "ruler aligned after the edge pinch")
  await waitForSettled("stagger after the align pinch settled")
}

/** Lens up, start fade done, and the one-time align pinch done (every scenario but C6 starts here). */
export async function waitForLensReady(): Promise<void> {
  await waitForLensUp()
  await ensureAligned()
}

export function obj(name: string): SceneObject {
  const so = findSceneObjectByName(name)
  if (!so) throw new Error(TAG + " scene object not found: " + name)
  return so
}

export function interactable(name: string): any {
  const it = findInteractablesByName(name, undefined, true)[0]
  if (!it) throw new Error(TAG + " enabled Interactable not found: " + name)
  return it
}

export function fmt(v: vec3): string {
  return "(" + v.x.toFixed(2) + ", " + v.y.toFixed(2) + ", " + v.z.toFixed(2) + ")"
}

// ── Car-local geometry ─────────────────────────────────────────────

export function toCarLocal(world: vec3): vec3 {
  return obj("BeltPath").getTransform().getInvertedWorldTransform().multiplyPoint(world)
}

export function carLocalOf(name: string): vec3 {
  return toCarLocal(obj(name).getTransform().getWorldPosition())
}

// ── Camera visibility ──────────────────────────────────────────────

export function camera(): Camera {
  return WorldCameraFinderProvider.getInstance().getComponent()
}

function collectVisuals(so: SceneObject, out: RenderMeshVisual[]): void {
  const n = so.getComponentCount("Component.RenderMeshVisual")
  for (let i = 0; i < n; i++) {
    out.push(so.getComponentByIndex("Component.RenderMeshVisual", i) as RenderMeshVisual)
  }
  for (let i = 0; i < so.getChildrenCount(); i++) collectVisuals(so.getChild(i), out)
}

export type ViewReport = {
  name: string
  enabled: boolean
  visualCount: number
  centerScreen: vec2
  centerInFront: boolean
  centerInView: boolean
  sphereVisible: boolean
  cornersInView: number
  cornersTotal: number
}

function inScreen(p: vec2): boolean {
  return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
}

/**
 * Projects an object's combined world AABB (all RenderMeshVisuals in its subtree) into
 * the device camera. Occlusion by other geometry is not checked here; the capture covers that.
 */
export function viewReport(name: string, sphereRadiusCm: number): ViewReport {
  const so = obj(name)
  const cam = camera()
  const inv = cam.getTransform().getInvertedWorldTransform()
  const visuals: RenderMeshVisual[] = []
  collectVisuals(so, visuals)
  let min = new vec3(1e9, 1e9, 1e9)
  let max = new vec3(-1e9, -1e9, -1e9)
  let any = false
  for (const v of visuals) {
    if (!v.enabled || !v.getSceneObject().isEnabledInHierarchy) continue
    const a = v.worldAabbMin()
    const b = v.worldAabbMax()
    min = new vec3(Math.min(min.x, a.x), Math.min(min.y, a.y), Math.min(min.z, a.z))
    max = new vec3(Math.max(max.x, b.x), Math.max(max.y, b.y), Math.max(max.z, b.z))
    any = true
  }
  if (!any) {
    const p = so.getTransform().getWorldPosition()
    min = p
    max = p
  }
  const center = min.add(max).uniformScale(0.5)
  const centerScreen = cam.worldSpaceToScreenSpace(center)
  const centerInFront = inv.multiplyPoint(center).z < 0
  let cornersInView = 0
  for (let i = 0; i < 8; i++) {
    const c = new vec3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z)
    if (inv.multiplyPoint(c).z < 0 && inScreen(cam.worldSpaceToScreenSpace(c))) cornersInView++
  }
  const r: ViewReport = {
    name,
    enabled: so.isEnabledInHierarchy,
    visualCount: visuals.length,
    centerScreen,
    centerInFront,
    centerInView: centerInFront && inScreen(centerScreen),
    sphereVisible: cam.isSphereVisible(center, sphereRadiusCm),
    cornersInView,
    cornersTotal: 8,
  }
  log("view " + name + ": enabled=" + r.enabled + " visuals=" + r.visualCount
    + " centerScreen=(" + centerScreen.x.toFixed(3) + ", " + centerScreen.y.toFixed(3) + ")"
    + " inFront=" + centerInFront + " centerInView=" + r.centerInView
    + " sphereVisible(r=" + sphereRadiusCm + ")=" + r.sphereVisible
    + " corners=" + cornersInView + "/8 aabb=" + fmt(min) + ".." + fmt(max))
  return r
}

/**
 * Checks the device camera is at the kneeling eye pose: eye ~75 cm above the car floor, ~55 cm
 * from the belt path at the seat's side edge, kneeling in front of the seat ~35 deg off its side
 * axis (owner design note). The seat side edge at the belt path is read from the live scene:
 * the ghost outline's front-right edge at the band's height (see seatEdgeAtBeltPathCar).
 */
export function checkKneelingEyePose(): void {
  const eye = toCarLocal(camera().getTransform().getWorldPosition())
  const edge = seatEdgeAtBeltPathCar()
  const dist = eye.distance(edge)
  const offAxisDeg = Math.atan2(eye.x - edge.x, eye.z - edge.z) * 180 / Math.PI
  log("camera car-local " + fmt(eye) + ", seat edge at belt path " + fmt(edge)
    + ", eye->belt path at the edge " + dist.toFixed(1) + " cm, eye height " + eye.y.toFixed(1)
    + " cm, off the side axis " + offAxisDeg.toFixed(1) + " deg")
  check(Math.abs(eye.y - 75) <= 3, "eye height ~75 cm above car floor (measured " + eye.y.toFixed(1) + ")")
  check(Math.abs(dist - 55) <= 3, "eye ~55 cm from the belt path (measured " + dist.toFixed(1) + ")")
  check(eye.z > edge.z && Math.abs(offAxisDeg - 35) <= 5, "kneeling in front, ~35 deg off the side axis (" + offAxisDeg.toFixed(1) + ")")
}

// ── Visible text ───────────────────────────────────────────────────

function collectTexts(so: SceneObject, out: string[]): void {
  if (!so.isEnabledInHierarchy) return
  const n = so.getComponentCount("Component.Text")
  for (let i = 0; i < n; i++) {
    const t = so.getComponentByIndex("Component.Text", i) as Text
    if (t.enabled && t.text && t.text.length > 0) out.push(t.text)
  }
  for (let i = 0; i < so.getChildrenCount(); i++) collectTexts(so.getChild(i), out)
}

/** Every string currently shown by an enabled Text component anywhere in the scene. */
export function visibleTexts(): string[] {
  const out: string[] = []
  for (let i = 0; i < global.scene.getRootObjectsCount(); i++) collectTexts(global.scene.getRootObject(i), out)
  return out
}

/** Whole-word "pass"/"safe"/"approved" check; the organization name "Safe Kids Worldwide" is allowed. */
export function forbiddenWordHits(texts: string[]): string[] {
  const hits: string[] = []
  for (const s of texts) {
    const cleaned = s.replace(/Safe Kids Worldwide/g, "")
    const m = cleaned.match(/\b(pass|safe|approved)\b/gi)
    if (m) hits.push(m.join(",") + " in \"" + s + "\"")
  }
  return hits
}

// ── Real interactions ──────────────────────────────────────────────

/** Default drag speed (cm/s) along world +X: 1.2 s reaches ~14 cm, far past the 4 cm cap. */
export const DRAG_SPEED_CM_S = 12

/**
 * Real grab-and-drag of the car seat through its SIK Interactable on SeatGrabHandle.
 * The interactor ray moves along world +X (toward the ruler) by distance = speed x elapsed time,
 * not a fixed step per frame, so a slow preview (low fps) still drags as far. LEAF adds its drag
 * vector on every drag update; our listener (added first, so it runs first) sets that vector to
 * the distance due since the previous update.
 */
export async function realDragSeat(ix: DefaultLeafInteractor, speedCmPerSec: number, durationMs: number): Promise<void> {
  const seat = interactable("SeatGrabHandle")
  log("real drag SeatGrabHandle: " + speedCmPerSec + " cm/s for " + durationMs + " ms (time-based)")
  const step = new vec3(0, 0, 0)
  let t0 = -1
  let travelled = 0
  let updates = 0
  const unsub = seat.onDragUpdate.add(() => {
    const now = getTime()
    if (t0 < 0) t0 = now
    const due = speedCmPerSec * (now - t0)
    step.x = due - travelled
    travelled = due
    updates++
  })
  try {
    await ix.drag(seat, step, durationMs)
  } finally {
    unsub()
  }
  log("drag done: " + updates + " updates, ray moved " + travelled.toFixed(2) + " cm")
  await sleep(100)
  await waitForSettled("seat spring-back and button arrival settled")
}

export async function realTap(ix: DefaultLeafInteractor, name: string): Promise<void> {
  log("real trigger " + name)
  await ix.trigger(interactable(name))
  await sleep(100)
  await waitForSettled("animations after " + name + " settled")
}

/** Brings the Lens back to the start state in Loose mode (setup only; uses the real buttons when possible). */
export async function resetToStartLoose(ix: DefaultLeafInteractor): Promise<void> {
  const api = bp()
  if (api.getStateName() === "result") await realTap(ix, "CheckAgainButton")
  if (api.getMode() !== "Loose") await realTap(ix, "DemoModeToggle")
  check(api.getStateName() === "start", "setup: state is start (got " + api.getStateName() + ")")
  check(api.getMode() === "Loose", "setup: mode is Loose (got " + api.getMode() + ")")
}

/** Real drag + release in the current mode; returns {peak}. Waits for the answer buttons. */
export async function shakeAndRelease(ix: DefaultLeafInteractor): Promise<{ peak: number }> {
  await realDragSeat(ix, DRAG_SPEED_CM_S, 1200)
  const api = bp()
  await waitFor(() => api.getStateName() === "answering", 2000, "state 'answering' after release")
  const peak = api.getPeakOffsetCm()
  log("after release: mode=" + api.getMode() + " peak=" + peak.toFixed(3) + " cm, limit=" + api.getLimitCm()
    + " cm, red plate at " + api.getRedLineCm() + " cm")
  return { peak }
}

// ── Brief view (usable view at 55 cm: 23 cm high x 38 cm wide) ─────

/** Half-angle tangents of the usable view in the brief (independent of the preview panel's shape). */
export const BRIEF_VIEW_TAN_X = 19 / 55
export const BRIEF_VIEW_TAN_Y = 11.5 / 55

/** True if a world point lies inside the brief's usable view of the device camera at its current pose. */
export function inBriefView(world: vec3): boolean {
  const p = camera().getTransform().getInvertedWorldTransform().multiplyPoint(world)
  if (p.z >= 0) return false
  const d = -p.z
  return Math.abs(p.x) / d <= BRIEF_VIEW_TAN_X && Math.abs(p.y) / d <= BRIEF_VIEW_TAN_Y
}

/** Exact oriented-box corners (world) of every enabled RenderMeshVisual under an object. */
export function meshCorners(name: string): vec3[] {
  const visuals: RenderMeshVisual[] = []
  collectVisuals(obj(name), visuals)
  const out: vec3[] = []
  for (const v of visuals) {
    if (!v.enabled || !v.getSceneObject().isEnabledInHierarchy || !v.mesh) continue
    const a = v.mesh.aabbMin
    const b = v.mesh.aabbMax
    const m = v.getSceneObject().getTransform().getWorldTransform()
    for (let i = 0; i < 8; i++) {
      out.push(m.multiplyPoint(new vec3(i & 1 ? b.x : a.x, i & 2 ? b.y : a.y, i & 4 ? b.z : a.z)))
    }
  }
  return out
}

/** Fraction of the given world points inside the brief view; logs the count. */
export function briefViewFraction(label: string, pts: vec3[]): number {
  let n = 0
  for (const p of pts) if (inBriefView(p)) n++
  const f = pts.length ? n / pts.length : 0
  log("brief view " + label + ": " + n + "/" + pts.length + " points inside (" + (f * 100).toFixed(0) + "%)")
  return f
}

/** Points along a world segment (inclusive), for edge-coverage checks. */
export function segmentPoints(a: vec3, b: vec3, steps: number): vec3[] {
  const out: vec3[] = []
  for (let i = 0; i <= steps; i++) out.push(a.add(b.sub(a).uniformScale(i / steps)))
  return out
}

// ── Live seat geometry (no hard-coded seat constants) ──────────────

/** Car-local axis-aligned bounds of every render mesh under an object (exact oriented corners). */
export function carLocalBounds(name: string): { min: vec3, max: vec3 } {
  let min = new vec3(1e9, 1e9, 1e9)
  let max = new vec3(-1e9, -1e9, -1e9)
  for (const w of meshCorners(name)) {
    const p = toCarLocal(w)
    min = new vec3(Math.min(min.x, p.x), Math.min(min.y, p.y), Math.min(min.z, p.z))
    max = new vec3(Math.max(max.x, p.x), Math.max(max.y, p.y), Math.max(max.z, p.z))
  }
  return { min, max }
}

/**
 * The seat side edge at the belt path, car-local: the ghost outline's front-right vertical edge
 * (its max x / max z, i.e. the seat's original side edge at the front face) at the height of the
 * belt path band. Read from live bounds of GhostOutline and BandFront.
 */
export function seatEdgeAtBeltPathCar(): vec3 {
  const g = carLocalBounds("GhostOutline")
  const b = carLocalBounds("BandFront")
  return new vec3(g.max.x, (b.min.y + b.max.y) / 2, g.max.z)
}

/** World points along the ghost's front-right vertical edge (live bounds). */
export function ghostSideEdgeWorld(steps: number): vec3[] {
  const g = carLocalBounds("GhostOutline")
  const car = obj("BeltPath").getTransform().getWorldTransform()
  return segmentPoints(car.multiplyPoint(new vec3(g.max.x, g.min.y, g.max.z)),
    car.multiplyPoint(new vec3(g.max.x, g.max.y, g.max.z)), steps)
}

// ── What a real click would hit ────────────────────────────────────

/**
 * Casts a physics ray from the device camera through the center of a named object (as a mouse
 * click or hand ray aimed at it would) and resolves with the name of the first collider hit and
 * whether that collider belongs to the object. LEAF's scripted interactor targets interactables
 * directly, so this is the check that catches a collider in front of a button.
 */
export function eyeRayFirstHit(name: string): Promise<{ hitName: string, onTarget: boolean }> {
  const target = obj(name)
  const eye = camera().getTransform().getWorldPosition()
  const p = target.getTransform().getWorldPosition()
  const end = eye.add(p.sub(eye).uniformScale(1.5))
  return new Promise((resolve) => {
    Physics.createGlobalProbe().rayCast(eye, end, (hit: RayCastHit) => {
      if (!hit || !hit.collider) { resolve({ hitName: "(nothing)", onTarget: false }); return }
      let so: SceneObject | null = hit.collider.getSceneObject()
      const hitName = so.name
      let onTarget = false
      while (so) { if (so === target) { onTarget = true; break } so = so.getParent() }
      resolve({ hitName, onTarget })
    })
  })
}

/** Checks that a click aimed at the object's center reaches it first. */
export async function checkClickReaches(name: string): Promise<void> {
  const r = await eyeRayFirstHit(name)
  check(r.onTarget, "a click aimed at " + name + " reaches it first (first hit: " + r.hitName + ")")
}
