import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export class mDNSDiscovery implements IDiscovery {
  /**
   * Executes avahi-browse and filters by a specific target range
   * @param opts.target e.g., '192.168.1.0/24'
   */
  public async discover(opts?: { target?: string }): Promise<MachineInfo[]> {
    const machineMap = new Map<string, MachineInfo>()

    // Parse the target (e.g., "192.168.1.0/24" -> "192.168.1.")
    let prefixFilter: string | undefined
    if (opts?.target) {
      const ipPart = opts.target.split("/")[0]
      const octets = ipPart.split(".")
      // Take the first three octets for a standard /24 subnet filter
      prefixFilter = `${octets[0]}.${octets[1]}.${octets[2]}.`
    }

    try {
      const { stdout } = await execAsync("avahi-browse -a -r -t -p")
      const lines = stdout.split("\n")

      for (const line of lines) {
        const parts = line.split(";")
        if (parts[0] !== "=") continue

        const hostname = parts[6]
        const ip = parts[7]

        // Filter: Check if the IP starts with the parsed prefix
        if (prefixFilter && ip && !ip.startsWith(prefixFilter)) {
          continue
        }

        const fullType = parts[4].split(".")
        const serviceType = fullType[0] || ""
        const protocol = (fullType[1]?.replace("_", "") as "tcp" | "udp") || "tcp"
        const port = parseInt(parts[8], 10)
        const txtRaw = parts[9] || ""

        const txtRecord: Record<string, string> = {}
        if (txtRaw) {
          const match = txtRaw.match(/"([^"]+)"/g)
          match?.forEach((item) => {
            const clean = item.replace(/"/g, "")
            const [k, v] = clean.split("=")
            if (k) txtRecord[k] = v || ""
          })
        }

        if (!machineMap.has(hostname)) {
          machineMap.set(hostname, {
            hostname,
            ipAddresses: [],
            macAddress: undefined,
            mdnsServices: [],
            firstSeen: 0,
            lastSeen: 0,
          })
        }

        const machine = machineMap.get(hostname)!

        if (ip && !machine.ipAddresses.includes(ip)) {
          machine.ipAddresses.push(ip)
        }

        const serviceKey = `${serviceType}:${port}`
        if (!machine.mdnsServices.some((s) => `${s.type}:${s.port}` === serviceKey)) {
          machine.mdnsServices.push({
            name: parts[3],
            type: serviceType,
            protocol,
            port,
            txt: txtRecord,
          })
        }
      }
    } catch (error) {
      console.error("Failed to run avahi-browse. Is it installed?", error)
    }

    return Array.from(machineMap.values())
  }
}

export const runMDNSDiscovery = async (): Promise<MachineInfo[]> => {
  const scanner: IDiscovery = new mDNSDiscovery()
  console.log("Scanning for mDNS devices...")

  // Now accepts the standard CIDR format
  const devices = await scanner.discover({ target: "192.168.1.0/24" })

  console.log(`Found ${devices.length} unique hosts:`)
  return devices
}
