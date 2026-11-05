/**
 * Done criterion 3 — on release the two buttons appear 10 cm above the belt path;
 * "Crossed the line" shows the red tightening card, "Stayed inside" the inspection-station
 * card, in the same spot; no visible text contains the whole words pass/safe/approved
 * ("Safe Kids Worldwide" allowed). Seat drag and all button presses are real SIK triggers.
 */
import { Scenario } from "Leaf.lspkg/Scenarios/scenario/Scenario"
import { DefaultLeafInteractor } from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {
  bp, carLocalOf, check, checkClickReaches, fmt, forbiddenWordHits, log, obj, realTap, resetToStartLoose,
  shakeAndRelease, visibleTexts, waitForLensReady,
} from "./BeltPathLeafHelpers"

// Card wording from review 2 (agent/review2-fixes.md item 2).
const CROSSED_STEPS = [
  "1  Lock the belt",
  "2  Press the seat down hard",
  "3  Pull the belt tight",
]
const CROSSED_NOTE = "Lock = vehicle belt lock or the seat's lock-off"
const STAYED_LINES = [
  "No problem seen at the belt path.",
  "One check, not a full inspection.",
]
const STAYED_NOTE = "Free check: nhtsa.gov > Car Seats > Inspection, or Safe Kids Worldwide"

@component
export class BeltPathC3AnswerCardsScenario extends Scenario {
  async run(): Promise<void> {
    await waitForLensReady()
    const ix = new DefaultLeafInteractor()
    const api = bp()
    await resetToStartLoose(ix)
    this.checkWords("start")
    check(!api.areAnswerButtonsVisible() && !api.isResultCardVisible(), "start: no buttons, no card")

    // Release -> buttons 10 cm above the belt path
    await shakeAndRelease(ix)
    check(api.areAnswerButtonsVisible(), "buttons visible after release")
    check(obj("CrossedLineButton").isEnabledInHierarchy && obj("StayedInsideButton").isEnabledInHierarchy, "both buttons enabled")
    const target = carLocalOf("BeltPathTarget")
    const answers = carLocalOf("AnswerButtons")
    const crossedBtn = carLocalOf("CrossedLineButton")
    const stayedBtn = carLocalOf("StayedInsideButton")
    log("car-local: target " + fmt(target) + " AnswerButtons " + fmt(answers)
      + " CrossedLineButton " + fmt(crossedBtn) + " StayedInsideButton " + fmt(stayedBtn))
    const dy = answers.y - target.y
    check(Math.abs(dy - 10) <= 1.0, "buttons ~10 cm above the belt path (dy " + dy.toFixed(2) + " cm)")
    check(Math.abs(crossedBtn.y - stayedBtn.y) < 0.5, "buttons side by side (dy " + (crossedBtn.y - stayedBtn.y).toFixed(2) + ")")
    check(crossedBtn.x < stayedBtn.x, "\"Crossed the line\" is the left button")
    this.checkWords("answering")
    // A person clicks by ray: nothing (e.g. the seat's grab box) may sit in front of the buttons.
    await checkClickReaches("CrossedLineButton")
    await checkClickReaches("StayedInsideButton")

    // Crossed -> red card
    await realTap(ix, "CrossedLineButton")
    check(api.getStateName() === "result", "state result after Crossed (got " + api.getStateName() + ")")
    check(api.getCardKind() === "crossed", "card kind crossed (got " + api.getCardKind() + ")")
    check(!api.areAnswerButtonsVisible(), "buttons hidden while the card shows")
    const crossedText: string = api.getCardText()
    log("crossed card text: " + JSON.stringify(crossedText))
    const crossedLines = crossedText.split("\n")
    for (const step of CROSSED_STEPS) check(crossedLines.indexOf(step) >= 0, "crossed card shows step as its own line: " + step)
    check(crossedLines.indexOf(CROSSED_NOTE) >= 0, "crossed card footnote: " + CROSSED_NOTE)
    check(crossedText.indexOf("Check again") >= 0, "crossed card has Check again")
    check(obj("CheckAgainButton").isEnabledInHierarchy, "Check again button enabled")
    await checkClickReaches("CheckAgainButton")
    const cardCrossed = carLocalOf("ResultCard")
    const off1 = cardCrossed.sub(answers)
    log("ResultCard (crossed) car-local " + fmt(cardCrossed) + ", offset from buttons " + fmt(off1))
    check(Math.abs(off1.x) <= 2 && Math.abs(off1.y) <= 2 && Math.abs(off1.z) <= 2, "crossed card in the buttons' spot (offset " + fmt(off1) + ")")
    this.checkWords("crossed card")

    // Stayed -> inspection-station card in the same spot
    await realTap(ix, "CheckAgainButton")
    await shakeAndRelease(ix)
    await realTap(ix, "StayedInsideButton")
    check(api.getCardKind() === "stayed", "card kind stayed (got " + api.getCardKind() + ")")
    const stayedText: string = api.getCardText()
    log("stayed card text: " + JSON.stringify(stayedText))
    const stayedLines = stayedText.split("\n")
    for (const line of STAYED_LINES) check(stayedLines.indexOf(line) >= 0, "stayed card shows as its own line: " + line)
    check(stayedLines.indexOf(STAYED_NOTE) >= 0, "stayed card footnote matches the brief")
    check(stayedText.indexOf("http") < 0, "no raw URL on the stayed card")
    const cardStayed = carLocalOf("ResultCard")
    check(cardStayed.distance(cardCrossed) < 0.01, "both cards in the same spot (moved " + cardStayed.distance(cardCrossed).toFixed(3) + " cm)")
    this.checkWords("stayed card")

    await realTap(ix, "CheckAgainButton")
    log("C3 done")
  }

  private checkWords(when: string): void {
    const texts = visibleTexts()
    log(when + ": " + texts.length + " visible texts: " + JSON.stringify(texts))
    const hits = forbiddenWordHits(texts)
    check(hits.length === 0, when + ": no visible pass/safe/approved words" + (hits.length ? " — " + hits.join(" | ") : ""))
  }
}
