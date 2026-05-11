<template>
  <div class="device-list border-end bg-body">
    <div class="list-group list-group-flush">
      <button
        v-for="device in devices"
        :key="device.id"
        @click="$emit('select', device)"
        class="list-group-item list-group-item-action p-3 border-0 border-bottom"
        :class="{ active: selectedId === device.id }"
      >
        <div class="d-flex justify-content-between align-items-start">
          <span class="fw-bold text-truncate pe-2">{{
            cleanHostname(device?.hostname ?? "")
          }}</span>
          <span class="badge bg-secondary-subtle text-secondary extra-small border">{{
            device?.deviceType?.type
          }}</span>
        </div>
        <div class="small text-primary font-monospace mt-1">{{ device.ipAddresses[0] }}</div>
        <div class="small text-muted d-flex align-items-center mt-1 opacity-75">
          <MonitorIcon :size="12" class="me-1" />
          {{ device.vendor?.company || "Vendor Unknown" }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor as MonitorIcon } from "@lucide/vue"
import { type MachineInfo } from "@pingpong/shared"

defineProps<{
  devices: MachineInfo[]
  selectedId: number | null
}>()

defineEmits<{
  (e: "select", device: any): void
}>()

const cleanHostname = (name: string): string =>
  name ? name.replace(/\\032/g, " ") : "Unnamed Asset"
</script>

<style scoped>
.device-list {
  width: 360px;
}
.extra-small {
  font-size: 0.65rem;
  padding: 0.35em 0.65em;
}
.list-group-item.active {
  background-color: rgba(13, 110, 253, 0.08);
  border-left: 4px solid #0d6efd;
  color: var(--bs-body-color);
}
@media (max-width: 768px) {
  .device-list {
    width: 100%;
    height: 35%;
  }
}
</style>
