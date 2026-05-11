import * as fs from "fs"
import { type MachineInfo, type DevicePrediction } from "@pingpong/shared"

export interface RuleCondition {
  field: "vendor" | "mac_prefix" | "ports" | "hostname" | "services" | "certificate" | string
  op:
    | "contains"
    | "contains_any"
    | "in_list"
    | "includes"
    | "includes_any"
    | "regex"
    | "starts_with"
    | "ends_with"
    | "equals"
  value: any
}

export interface DeviceRule {
  id: string
  priority: number
  result: DevicePrediction
  logic: "AND" | "OR"
  conditions: RuleCondition[]
}

export class DeviceIdentificationEngine {
  private rules: DeviceRule[] = []

  constructor(rulesPath: string) {
    this.loadRules(rulesPath)
  }

  private loadRules(path: string): void {
    try {
      const data = fs.readFileSync(path, "utf-8")
      const parsed = JSON.parse(data)
      // Ensure rules are always prioritized: higher number = earlier evaluation
      this.rules = parsed.sort((a: DeviceRule, b: DeviceRule) => b.priority - a.priority)
    } catch (error) {
      console.error("Failed to load device rules:", error)
    }
  }

  /**
   * Deep-dives into objects using dot notation (e.g., "certificate.subject.commonName")
   */
  private getNestedValue(obj: any, path: string): any {
    return path
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
  }

  public classify(machine: MachineInfo): DevicePrediction {
    const context = {
      vendor: (machine.vendor?.company || "").toLowerCase(),
      mac_prefix: (machine.macAddress || "").replace(/[:.-]/g, "").substring(0, 6).toUpperCase(),
      ports: machine.ports?.map((p) => p.port) || [],
      hostname: (machine.hostname || "").toLowerCase(),
      // IMPROVED: Flattens mDNS service types AND TXT record values into a single array
      services: machine.mdnsServices.flatMap((s) => {
        const types = [s.type.toLowerCase()]
        if (s.txt) {
          // Adds values like "tizen" or "chromecast" from the TXT records
          Object.values(s.txt).forEach((val) => {
            if (typeof val === "string") types.push(val.toLowerCase())
          })
        }
        return types
      }),
      rawPorts: machine.ports || [],
    }

    for (const rule of this.rules) {
      const results = rule.conditions.map((cond) => {
        // Special case: If the field starts with 'certificate', we check all open ports
        if (cond.field.startsWith("certificate")) {
          return context.rawPorts.some((port) => this.evaluate(cond, port))
        }
        return this.evaluate(cond, context)
      })

      const isMatch =
        rule.logic === "OR" ? results.some((r) => r === true) : results.every((r) => r === true)

      if (isMatch) return rule.result
    }

    return { type: "Unknown", os: "Unknown", hardware: undefined }
  }

  private evaluate(cond: RuleCondition, context: any): boolean {
    const target = this.getNestedValue(context, cond.field)
    if (target === undefined) return false

    // Normalize for string comparisons
    const targetStr = String(target).toLowerCase()
    const valueStr = String(cond.value).toLowerCase()

    switch (cond.op) {
      case "equals":
        return target === cond.value

      case "contains":
        return targetStr.includes(valueStr)

      case "contains_any":
        return (
          Array.isArray(cond.value) &&
          cond.value.some((val: string) => targetStr.includes(val.toLowerCase()))
        )

      case "starts_with":
        return targetStr.startsWith(valueStr)

      case "ends_with":
        return targetStr.endsWith(valueStr)

      case "regex":
        try {
          const re = new RegExp(String(cond.value), "i")
          return re.test(String(target))
        } catch {
          return false
        }

      case "in_list":
        return Array.isArray(cond.value) && cond.value.includes(target)

      case "includes":
        return Array.isArray(target) && target.includes(cond.value)

      case "includes_any":
        return (
          Array.isArray(target) &&
          Array.isArray(cond.value) &&
          cond.value.some((v: any) => target.includes(v))
        )

      default:
        return false
    }
  }
}
