import { CertificateDetailsSchema } from "./certificate.js"
import { Type, Static } from "@sinclair/typebox"

export const PortStatusSchema = Type.Object({
  port: Type.Number(),
  isOpen: Type.Boolean(),
  protocol: Type.Optional(Type.String()),
  service: Type.Optional(Type.String()),
  certificate: Type.Optional(CertificateDetailsSchema),
})
