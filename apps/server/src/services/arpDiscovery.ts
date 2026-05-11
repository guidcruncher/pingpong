import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export class ARPDiscovery implements IDiscovery {
  /**
   * Scans the local network using arp-scan
   * @param interface e.g., 'eth0' or 'wlan0'
   */
  public async discover(opts?: { interface?: string }): Promise<MachineInfo[]> {
    const machines: MachineInfo[] = []

    try {
      // --localnet: Scans the subnet attached to the interface
      // --plain: Outputs simple columns (IP, MAC, Vendor)
      const iface = opts ? (opts.interface ?? "eth0") : "eth0"
      const { stdout } = await execAsync(`arp-scan --interface=${iface} --localnet --plain`)

      const lines = stdout.trim().split("\n")

      for (const line of lines) {
        // arp-scan plain output: 192.168.1.1	00:11:22:33:44:55	Vendor Name
        const parts = line.split("\t")

        if (parts.length >= 2) {
          const ip = parts[0].trim()
          const mac = parts[1].trim()

          machines.push({
            hostname: undefined,
            ipAddresses: [ip],
            macAddress: mac,
            mdnsServices: [],
            firstSeen: 0,
            lastSeen: 0,
          })
        }
      }
    } catch (error) {
      console.error("ARP Scan failed. Ensure you have sudo privileges and arp-scan installed.")
      throw error
    }

    return machines
  }
}

export const runARPDiscovery = async (): Promise<MachineInfo[]> => {
  const scanner: IDiscovery = new ARPDiscovery()
  console.log("Scanning for devices...")

  const devices = await scanner.discover()

  console.log(`Found ${devices.length} unique hosts:`)
  return devices
}
