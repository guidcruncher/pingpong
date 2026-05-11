import { Type, Static } from "@sinclair/typebox"

export const DevicePredictionSchema = Type.Object({
  type: Type.String(),
  os: Type.String(),
  hardware: Type.Optional(Type.String()),
})
