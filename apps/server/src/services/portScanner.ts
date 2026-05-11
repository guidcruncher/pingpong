import * as net from "net"
import { type PortStatus } from "@pingpong/shared"
import * as dgram from "dgram" // Node.js module for UDP sockets[span_3](start_span)[span_3](end_span)
import * as fs from "node:fs"
import * as path from "node:path"
import { CertRetriever } from "../utils/certUtils.js"

interface PortConfig {
  service: string
  protocols: string[]
  isTls: boolean
}

export class PortScanner {
  private commonPorts: Record<number, PortConfig>

  constructor(portsFile: string) {
    const fileContent = fs.readFileSync(portsFile, "utf-8")
    this.commonPorts = JSON.parse(fileContent)
  }

  private getServiceName(port: number): string {
    return this.commonPorts[port]?.service || "Unknown"
  }

  private async scanTcpPort(
    host: string,
    port: number,
    timeout: number = 1000,
  ): Promise<PortStatus> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      const portInfo = this.commonPorts[port]
      socket.setTimeout(timeout)

      const finalize = async (isOpen: boolean) => {
        socket.destroy()

        let certificate = undefined

        if (isOpen && portInfo?.isTls) {
          const certRetriever = new CertRetriever()
          certificate = (await certRetriever.getCertificate(host, port, 2000)) || undefined
        }

        resolve({
          port,
          isOpen,
          protocol: "TCP",
          service: portInfo?.service || "Unknown",
          certificate,
        })
      }

      socket.on("connect", () => finalize(true))
      socket.on("timeout", () => finalize(false))
      socket.on("error", () => finalize(false))

      socket.connect(port, host)
    })
  }

  public async scanUdpPort(
    host: string,
    port: number,
    timeout: number = 2000,
  ): Promise<PortStatus> {
    return new Promise((resolve) => {
      const client = dgram.createSocket("udp4")
      const message = Buffer.from("Ping")
      let completed = false // Flag to prevent double-resolution/closing

      const finalize = (isOpen: boolean) => {
        if (completed) return
        completed = true

        clearTimeout(timer) // Stop the timeout from firing
        client.removeAllListeners() // Clean up listeners

        try {
          client.close()
        } catch (e) {
          // Silently catch if already closing
        }

        resolve({
          port,
          isOpen,
          protocol: "UDP",
          service: this.getServiceName(port),
        })
      }

      // Set the timer first so we can clear it
      const timer = setTimeout(() => finalize(false), timeout)

      client.on("message", () => finalize(true))

      client.on("error", () => finalize(false))

      client.send(message, port, host, (err) => {
        if (err) finalize(false)
      })
    })
  }

  public async scanPorts(host: string, timeout: number = 1000): Promise<PortStatus[]> {
    const entries = Object.entries(this.commonPorts)
    const results: PortStatus[] = []
    const chunkSize = 5

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize)

      const scanPromises = chunk.flatMap(([portStr, info]) => {
        const port = Number(portStr)
        const promises: Promise<PortStatus>[] = []

        if (info.protocols.includes("TCP")) {
          promises.push(this.scanTcpPort(host, port, timeout))
        }
        if (info.protocols.includes("UDP")) {
          promises.push(this.scanUdpPort(host, port, timeout + 500))
        }

        return promises
      })

      const chunkResults = await Promise.all(scanPromises)
      results.push(...chunkResults)
    }

    const res = results.filter((r) => r.isOpen)
    return res
  }
}
