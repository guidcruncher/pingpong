export interface SecurityRule {
  id: string
  name: string
  description: string
  category: "port" | "identity" | "service" | "hardware" | "security"
  impact: number // 0-100, used to calculate SecurityAssessment score
  criteria: {
    /**
     * Supports flat fields (e.g., "port") and nested paths
     * (e.g., "certificate.isSelfSigned", "vendor.company").
     */
    field:
      | "port"
      | "hostname"
      | "vendor"
      | "isRand"
      | "isPrivate"
      | "protocol"
      | "certificate.isSelfSigned"
      | "certificate.subject.commonName"
      | "certificate.issuer.organization"
      | string // Allows for flexible nested path strings

    /**
     * Expanded operators supported by the new compare() method.
     */
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "exists"
      | "in_list"
      | "not_in_list"
      | "starts_with"
      | "ends_with"
      | "greater_than"
      | "less_than"
      | "regex"

    value: any
  }
  remediation?: string
}
