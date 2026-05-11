import { Static, Type } from "@sinclair/typebox"

export const SecurityRuleSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  category: Type.Union([
    Type.Literal("port"),
    Type.Literal("identity"),
    Type.Literal("service"),
    Type.Literal("hardware"),
  ]),
  impact: Type.Number(), // Points added to threat score
  criteria: Type.Object({
    field: Type.Union([
      Type.Literal("port"),
      Type.Literal("hostname"),
      Type.Literal("vendor"),
      Type.Literal("isRand"),
      Type.Literal("isPrivate"),
      Type.Literal("protocol"),
    ]),
    operator: Type.Union([
      Type.Literal("equals"),
      Type.Literal("contains"),
      Type.Literal("exists"),
      Type.Literal("in_list"),
    ]),
    value: Type.Any(),
  }),
  remediation: Type.Optional(Type.String()), // Advice on how to fix it
})
