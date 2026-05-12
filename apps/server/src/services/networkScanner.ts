import { type MachineInfo, type PortStatus } from "@pingpong/shared"
import { IDiscovery } from "./IDiscovery.js"
import { mDNSDiscovery } from "./mDNSDiscovery.js"
import { SSDPDiscovery } from "./ssdpDiscovery.js"
import { ARPDiscovery } from "./arpDiscovery.js"
import { populateMacAddresses } from "../utils/macUtils.js"
import { populateHostnames } from "../utils/hostNameUtils.js"
import { fetchMacVendorInfo } from "../utils/macVendorInfo.js"
import { PortScanner } from "./portScanner.js"
import { classifyDevice } from "../utils/deviceUtils.js"
import { SecurityRuleEngine } from "./securityRuleEngine.js"
import { DeviceIdentificationEngine } from "./deviceIdentificationRuleEngine.js"
import { cwd } from "node:process"
import * as path from "node:path"
import { type IMachineRepository } from "../db/IMachineRepository.js"

const isProduction: boolean = process.env.NODE_ENV === "production"

export class NetworkScanner implements IDiscovery {
  private discoverers: IDiscovery[]
  private repo: IMachineRepository

  constructor(repo: IMachineRepository, discoverers?: IDiscovery[]) {
    this.repo = repo
    if (discoverers) {
      this.discoverers = discoverers
    } else {
      this.discoverers = [new mDNSDiscovery(), new SSDPDiscovery(), new ARPDiscovery()]
    }
  }

  /**
   * Orchestrates the full discovery pipeline.
   */
  public async discover(opts: any): Promise<MachineInfo[]> {
    const rulesFile = isProduction
      ? "/config/rules.json"
      : (opts?.rulesFile ?? path.join(cwd(), "rules.json"))
    const deviceFile = isProduction
      ? "/config/device_rules.json"
      : (opts?.deviceFile ?? path.join(cwd(), "device_rules.json"))
    const portsFile = isProduction
      ? "/config/scan_ports.json"
      : (opts?.portsFile ?? path.join(cwd(), "scan_ports.json"))

    const deviceIdentifyEngine = new DeviceIdentificationEngine(deviceFile)
    const securityEngine = new SecurityRuleEngine(rulesFile)
    const portScanner = new PortScanner(portsFile)

    // 1. Run all raw discovery methods in parallel
    const resultsArray = await Promise.all(
      this.discoverers.map((d) => d.discover({ target: opts?.target })),
    )

    // 2. Merge and Deduplicate by IP
    const mergedMap = new Map<string, MachineInfo>()
    for (const results of resultsArray) {
      for (const machine of results) {
        const primaryIp = machine.ipAddresses[0]
        if (!primaryIp) continue

        if (mergedMap.has(primaryIp)) {
          this.mergeMachineData(mergedMap.get(primaryIp)!, machine)
        } else {
          mergedMap.set(primaryIp, { ...machine, ports: [] })
        }
      }
    }

    let machines = Array.from(mergedMap.values())

    // 3. Resolve Identity (Local Linux commands)
    machines = await populateHostnames(machines)
    machines = await populateMacAddresses(machines)

    // 4. Port Scanning (Chunked concurrency)
    machines = await this.populatePorts(portScanner, machines)

    // 5. Vendor Enrichment (External API with 1s delay)
    machines = await this.enrichWithVendorData(machines)

    // 6. Final Security Assessment
    const timeStamp = Date.now()
    const res = machines.map((machine) => ({
      ...machine,
      deviceType: deviceIdentifyEngine.classify(machine),
      security: securityEngine.assess(machine),
      firstSeen: timeStamp,
      lastSeen: timeStamp,
    }))

    for (const machine of res) {
      try {
        this.repo.upsert(machine)
      } catch (err) {
        console.error(`Unable to save machine ${machine.macAddress}`, err)
      }
    }

    return res
  }

  /**
   * Scans common ports for all discovered machines.
   */
  private async populatePorts(
    portScanner: PortScanner,
    machines: MachineInfo[],
  ): Promise<MachineInfo[]> {
    const CONCURRENCY_LIMIT = 5 // Scan 5 machines at once
    for (let i = 0; i < machines.length; i += CONCURRENCY_LIMIT) {
      const chunk = machines.slice(i, i + CONCURRENCY_LIMIT)
      await Promise.all(
        chunk.map(async (machine) => {
          const ip = machine.ipAddresses[0]
          if (ip) {
            machine.ports = await portScanner.scanPorts(ip, 500)
          }
        }),
      )
    }
    return machines
  }

  /**
   * Sequential vendor lookup to avoid API rate limits.
   */
  private async enrichWithVendorData(machines: MachineInfo[]): Promise<MachineInfo[]> {
    for (const machine of machines) {
      if (machine.macAddress && !machine.vendor) {
        const vendorData = await fetchMacVendorInfo(machine.macAddress)
        if (vendorData) {
          machine.vendor = vendorData
        }

        // Essential 1s delay for keyless API
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    return machines
  }

  /**
   * Merges data from multiple discovery sources into a single MachineInfo object.
   */
  private mergeMachineData(target: MachineInfo, source: MachineInfo): void {
    if (!target.hostname || target.hostname === "unknown") {
      target.hostname = source.hostname
    }

    const ipSet = new Set([...target.ipAddresses, ...source.ipAddresses])
    target.ipAddresses = Array.from(ipSet)

    if (!target.macAddress && source.macAddress) {
      target.macAddress = source.macAddress
    }

    // Merge services
    for (const newService of source.mdnsServices) {
      const isDuplicate = target.mdnsServices.some(
        (existing) => existing.type === newService.type && existing.name === newService.name,
      )
      if (!isDuplicate) target.mdnsServices.push(newService)
    }
  }
}

export const runNetworkScanner = async (
  machineRepository: IMachineRepository,
): Promise<MachineInfo[]> => {
  const scanner: IDiscovery = new NetworkScanner(machineRepository)
  console.log("Scanning for devices and fetching vendor info...")

  const devices = await scanner.discover({target: "192.168.1.0/24"})

  console.log(`\nFound ${devices.length} unique hosts:`)
  return devices
}
