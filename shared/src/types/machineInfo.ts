import {
  type SecurityAssessment,
  type DevicePrediction,
  type PortStatus,
  type VendorInfo,
  type MdnsService,
} from "./index.js"

/**
 * Represents a unique machine on the network
 */
export interface MachineInfo {
  id?: number
  hostname?: string
  ipAddresses: string[]
  macAddress?: string
  vendor?: VendorInfo
  mdnsServices: MdnsService[]
  ports?: PortStatus[]
  deviceType?: DevicePrediction
  security?: SecurityAssessment
  firstSeen: number
  lastSeen: number
}
