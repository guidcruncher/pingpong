# Device Identification Rules Engine Documentation

The Device Identification Rules Engine is a sophisticated classification system that analyzes network machine data to predict device types, operating systems, and hardware manufacturers. It uses a prioritized ruleset to match attributes such as MAC prefixes, open ports, hostnames, and TLS certificate metadata.

## 1. Logic and Prioritization

The engine operates on a **Priority-Based Execution** model. Rules are sorted by their priority value (highest first), ensuring that specific fingerprints (e.g., a specific NAS model) are evaluated before generic fingerprints (e.g., a general Linux device).

Each rule utilizes either **AND** or **OR** logic to evaluate its collection of conditions. Furthermore, the engine uses **Nested Path Resolution** to inspect deep data structures, particularly within the `certificate` object found on open ports.

## 2. Rule Schema

Rules are defined in a JSON array with the following structure:

```typescript
export interface DeviceRule {
id: string;          // Unique identifier for the rule
priority: number;    // Execution order (higher numbers evaluated first)
logic: "AND" | "OR"; // Requirement for condition matching
conditions: RuleCondition[];
result: {
type: string;      // Predicted device category (e.g., "Printer")
os: string;        // Predicted Operating System
hardware?: string; // Specific hardware brand or model
};
}
```

## 3. Condition Fields and Operators

The engine supports a wide array of fields and logical operators to ensure precise identification.

-   **Fields:** `vendor`, `mac_prefix`, `ports`, `hostname`, `services`, and nested `certificate` paths (e.g., `certificate.subject.commonName`).
-   **Operators:**
    -   `equals`: Strict equality.
    -   `contains` / `contains_any`: Substring matching.
    -   `regex`: Regular expression pattern matching.
    -   `in_list`: Checks if a value exists in a provided array.
    -   `includes` / `includes_any`: Checks if a target array contains specific values.
    -   `starts_with` / `ends_with`: String anchor matching.

## 4. Configuration Examples

### Example 1: High-Priority Certificate Identification

This rule identifies a Synology NAS with high confidence by checking for a specific port and a TLS certificate common name.

```json
{
"id": "ID-SYN-001",
"priority": 100,
"logic": "AND",
"conditions": [
{
"field": "certificate.subject.commonName",
"op": "contains",
"value": "synology"
},
{
"field": "ports",
"op": "includes",
"value": 5001
}
],
"result": {
"type": "NAS",
"os": "DiskStation Manager",
"hardware": "Synology"
}
}
```

### Example 2: Hostname Regex Identification

Uses regular expressions to identify Raspberry Pi devices regardless of the specific suffix in the hostname.

```json
{
"id": "ID-RPI-001",
"priority": 80,
"logic": "OR",
"conditions": [
{
"field": "hostname",
"op": "regex",
"value": "^raspberrypi.*"
},
{
"field": "mac_prefix",
"op": "in_list",
"value": ["B827EB", "DCA632", "E45F01"]
}
],
"result": {
"type": "IoT",
"os": "Raspberry Pi OS",
"hardware": "Raspberry Pi"
}
}
```

### Example 3: Generic Vendor Matching

A lower-priority rule that catches devices based on the MAC vendor if more specific rules fail.

```json
{
"id": "ID-HP-GEN",
"priority": 10,
"logic": "OR",
"conditions": [
{
"field": "vendor",
"op": "contains",
"value": "Hewlett-Packard"
}
],
"result": {
"type": "Printer",
"os": "Unknown",
"hardware": "HP"
}
}
```

## 5. Identification Workflow

1. The engine normalizes machine data (lowercasing strings, formatting MAC prefixes). 
2. It iterates through the sorted ruleset. 
3. For certificate-based rules, it automatically scans all open ports for a matching certificate property.
4. The first rule to satisfy the **AND/OR** logic returns its `result`. 
5. If no rules match, the engine returns an "Unknown" prediction.


