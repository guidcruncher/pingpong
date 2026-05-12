import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"
import * as ssdp from "node-ssdp"
import { URL } from "url"

const SSDPClient = (ssdp as any).Client || (ssdp as any).default?.Client

export class SSDPDiscovery implements IDiscovery {
  private client: ssdp.Client
  private machines: Map<string, MachineInfo>
  private prefixFilter?: string // Store the parsed prefix

  constructor() {
    this.client = new SSDPClient({})
    this.machines = new Map()
  }

  /**
   * Scans for UPnP/SSDP devices on the network
   * @param opts.target e.g., '192.168.1.0/24'
   */
  public async discover(opts?: { target?: string }): Promise<MachineInfo[]> {
    const timeout = 5000
    this.machines.clear()

    // Parse the target (e.g., "192.168.1.0/24" -> "192.168.1.")
    if (opts?.target) {
      const ipPart = opts.target.split("/")[0]
      const octets = ipPart.split(".")
      this.prefixFilter = `${octets[0]}.${octets[1]}.${octets[2]}.`
    } else {
      this.prefixFilter = undefined
    }

    // Listen for responses
    this.client.on("response", (headers: any, statusCode: any, rinfo: any) => {
      const ip = rinfo.address

      // Filter: Only process if it matches the prefix or if no filter is set
      if (!this.prefixFilter || ip.startsWith(this.prefixFilter)) {
        this.processResponse(headers, ip)
      }
    })

    // Start the search
    this.client.search("ssdp:all")

    return new Promise((resolve) => {
      setTimeout(() => {
        this.client.stop()
        // Remove listeners to prevent memory leaks on subsequent runs
        this.client.removeAllListeners("response")
        resolve(Array.from(this.machines.values()))
      }, timeout)
    })
  }

  private processResponse(headers: any, ip: string): void {
    const location = headers.LOCATION || ""
    let hostname = undefined

    if (location) {
      try {
        const url = new URL(location)
        hostname = url.hostname
      } catch (e) {
        hostname = ip
      }
    }

    const service: MdnsService = {
      name: headers.ST || "Unknown Service",
      type: "ssdp",
      protocol: "udp",
      port: 1900,
      txt: {
        server: headers.SERVER || "",
        usn: headers.USN || "",
        location: location,
      },
    }

    if (this.machines.has(ip)) {
      const existing = this.machines.get(ip)!
      if (!existing.mdnsServices.some((s) => s.name === service.name)) {
        existing.mdnsServices.push(service)
      }
    } else {
      this.machines.set(ip, {
        hostname: hostname,
        ipAddresses: [ip],
        macAddress: undefined,
        mdnsServices: [service],
        firstSeen: 0,
        lastSeen: 0,
      })
    }
  }
}

export const runSSDPDiscovery = async (): Promise<MachineInfo[]> => {
  const scanner: IDiscovery = new SSDPDiscovery()
  console.log("Scanning for SSDP devices on 192.168.1.0 network...")

  // Pass the standard CIDR format
  const devices = await scanner.discover({ target: "192.168.1.0/24" })

  console.log(`Found ${devices.length} unique hosts:`)
  return devices
}
