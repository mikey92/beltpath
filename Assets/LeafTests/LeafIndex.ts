import { scenariosIndex } from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import { ScenarioMetadata } from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import { BeltPathC1KneelViewScenario } from "./BeltPathC1KneelViewScenario"
import { BeltPathC2DragLimitScenario } from "./BeltPathC2DragLimitScenario"
import { BeltPathC3AnswerCardsScenario } from "./BeltPathC3AnswerCardsScenario"
import { BeltPathC4CheckAgainScenario } from "./BeltPathC4CheckAgainScenario"
import { BeltPathC5DemoToggleScenario } from "./BeltPathC5DemoToggleScenario"
import { BeltPathC6AlignZeroScenario } from "./BeltPathC6AlignZeroScenario"

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
  ]
}
