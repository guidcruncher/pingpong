import { Type, Static } from "@sinclair/typebox"

/**
 * Schema for Certificate Identities (Subject/Issuer)
 */
export const CertIdentitySchema = Type.Object({
  commonName: Type.String(),
  organization: Type.Optional(Type.String()),
  organizationalUnit: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
})

/**
 * Main Schema for Certificate Details
 */
export const CertificateDetailsSchema = Type.Object({
  subject: CertIdentitySchema,
  issuer: CertIdentitySchema,
  validFrom: Type.String({ format: "date-time" }),
  validTo: Type.String({ format: "date-time" }),
  fingerprint: Type.String(),
  serialNumber: Type.String(),
  subjectaltname: Type.Optional(Type.String()),
  isSelfSigned: Type.Boolean(),
})
