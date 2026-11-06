import { scenariosIndex } from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import { ScenarioMetadata } from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import { BeltPathC1KneelViewScenario } from "./BeltPathC1KneelViewScenario"
import { BeltPathC2DragLimitScenario } from "./BeltPathC2DragLimitScenario"
import { BeltPathC3AnswerCardsScenario } from "./BeltPathC3AnswerCardsScenario"
import { BeltPathC4CheckAgainScenario } from "./BeltPathC4CheckAgainScenario"
import { BeltPathC5DemoToggleScenario } from "./BeltPathC5DemoToggleScenario"
import { BeltPathC6AlignZeroScenario } from "./BeltPathC6AlignZeroScenario"
import { BeltPathC7DistanceModeScenario } from "./BeltPathC7DistanceModeScenario"
import { BeltPathC8ShakeHintScenario } from "./BeltPathC8ShakeHintScenario"
import { BeltPathC9BuckleStepScenario } from "./BeltPathC9BuckleStepScenario"
import { BeltPathC10OffViewArrowScenario } from "./BeltPathC10OffViewArrowScenario"
import { BeltPathC11NeverMeasuresScenario } from "./BeltPathC11NeverMeasuresScenario"
import { BeltPathC12ReduceMotionScenario } from "./BeltPathC12ReduceMotionScenario"
import { BeltPathC14TightDuringSpringbackScenario } from "./BeltPathC14TightDuringSpringbackScenario"
import { BeltPathC15CardTakesPinchScenario } from "./BeltPathC15CardTakesPinchScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    { id: "beltpath-c1-kneel-view", typename: BeltPathC1KneelViewScenario.getTypeName() },
    { id: "beltpath-c2-drag-limit", typename: BeltPathC2DragLimitScenario.getTypeName() },
    { id: "beltpath-c3-answer-cards", typename: BeltPathC3AnswerCardsScenario.getTypeName() },
    { id: "beltpath-c4-check-again", typename: BeltPathC4CheckAgainScenario.getTypeName() },
    { id: "beltpath-c5-demo-toggle", typename: BeltPathC5DemoToggleScenario.getTypeName() },
    { id: "beltpath-c6-align-zero", typename: BeltPathC6AlignZeroScenario.getTypeName() },
    { id: "beltpath-c7-distance-mode", typename: BeltPathC7DistanceModeScenario.getTypeName() },
    { id: "beltpath-c8-shake-hint", typename: BeltPathC8ShakeHintScenario.getTypeName() },
    { id: "beltpath-c9-buckle-step", typename: BeltPathC9BuckleStepScenario.getTypeName() },
    { id: "beltpath-c10-offview-arrow", typename: BeltPathC10OffViewArrowScenario.getTypeName() },
    { id: "beltpath-c11-never-measures", typename: BeltPathC11NeverMeasuresScenario.getTypeName() },
    { id: "beltpath-c12-reduce-motion", typename: BeltPathC12ReduceMotionScenario.getTypeName() },
    { id: "beltpath-c14-tight-during-springback", typename: BeltPathC14TightDuringSpringbackScenario.getTypeName() },
    { id: "beltpath-c15-card-takes-pinch", typename: BeltPathC15CardTakesPinchScenario.getTypeName() },
  ]
}
