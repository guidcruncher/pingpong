import { Type, Static } from "@sinclair/typebox"

/**
 * Schema for SecurityAssessment
 * Represents the final risk evaluation for a discovered machine
 */
export const SecurityAssessmentSchema = Type.Object({
  score: Type.Number({
    minimum: 0,
    maximum: 100,
    description: "The calculated threat score from 0 to 100",
  }),
  level: Type.Union(
    [Type.Literal("Low"), Type.Literal("Medium"), Type.Literal("High"), Type.Literal("Critical")],
    { description: "The severity classification based on the score" },
  ),
  triggeredRules: Type.Array(Type.String(), {
    description: "A list of rule descriptions that were matched during analysis",
  }),
  remediations: Type.Array(Type.String(), {
    description: "A list of unique actions to improve the security of the device",
  }),
})
