import { Type, Static } from "@sinclair/typebox"

/**
 * Schema for MdnsService
 */
export const MdnsServiceSchema = Type.Object({
  name: Type.String(),
  type: Type.String(),
  protocol: Type.Union([Type.Literal("tcp"), Type.Literal("udp")]),
  port: Type.Number(),
  txt: Type.Record(Type.String(), Type.String()),
})
