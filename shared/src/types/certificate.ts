/**
 * Represents the identity of a certificate holder or issuer
 */
export interface CertIdentity {
  commonName: string
  organization?: string
  organizationalUnit?: string
  country?: string
}

/**
 * Detailed breakdown of a remote SSL/TLS certificate
 */
export interface CertificateDetails {
  subject: CertIdentity
  issuer: CertIdentity
  validFrom: string
  validTo: string
  fingerprint: string
  serialNumber: string
  // Subject Alternative Names (critical for identifying multi-service IoT)
  subjectaltname?: string
  // Whether the certificate was signed by a known CA or is self-signed
  isSelfSigned: boolean
}
