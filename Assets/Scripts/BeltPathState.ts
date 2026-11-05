/**
 * BeltPathState — the single owner of the check's flow state (pure logic, no scene access).
 *
 * Phases:
 *   start     — band, ruler, ghost shown; no buttons, no card.
 *   grabbing  — the user is shaking the seat; buttons and card hidden.
 *   answering — seat released; the two answer buttons are shown.
 *   result    — one result card is shown (crossed or stayed).
 *
 * The Lens never judges the movement: the result is whatever the parent answered.
 */
import { CardKind, DemoMode } from "./BeltPathSceneContracts"

export type BeltPathPhase = "start" | "grabbing" | "answering" | "result"

export class BeltPathState {
  phase: BeltPathPhase = "start"
  mode: DemoMode = "Loose"
  card: CardKind = "none"
  /** Largest |offset| reached during the most recent grab, in cm. */
  peakOffsetCm: number = 0

  beginGrab(): void {
    this.phase = "grabbing"
    this.card = "none"
    this.peakOffsetCm = 0
  }

  release(): void {
    if (this.phase === "grabbing") this.phase = "answering"
  }

  answer(crossed: boolean): void {
    if (this.phase !== "answering") return
    this.phase = "result"
    this.card = crossed ? "crossed" : "stayed"
  }

  restart(): void {
    this.phase = "start"
    this.card = "none"
    this.peakOffsetCm = 0
  }

  toggleMode(): DemoMode {
    this.mode = this.mode === "Loose" ? "Tight" : "Loose"
    return this.mode
  }
}
