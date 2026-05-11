import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"
import * as ssdp from "node-ssdp"
import { URL } from "url"

const SSDPClient = (ssdp as any).Client || (ssdp as any).default?.Client

export class SSDPDiscovery implements IDiscovery {
  private client: ssdp.Client
  private machines: Map<string, MachineInfo>

  constructor() {
    this.client = new SSDPClient({})
    this.machines = new Map()
  }

  /**
   * Scans for UPnP/SSDP devices on the network
   * @param timeout Time in milliseconds to wait for responses
   */
  public async discover(_opts?: any): Promise<MachineInfo[]> {
    const timeout = 5000
    this.machines.clear()

    // Listen for responses
    this.client.on("response", (headers: any, statusCode: any, rinfo: any) => {
      this.processResponse(headers, rinfo.address)
    })

    // Start the search for all devices (ssdp:all)
    this.client.search("ssdp:all")

    return new Promise((resolve) => {
      setTimeout(() => {
        this.client.stop()
        resolve(Array.from(this.machines.values()))
      }, timeout)
    })
  }

  private processResponse(headers: any, ip: string): void {
    // SSDP doesn't give hostnames directly, usually a Location URL
    // e.g., http://192.168.1.1:1900/rootDesc.xml
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
      // Map all other headers to the txt record for visibility
      txt: {
        server: headers.SERVER || "",
        usn: headers.USN || "",
        location: location,
      },
    }

    if (this.machines.has(ip)) {
      const existing = this.machines.get(ip)!
      // Prevent duplicate service entries
      if (!existing.mdnsServices.some((s) => s.name === service.name)) {
        existing.mdnsServices.push(service)
      }
    } else {
      this.machines.set(ip, {
        hostname: hostname,
        ipAddresses: [ip],
        macAddress: undefined, // SSDP also does not provide MAC addresses
        mdnsServices: [service],
        firstSeen: 0,
        lastSeen: 0,
      })
    }
  }
}

export const runSSDPDiscovery = async (): Promise<MachineInfo[]> => {
  const scanner: IDiscovery = new SSDPDiscovery()
  console.log("Scanning for devices...")

  const devices = await scanner.discover()

  console.log(`Found ${devices.length} unique hosts:`)
  return devices
}
