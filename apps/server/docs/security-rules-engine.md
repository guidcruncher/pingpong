# Security Rules Engine Documentation

The Security Rules Engine is a centralized logic processor designed to evaluate network devices (MachineInfo) against a collection of predefined security standards. It performs automated risk assessment by calculating a security impact score based on open ports, hardware identity, and TLS certificate metadata.

## 1. Rule Structure

Each rule is defined as a JSON object within a configuration array. The engine uses a **recursive path resolver** to access nested data, such as certificate details attached to specific ports.

```typescript
export interface SecurityRule {
id: string;
name: string;
description: string;
category: "port" | "identity" | "service" | "hardware" | "security";
impact: number;
criteria: {
field: string; // Supports dot notation: "certificate.isSelfSigned"
operator: string;
value: any;
};
remediation?: string;
}
```

## 2. Comparison Operators

The engine supports a comprehensive set of operators to handle different data types and validation scenarios:

*   **equals / not_equals**: Strict equality checks for strings, numbers, or booleans.
*   **contains**: Case-insensitive substring matching.
*   **starts_with / ends_with**: Matches the beginning or end of a string (useful for OUI or hostnames).
*   **in_list / not_in_list**: Checks for membership within a provided array.
*   **regex**: Evaluates a value against a Regular Expression pattern.
*   **greater_than / less_than**: Numeric comparisons for port ranges or versioning.
*   **exists**: Verifies a field is present and contains a valid (non-unknown) value.

## 3. Configuration Examples

### Example 1: Self-Signed Certificate Detection

This rule flags devices using untrusted, self-signed certificates on secure ports by traversing the nested certificate object.

```json
{
"id": "RULE-007",
"name": "Untrusted Certificate",
"description": "The device is using a self-signed TLS certificate which cannot be verified by a CA.",
"category": "security",
"impact": 30,
"criteria": {
"field": "certificate.isSelfSigned",
"operator": "equals",
"value": true
},
"remediation": "Install a CA-signed certificate or ensure the device is on a strictly isolated management VLAN."
}
```

### Example 2: Unauthorized Service Whitelisting

Uses the `not_in_list` operator to trigger an alert if any open port is found that does not belong to an approved set of administrative services.

```json
{
"id": "RULE-008",
"name": "Non-Standard Service Detected",
"description": "An open port was detected that is not on the corporate whitelist.",
"category": "port",
"impact": 45,
"criteria": {
"field": "port",
"operator": "not_in_list",
"value": [22, 80, 443]
},
"remediation": "Identify the service and close the port if it is not business-critical."
}
```

### Example 3: Fingerprinting via Regex

Identifies hardware families by matching the hostname against a pattern.

```json
{
"id": "RULE-009",
"name": "Generic IoT Device",
"description": "The device hostname matches patterns common to unmanaged IoT hardware.",
"category": "identity",
"impact": 15,
"criteria": {
"field": "hostname",
"operator": "regex",
"value": "^(iot|smart|hub)-.*"
},
"remediation": "Ensure this device is registered in the asset management system."
}
```
 
## 4. Scoring and Assessment Levels

The engine aggregates the `impact` value of all triggered rules, capping the final score at 100. The assessment level is determined as follows:

*   **Critical**: Score >= 75
*   **High**: Score >= 45
*   **Medium**: Score >= 20
*   **Low**: Score < 20
