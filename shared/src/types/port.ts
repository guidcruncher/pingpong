import { type CertificateDetails } from "./certificate.js"

export interface PortStatus {
  port: number
  isOpen: boolean
  protocol?: string
  service?: string
  certificate?: CertificateDetails
}
