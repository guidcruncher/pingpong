import * as tls from "node:tls"
import { type CertificateDetails } from "@pingpong/shared"

export class CertRetriever {
  /**
   * Helper to ensure we always get a string even if the cert field is an array.
   */
  private formatField(field: string | string[] | undefined): string | undefined {
    if (!field) return undefined
    return Array.isArray(field) ? field.join(", ") : field
  }

  public async getCertificate(
    host: string,
    port: number,
    timeout: number = 2500,
  ): Promise<CertificateDetails | undefined> {
    return new Promise((resolve) => {
      try {
        const socket = tls.connect(
          {
            host,
            port,
            servername: host,
            rejectUnauthorized: false, // Accept self-signed for identification
          },
          () => {
            const cert = socket.getPeerCertificate()

            if (!cert || Object.keys(cert).length === 0) {
              socket.destroy()
              return resolve(undefined)
            }

            const details: CertificateDetails = {
              subject: {
                commonName: this.formatField(cert.subject.CN) || "Unknown",
                organization: this.formatField(cert.subject.O),
                organizationalUnit: this.formatField(cert.subject.OU),
                country: this.formatField(cert.subject.C),
              },
              issuer: {
                commonName: this.formatField(cert.issuer.CN) || "Unknown",
                organization: this.formatField(cert.issuer.O),
                organizationalUnit: this.formatField(cert.issuer.OU),
                country: this.formatField(cert.issuer.C),
              },
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              fingerprint: cert.fingerprint,
              serialNumber: cert.serialNumber, // Fixed: was serialnumber
              subjectaltname: cert.subjectaltname,
              isSelfSigned: this.checkIfSelfSigned(cert),
            }

            socket.destroy()
            resolve(details)
          },
        )

        socket.on("error", () => {
          socket.destroy()
          resolve(undefined)
        })
        socket.setTimeout(timeout, () => {
          socket.destroy()
          resolve(undefined)
        })
      } catch (err) {
        console.error("Error getting certificate", err)
        resolve(undefined)
      }
    })
  }

  private checkIfSelfSigned(cert: tls.PeerCertificate): boolean {
    // Fixed: Node's PeerCertificate uses 'issuerCertificate' only when
    // getting a full chain. For basic checks, compare fingerprint or names.
    const subjectCN = this.formatField(cert.subject.CN)
    const issuerCN = this.formatField(cert.issuer.CN)

    return subjectCN === issuerCN
  }
}
