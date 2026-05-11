<template>
  <div class="app-wrapper">
    <nav class="navbar navbar-expand navbar-dark bg-dark px-3">
      <div class="navbar-brand d-flex align-items-center fw-bold">
        <ShieldIcon class="me-2 text-primary" :size="20" />
        PingPong
      </div>
      <div class="ms-auto d-flex align-items-center">
        <button @click="toggleTheme" class="btn btn-outline-light btn-sm d-flex align-items-center">
          <component :is="theme === 'light' ? MoonIcon : SunIcon" class="me-2" :size="16" />
          <span class="text-capitalize">{{ theme }} Mode</span>
        </button>
      </div>
    </nav>

    <div class="toolbar">
      <div class="input-group input-group-sm w-auto">
        <span class="input-group-text border-end-0 bg-transparent">
          <SearchIcon :size="14" />
        </span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control border-start-0"
          placeholder="Search devices..."
        />
      </div>
      <div class="vr mx-3"></div>
      <div class="text-muted small">{{ filteredDevices.length }} Assets Found</div>
    </div>

    <div class="main-container">
      <DeviceList :devices="filteredDevices" :selected-id="selectedId" @select="selectDevice" />
      <DeviceDetail :device="selectedDevice" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from "vue"
import {
  Shield as ShieldIcon,
  Search as SearchIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
} from "@lucide/vue"
import { useNetworkClient } from "./composables/useNetworkClient"
import { type MachineInfo } from "@pingpong/shared"

const { listDevices } = useNetworkClient()

const theme = ref<"light" | "dark">((localStorage.getItem("theme") as "light" | "dark") || "light")
const searchQuery = ref<string>("")
const devices = ref<MachineInfo[]>([])
const selectedId = ref<number | null>(null)

const toggleTheme = (): void => {
  theme.value = theme.value === "light" ? "dark" : "light"
  localStorage.setItem("theme", theme.value)
}

watchEffect(() => {
  document.documentElement.setAttribute("data-bs-theme", theme.value)
})

onMounted(async () => {
  try {
    const response = await listDevices()
    if (response.ok) {
      devices.value = response.data ?? []
    }
  } catch (e) {
    console.error("Critical: Failed to load inventory source")
  }
})

const filteredDevices = computed<MachineInfo[]>(() => {
  const query = searchQuery.value.toLowerCase()
  return devices.value.filter(
    (d) =>
      d.hostname?.toLowerCase().includes(query) ||
      d.ipAddresses.some((ip) => ip.includes(query)) ||
      d.vendor?.company?.toLowerCase().includes(query),
  )
})

const selectedDevice = ref<MachineInfo | undefined>()

const selectDevice = (device: any): void => {
  selectedDevice.value = device
}
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}
.toolbar {
  padding: 0.6rem 1rem;
  background: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
  display: flex;
  align-items: center;
}
.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: var(--bs-tertiary-bg);
}
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
}
</style>
