import { Type, Static } from "@sinclair/typebox"

/**
 * Schema for VendorInfo
 */
export const VendorInfoSchema = Type.Object({
  macPrefix: Type.String(),
  company: Type.String(),
  address: Type.String(),
  country: Type.String(),
  blockStart: Type.String(),
  blockEnd: Type.String(),
  blockSize: Type.Number(),
  blockType: Type.String(),
  updated: Type.String(),
  isRand: Type.Boolean(),
  isPrivate: Type.Boolean(),
})
