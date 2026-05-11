import { Type } from "@sinclair/typebox"
import { MdnsServiceSchema } from "./mdnsService.js"
import { VendorInfoSchema } from "./vendorInfo.js"
import { PortStatusSchema } from "./port.js"
import { DevicePredictionSchema } from "./deviceType.js"
import { SecurityAssessmentSchema } from "./securityAssessment.js"

export const MachineInfoSchema = Type.Object({
  id: Type.Optional(Type.Number()),
  hostname: Type.Optional(Type.String()),
  ipAddresses: Type.Array(Type.String()),
  macAddress: Type.Optional(Type.String()),
  vendor: Type.Optional(VendorInfoSchema),
  mdnsServices: Type.Array(MdnsServiceSchema),
  ports: Type.Optional(Type.Array(PortStatusSchema)),
  deviceType: Type.Optional(DevicePredictionSchema),
  security: Type.Optional(SecurityAssessmentSchema),
  firstSeen: Type.Number(),
  lastSeen: Type.Number(),
})
