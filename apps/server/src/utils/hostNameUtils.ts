import { exec } from "child_process"
import { promisify } from "util"
import { type MachineInfo } from "@pingpong/shared"

const execAsync = promisify(exec)

/**
 * Resolves hostnames via avahi-resolve ONLY if the current hostname
 * is missing or set to a generic 'unknown' value.
 */
export async function populateHostnames(machines: MachineInfo[]): Promise<MachineInfo[]> {
  const resolutionPromises = machines.map(async (machine) => {
    // Check if hostname is already defined/valid
    const hasValidName =
      machine.hostname !== undefined &&
      machine.hostname !== null &&
      machine.hostname !== "" &&
      machine.hostname !== "unknown"

    if (hasValidName) {
      return machine
    }

    const ip = machine.ipAddresses[0]
    if (!ip) return machine

    try {
      // Execute the resolve command
      const { stdout } = await execAsync(`avahi-resolve -a ${ip}`)

      // Parse: "192.168.1.156   Google-Nest-Mini.lan"
      const parts = stdout.trim().split(/\s+/)

      if (parts.length >= 2) {
        return {
          ...machine,
          hostname: parts[1],
        }
      }
    } catch (error) {
      // If the command fails or IP isn't found, we just return the machine as-is
    }

    return machine
  })

  return await Promise.all(resolutionPromises)
}
