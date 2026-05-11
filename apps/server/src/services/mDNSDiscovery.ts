import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"

import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export class mDNSDiscovery implements IDiscovery {
  /**
   * Executes avahi-browse and parses the colon-delimited output
   */
  public async discover(_opts?: any): Promise<MachineInfo[]> {
    const machineMap = new Map<string, MachineInfo>()

    try {
      // -a: all, -r: resolve, -t: terminate, -p: parsable
      const { stdout } = await execAsync("avahi-browse -a -r -t -p")
      const lines = stdout.split("\n")

      for (const line of lines) {
        const parts = line.split(";")

        // '=' denotes a resolved service record in parsable mode
        if (parts[0] !== "=") continue

        // Avahi Parsable Format Index:
        // 0: status (=)
        // 1: interface (eth0)
        // 2: protocol (IPv4/IPv6)
        // 3: name
        // 4: type (_http._tcp)
        // 5: domain
        // 6: hostname (device.local)
        // 7: IP address
        // 8: port
        // 9: TXT record ("key=val")

        const hostname = parts[6]
        const ip = parts[7]
        const fullType = parts[4].split(".")
        const serviceType = fullType[0] || ""
        const protocol = (fullType[1]?.replace("_", "") as "tcp" | "udp") || "tcp"
        const port = parseInt(parts[8], 10)
        const txtRaw = parts[9] || ""

        const txtRecord: Record<string, string> = {}
        if (txtRaw) {
          // TXT records are usually "key=value" surrounded by quotes
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

        // Add IP if unique
        if (ip && !machine.ipAddresses.includes(ip)) {
          machine.ipAddresses.push(ip)
        }

        // Add Service if unique
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
  console.log("Scanning for devices...")

  const devices = await scanner.discover()

  console.log(`Found ${devices.length} unique hosts:`)
  return devices
}
