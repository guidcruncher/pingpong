export interface SecurityAssessment {
  score: number
  level: "Low" | "Medium" | "High" | "Critical"
  triggeredRules: string[]
  remediations: string[]
}
