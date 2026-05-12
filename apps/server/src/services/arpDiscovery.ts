import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "./IDiscovery.js"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export class ARPDiscovery implements IDiscovery {
  /**
   * Scans a specific network or range using arp-scan
   * @param interface e.g., 'eth0' or 'wlan0'
   * @param target e.g., '192.168.1.0/24' or '192.168.1.5'
   */
  public async discover(opts?: { interface?: string; target?: string }): Promise<MachineInfo[]> {
    const machines: MachineInfo[] = []

    try {
      const iface = opts?.interface ?? "eth0"
      // Default to --localnet if no specific target is provided
      const target = opts?.target ?? "--localnet"

      // We swap --localnet for the specific target string if it exists
      const command = `arp-scan --interface=${iface} --plain ${target}`
      const { stdout } = await execAsync(command)

      const lines = stdout.trim().split("\n")

      for (const line of lines) {
        if (!line) continue

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
