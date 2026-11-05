/**
 * Done criterion 1 — from the kneeling eye pose (75 cm above the car floor, ~55 cm from the
 * belt path, in front of the seat ~35 deg off its side axis) the belt path band, the 10 cm
 * ruler, the 2.5 cm red plate, the ghost outline and the seat-edge pin are all in one view.
 *
 * "View" = the device camera's screen (the SPECS render area). Every seat/ruler point comes
 * from LIVE scene bounds (exact oriented mesh corners), never from hard-coded seat sizes:
 *  - seat side edge at the belt path = ghost outline's front-right edge at the band's height,
 *    and it sits in the middle 70% of the render area;
 *  - the ruler's own bounds, grown by 3 cm on every side in the ruler's frame, are on screen;
 *  - the band may be partly outside the view (brief Risks), but its end at the ruler is in view.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {
  bp, camera, carLocalBounds, check, checkKneelingEyePose, fmt, ghostSideEdgeWorld, log, meshCorners,
  obj, seatEdgeAtBeltPathCar, waitForLensReady,
} from "./BeltPathLeafHelpers"

function inScreen(world: vec3): boolean {
  const cam = camera()
  if (cam.getTransform().getInvertedWorldTransform().multiplyPoint(world).z >= 0) return false
  const s = cam.worldSpaceToScreenSpace(world)
  return s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1
}

function fractionInScreen(label: string, pts: vec3[]): number {
  let n = 0
  for (const p of pts) if (inScreen(p)) n++
  log("screen " + label + ": " + n + "/" + pts.length + " points inside")
  return pts.length ? n / pts.length : 0
}

@component
export class BeltPathC1KneelViewScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const api = bp()
    const cam = camera()
    log("device camera: aspect " + cam.aspect.toFixed(3) + ", fov " + (cam.fov * 180 / Math.PI).toFixed(1) + " deg")
    check(api.getStateName() === "start", "state is start (got " + api.getStateName() + ")")
    checkKneelingEyePose()
    check(api.getOverlayOpacity() >= 0.99, "overlay faded in (opacity " + api.getOverlayOpacity().toFixed(3) + ")")
    check(!api.isOffViewCueVisible(), "off-view arrow not shown (belt path is in view)")

    // Seat side edge at the belt path, from live bounds.
    const edgeCar = seatEdgeAtBeltPathCar()
    const edgeW = obj("BeltPath").getTransform().getWorldTransform().multiplyPoint(edgeCar)
    const se = cam.worldSpaceToScreenSpace(edgeW)
    log("seat side edge at the belt path car-local " + fmt(edgeCar) + " -> screen (" + se.x.toFixed(3) + ", " + se.y.toFixed(3) + ")")
    check(se.x >= 0.15 && se.x <= 0.85 && se.y >= 0.15 && se.y <= 0.85, "seat side edge in the middle of the view")

    // Ruler: its own bounds in the ruler frame, grown by 3 cm, fully on screen.
    const rT = obj("Ruler").getTransform()
    const rInv = rT.getInvertedWorldTransform()
    let mn = new vec3(1e9, 1e9, 1e9), mx = new vec3(-1e9, -1e9, -1e9)
    for (const w of meshCorners("Ruler")) {
      const p = rInv.multiplyPoint(w)
      mn = new vec3(Math.min(mn.x, p.x), Math.min(mn.y, p.y), Math.min(mn.z, p.z))
      mx = new vec3(Math.max(mx.x, p.x), Math.max(mx.y, p.y), Math.max(mx.z, p.z))
    }
    log("ruler-local bounds " + fmt(mn) + ".." + fmt(mx))
    const rW = rT.getWorldTransform()
    const margin: vec3[] = []
    for (const x of [mn.x - 3, mx.x + 3]) for (const z of [mn.z - 3, mx.z + 3]) for (const y of [mn.y, mx.y]) margin.push(rW.multiplyPoint(new vec3(x, y, z)))
    check(fractionInScreen("Ruler + 3 cm margin", margin) === 1, "whole ruler with ~3 cm margin on screen")
    check(fractionInScreen("Ruler parts", meshCorners("Ruler")) === 1, "every ruler part on screen")
    check(fractionInScreen("Red plate", meshCorners("RulerRedLine")) === 1, "2.5 cm red plate on screen")
    // Review 2 item 7: the ruler lies within the central 70% of the view width.
    let minX = 1e9, maxX = -1e9
    for (const w of meshCorners("Ruler")) {
      const sx = cam.worldSpaceToScreenSpace(w).x
      minX = Math.min(minX, sx)
      maxX = Math.max(maxX, sx)
    }
    log("ruler screen x " + minX.toFixed(3) + ".." + maxX.toFixed(3))
    check(minX >= 0.15 && maxX <= 0.85, "ruler within the central 70% of the view width (x " + minX.toFixed(3) + ".." + maxX.toFixed(3) + ")")

    // Ghost outline edge (ruler zero) and the seat-edge pin.
    check(fractionInScreen("Ghost front-right edge", ghostSideEdgeWorld(10)) === 1, "ghost edge at the ruler zero on screen")
    check(fractionInScreen("Edge pin", meshCorners("EdgePin")) === 1, "seat-edge pin on screen")
    const pin = carLocalBounds("EdgePin")
    log("edge pin car-local x " + pin.min.x.toFixed(2) + ".." + pin.max.x.toFixed(2) + " (seat edge x " + edgeCar.x.toFixed(2) + ")")

    // Band: may be partly outside, but its end at the ruler must be on screen.
    const bandFrontRight = meshCorners("BandFront").filter((_, i) => (i & 1) === 1)
    check(fractionInScreen("BandFront end at the ruler", bandFrontRight) === 1, "band end at the ruler on screen")
    log("C1 done")
  }
}
