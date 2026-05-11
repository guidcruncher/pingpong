<template>
  <div class="device-details p-4 p-lg-5">
    <div v-if="!device" class="text-center mt-5 text-muted opacity-50">
      <LayoutIcon :size="64" class="mb-3" />
      <h4 class="fw-light">Select an asset to view detail</h4>
    </div>

    <div v-else>
      <header class="d-flex justify-content-between align-items-start mb-5">
        <div>
          <h2 class="fw-bold mb-1">{{ cleanHostname(device?.hostname ?? "") }}</h2>
          <div class="d-flex gap-3 align-items-center">
            <span class="badge bg-primary rounded-pill px-3">{{
              device?.ipAddresses.join(", ")
            }}</span>
            <span class="text-muted font-monospace small">{{
              device?.macAddress || "No MAC Identity"
            }}</span>
          </div>
        </div>
        <div :class="['security-status p-3 rounded-3 text-center border', securityClass]">
          <div class="small fw-bold opacity-75 text-uppercase mb-1">Security Score</div>
          <div class="h3 mb-0 fw-bold">{{ device?.security?.score }}</div>
          <div class="small fw-bold">{{ device?.security?.level }} Risk</div>
        </div>
      </header>

      <div class="row g-4">
        <div class="col-xl-7">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-header border-bottom bg-transparent py-3 d-flex align-items-center">
              <CpuIcon :size="16" class="me-2 text-primary" />
              <h6 class="mb-0 fw-bold">System Profile</h6>
            </div>
            <div class="card-body">
              <div class="row g-4">
                <div class="col-md-6" v-if="device?.vendor">
                  <div class="text-label">Manufacturer</div>
                  <div class="fw-bold">{{ device?.vendor.company }}</div>
                  <div class="small text-muted">{{ device?.vendor.address }}</div>
                </div>
                <div class="col-md-6">
                  <div class="text-label">Platform / OS</div>
                  <div class="fw-bold">{{ device?.deviceType?.os }}</div>
                  <div class="small text-muted">
                    {{ device?.deviceType?.hardware || "Standard Hardware" }}
                  </div>
                </div>

                <!-- New Lifecycle Fields -->
                <div class="col-md-6">
                  <div class="text-label">First Discovered</div>
                  <div class="fw-bold small">{{ formatDate(device?.firstSeen) }}</div>
                </div>
                <div class="col-md-6">
                  <div class="text-label">Last Activity</div>
                  <div class="fw-bold small">{{ formatDate(device?.lastSeen) }}</div>
                </div>
              </div>

              <div
                v-if="device?.security?.triggeredRules?.length"
                class="mt-4 p-3 bg-danger-subtle text-danger rounded border border-danger-subtle"
              >
                <div class="d-flex align-items-center mb-2">
                  <AlertCircleIcon :size="16" class="me-2" />
                  <h6 class="small fw-bold text-uppercase mb-0">Security Alerts</h6>
                </div>
                <ul class="mb-0 small ps-3">
                  <li v-for="rule in device?.security?.triggeredRules" :key="rule">{{ rule }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-header border-bottom bg-transparent py-3 d-flex align-items-center">
              <NetworkIcon :size="16" class="me-2 text-primary" />
              <h6 class="mb-0 fw-bold">Active Ports</h6>
            </div>
            <div class="list-group list-group-flush">
              <div
                v-for="port in device?.ports"
                :key="port.port"
                class="list-group-item p-3 border-0 border-bottom"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <div class="fw-bold">Port {{ port.port }}</div>
                  <span class="badge bg-success-subtle text-success border border-success-subtle">{{
                    port.service
                  }}</span>
                </div>

                <div v-if="port.certificate" class="mt-3 p-2 bg-body-tertiary rounded border small">
                  <div class="d-flex align-items-center mb-2 text-label extra-small">
                    <FileLockIcon :size="12" class="me-1" />
                    SSL Certificate Subject
                  </div>
                  <div class="fw-bold text-break">{{ port.certificate.subject.commonName }}</div>
                  <div class="mt-2 text-label extra-small">Issuer</div>
                  <div class="text-muted text-break">{{ port.certificate.issuer.commonName }}</div>
                </div>
              </div>
              <div v-if="!device?.ports?.length" class="p-4 text-center text-muted small fw-light">
                No open ports identified during scan.
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header border-bottom bg-transparent py-3 d-flex align-items-center">
              <RadioIcon :size="16" class="me-2 text-primary" />
              <h6 class="mb-0 fw-bold">Discovery Metadata (mDNS)</h6>
            </div>
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3">Service ID</th>
                    <th>Protocol</th>
                    <th>Records</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="service in device?.mdnsServices" :key="service.name">
                    <td class="ps-3 py-3">
                      <div class="fw-bold text-nowrap">{{ service.name }}</div>
                      <div class="small text-muted font-monospace">{{ service.type }}</div>
                    </td>
                    <td>
                      <span class="badge border text-dark font-monospace"
                        >{{ service.port }} / {{ service.protocol.toUpperCase() }}</span
                      >
                    </td>
                    <td>
                      <div class="d-flex flex-wrap gap-2">
                        <span
                          v-for="(val, key) in service.txt"
                          :key="key"
                          class="badge bg-light text-dark font-monospace extra-small border"
                        >
                          {{ key }}: {{ val }}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import {
  Layout as LayoutIcon,
  Cpu as CpuIcon,
  Network as NetworkIcon,
  AlertCircle as AlertCircleIcon,
  FileLock as FileLockIcon,
  Radio as RadioIcon,
} from "@lucide/vue"
import { type MachineInfo } from "@pingpong/shared"

const props = defineProps<{
  device?: MachineInfo
}>()

const cleanHostname = (name: string): string =>
  name ? name.replace(/\\032/g, " ") : "Unnamed Device"

const formatDate = (epoch?: number): string => {
  if (!epoch) return "Unknown"
  // Assuming epoch is in milliseconds. If seconds, multiply by 1000.
  const date = new Date(epoch)
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const securityClass = computed<string>(() => {
  if (!props.device) return ""
  const level = props.device?.security?.level
  return level === "High"
    ? "bg-danger-subtle text-danger border-danger-subtle"
    : level === "Medium"
      ? "bg-warning-subtle text-warning-emphasis border-warning-subtle"
      : "bg-success-subtle text-success border-success-subtle"
})
</script>

<style scoped>
.device-details {
  flex: 1;
  background: var(--bs-tertiary-bg);
}
.text-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--bs-secondary);
  font-weight: 700;
  margin-bottom: 2px;
}
.extra-small {
  font-size: 0.7rem;
}
.security-status {
  min-width: 150px;
}
.card {
  border-radius: 0.75rem;
}
</style>
