import * as fs from "fs"
import {
  type MachineInfo,
  type SecurityRule,
  type PortStatus,
  type SecurityAssessment,
} from "@pingpong/shared"

export class SecurityRuleEngine {
  private rules: SecurityRule[] = []

  constructor(rulesFilePath: string) {
    this.loadRules(rulesFilePath)
  }

  private loadRules(path: string): void {
    try {
      const data = fs.readFileSync(path, "utf-8")
      this.rules = JSON.parse(data)
    } catch (error) {
      console.error("Failed to load security rules:", error)
      this.rules = []
    }
  }

  /**
   * Helper to resolve nested keys like "certificate.isSelfSigned" or "vendor.company"
   */
  private getNestedValue(obj: any, path: string): any {
    return path
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
  }

  public assess(machine: MachineInfo): SecurityAssessment {
    let totalScore = 0
    const triggeredRules: string[] = []
    const remediations: string[] = []

    for (const rule of this.rules) {
      if (this.evaluateCriteria(rule, machine)) {
        totalScore += rule.impact
        triggeredRules.push(`${rule.name}: ${rule.description}`)
        if (rule.remediation) {
          remediations.push(rule.remediation)
        }
      }
    }

    const score = Math.min(totalScore, 100)
    return {
      score,
      level: this.determineLevel(score),
      triggeredRules,
      remediations: [...new Set(remediations)],
    }
  }

  private evaluateCriteria(rule: SecurityRule, machine: MachineInfo): boolean {
    const { field, operator, value } = rule.criteria

    // 1. Handle Port-specific list logic
    if (field === "port") {
      const openPorts = machine.ports?.map((p) => p.port) || []
      if (operator === "equals") return openPorts.includes(value)
      if (operator === "in_list")
        return openPorts.some((p) => Array.isArray(value) && value.includes(p))
      if (operator === "not_in_list")
        return openPorts.some((p) => Array.isArray(value) && !value.includes(p))
      return false
    }

    // 2. Handle Certificate-specific logic (scans all ports for a matching cert trait)
    if (field.startsWith("certificate")) {
      return (machine.ports || []).some((port) => {
        const actualValue = this.getNestedValue(port, field)
        return this.compare(actualValue, operator, value)
      })
    }

    // 3. Handle General Machine/Vendor fields
    const targetValue = this.getNestedValue(machine, field) ?? this.getFallbackValue(field, machine)
    return this.compare(targetValue, operator, value)
  }

  /**
   * Comprehensive comparison logic supporting new operators
   */
  private compare(actual: any, operator: string, expected: any): boolean {
    if (actual === undefined) return false

    // Pre-format strings for case-insensitive matching
    const actualStr = String(actual).toLowerCase()
    const expectedStr = String(expected).toLowerCase()

    switch (operator) {
      case "equals":
        return actual === expected

      case "not_equals":
        return actual !== expected

      case "contains":
        return actualStr.includes(expectedStr)

      case "starts_with":
        return actualStr.startsWith(expectedStr)

      case "ends_with":
        return actualStr.endsWith(expectedStr)

      case "in_list":
        return Array.isArray(expected) && expected.includes(actual)

      case "not_in_list":
        return Array.isArray(expected) && !expected.includes(actual)

      case "greater_than":
        return Number(actual) > Number(expected)

      case "less_than":
        return Number(actual) < Number(expected)

      case "regex":
        try {
          const re = new RegExp(String(expected), "i")
          return re.test(String(actual))
        } catch {
          return false
        }

      case "exists":
        return !!actual && actual !== "unknown" && actual !== "Unknown"

      default:
        return false
    }
  }

  private getFallbackValue(field: string, machine: MachineInfo): any {
    const mapping: Record<string, any> = {
      vendor: machine.vendor?.company || "Unknown",
      isRand: machine.vendor?.isRand || false,
      isPrivate: machine.vendor?.isPrivate || false,
    }
    return mapping[field]
  }

  private determineLevel(score: number): SecurityAssessment["level"] {
    if (score >= 75) return "Critical"
    if (score >= 45) return "High"
    if (score >= 20) return "Medium"
    return "Low"
  }
}
