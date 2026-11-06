/**
 * Done criterion 14 — switching to Tight during the spring-back (bug-fix regression). In Loose the seat
 * is dragged 4 cm and released; while it is still springing back (isReturning, |offset| > 1 cm) the
 * demo mode is toggled to Tight in the same frame. From then on, sampled every frame for 500 ms, the
 * seat never sits more than the Tight limit (1 cm) from home, and it ends at 0. Loose is restored.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import { sleep } from "Leaf.lspkg/Utils/common/Utils"
import { bp, check, log, resetToStartLoose, waitFor, waitForLensReady, waitForSettled } from "./BeltPathLeafHelpers"

const TIGHT_CM = 1

@component
export class BeltPathC14TightDuringSpringbackScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    await waitForSettled("start settled")
    check(!api.isReduceMotion(), "motion on (the spring-back must take time for this test)")
    try {
      api.debugBeginGrab()
      api.debugDragTo(4)
      await sleep(100)
      check(Math.abs(api.getSeatOffsetCm() - 4) < 0.01, "Loose: seat dragged to 4 cm (" + api.getSeatOffsetCm() + ")")
      api.debugRelease()
      const atRelease: number = api.getSeatOffsetCm()
      check(api.seatShake.isReturning() && Math.abs(atRelease) > TIGHT_CM,
        "springing back, still past the Tight limit (offset " + atRelease.toFixed(3) + " cm)")
      // Same frame: the parent flips the demo toggle to Tight mid spring-back.
      check(api.toggleMode() === "Tight", "toggled to Tight mid spring-back")
      check(api.getLimitCm() === TIGHT_CM, "limit is " + TIGHT_CM + " cm (" + api.getLimitCm() + ")")
      let worst = Math.abs(api.getSeatOffsetCm())
      let samples = 1
      const t0 = getTime()
      while ((getTime() - t0) * 1000 < 500) {
        await sleep(16)
        worst = Math.max(worst, Math.abs(api.getSeatOffsetCm()))
        samples++
      }
      log("500 ms after the toggle: " + samples + " samples, worst |offset| " + worst.toFixed(3) + " cm")
      check(worst <= TIGHT_CM + 1e-4, "|offset| <= " + TIGHT_CM + " cm the whole time (worst " + worst.toFixed(3) + ")")
      await waitFor(() => !api.seatShake.isReturning(), 2000, "spring-back done")
      check(api.getSeatOffsetCm() === 0, "seat ends at 0 (" + api.getSeatOffsetCm() + ")")
      await waitFor(() => api.getStateName() === "answering", 2000, "answering after the release")
      await waitForSettled("buttons arrived")
      api.pressStayedInside()
      await waitForSettled("card arrived")
      api.pressCheckAgain()
      await waitForSettled("start again")
    } finally {
      if (api.getMode() !== "Loose") api.setMode("Loose")
    }
    check(api.getMode() === "Loose" && api.getStateName() === "start", "recovered: Loose, start")
    log("C14 done")
  }
}
