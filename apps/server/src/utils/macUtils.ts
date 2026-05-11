import { type MdnsService, type MachineInfo } from "@pingpong/shared/"
import { IDiscovery } from "../services/IDiscovery.js"
import { exec } from "child_process"
import { promisify } from "util"
import { readFileSync } from "fs"
import os from "os"

const execAsync = promisify(exec)

/**
 * Robustly populates macAddress for an array of MachineInfo.
 * 1. Checks local interfaces (for self-discovery)
 * 2. Pings remote targets to populate the system ARP cache
 * 3. Reads /proc/net/arp to extract hardware addresses
 */
export async function populateMacAddresses(machines: MachineInfo[]): Promise<MachineInfo[]> {
  // --- 1. Map Local Interfaces ---
  // A machine doesn't ARP itself, so we must get our own MAC from the OS.
  const localInterfaces = os.networkInterfaces()
  const localIpMap = new Map<string, string>()

  for (const name of Object.keys(localInterfaces)) {
    localInterfaces[name]?.forEach((details) => {
      // Filter for IPv4 and valid MACs
      if (details.mac && details.mac !== "00:00:00:00:00:00") {
        localIpMap.set(details.address, details.mac)
      }
    })
  }

  // --- 2. Warm the ARP Cache ---
  // We ping all remote IPs in parallel. This forces the Linux kernel
  // to perform an ARP resolution and store the result in /proc/net/arp.
  const remoteIps = machines.flatMap((m) => m.ipAddresses).filter((ip) => !localIpMap.has(ip))

  const pingPromises = remoteIps.map((ip) =>
    execAsync(`ping -c 1 -W 1 ${ip}`).catch(() => {
      /* Ignore ping failures; we only care that the ARP table was updated */
    }),
  )

  await Promise.all(pingPromises)

  // --- 3. Read and Parse ARP Table ---
  let arpTable = ""
  try {
    // Reading from /proc is near-instant and avoids spawning a shell process
    arpTable = readFileSync("/proc/net/arp", "utf8")
  } catch (err) {
    console.error("Critical: Could not read /proc/net/arp. Is this a Linux system?", err)
    // If we can't read ARP, we can still return the local MACs we found
    return machines.map((m) => ({
      ...m,
      macAddress: m.macAddress || localIpMap.get(m.ipAddresses[0]) || undefined,
    }))
  }

  const arpLines = arpTable.split("\n")

  // --- 4. Final Merge ---
  return machines.map((machine) => {
    // If machine already has a valid MAC, keep it
    if (machine.macAddress && machine.macAddress !== "00:00:00:00:00:00") {
      return machine
    }

    let resolvedMac: string | undefined = undefined

    for (const ip of machine.ipAddresses) {
      // Priority 1: Check if it's the local machine
      if (localIpMap.has(ip)) {
        resolvedMac = localIpMap.get(ip)!
        break
      }

      // Priority 2: Check the system ARP table
      for (const line of arpLines) {
        // Line format: IP address (0), HW type (1), Flags (2), HW address (3)...
        if (line.startsWith(ip + " ")) {
          const parts = line.split(/\s+/)
          const mac = parts[3]
          if (mac && mac !== "00:00:00:00:00:00") {
            resolvedMac = mac
            break
          }
        }
      }
      if (resolvedMac) break
    }

    return {
      ...machine,
      macAddress: resolvedMac,
    }
  })
}
