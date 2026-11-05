/**
 * BeltPathSceneContracts — stable names shared by the scripts and by LEAF tests.
 *
 * Owns: the authored SceneObject names and runtime-created interactable names
 * that tests look up with findSceneObjectByName / findInteractablesByName.
 * Must not: hold state or touch the scene.
 */
export const BeltPathNames = {
  root: "BeltPath",
  carInterior: "CarInterior",
  carSeat: "CarSeat",
  seatGrabHandle: "SeatGrabHandle",
  beltPathBand: "BeltPathBand",
  ghostOutline: "GhostOutline",
  ruler: "Ruler",
  rulerRedLine: "RulerRedLine",
  answerButtons: "AnswerButtons",
  crossedLineButton: "CrossedLineButton",
  stayedInsideButton: "StayedInsideButton",
  resultCard: "ResultCard",
  resultCardBody: "ResultCardBody",
  resultCardFootnote: "ResultCardFootnote",
  resultCardLink: "ResultCardLink",
  checkAgainButton: "CheckAgainButton",
  demoToggle: "DemoToggle",
  demoModeToggleButton: "DemoModeToggle",
  offViewCue: "OffViewCue",
  controller: "BeltPathController",
} as const

/** Demo movement modes (demo-only stand-in for a loose vs tight install). */
export type DemoMode = "Loose" | "Tight"

/** Which result card is showing. */
export type CardKind = "none" | "crossed" | "stayed"
