<template>
  <BApp>
    <Header />
    <BContainer fluid="xxl">
      <BRow class="d-md-none"
        ><BCol>
          <BButton
            variant="link"
            underline-opacity="0"
            aria-controls="offcanvas-sidebar"
            :aria-expanded="sidebarVisible ? 'true' : 'false'"
            @click="showSidebar"
            >&lt; Inventory</BButton
          > </BCol
        >
        </BRow
      >
      <BRow>
        <BCol md="3" class="scrollable-column">
          <BOffcanvas
            id="offcanvas-sidebar"
            v-model="sidebarVisible"
            title="Inventory"
            placement="start"
            responsive="md"
          >
            <DeviceList
              :devices="filteredDevices"
              :selected-id="selectedId"
              @select="selectDevice"
            />
          </BOffcanvas>
        </BCol>
        <BCol md="9" class="scrollable-column">
          <DeviceDetail :device="selectedDevice" />
        </BCol>
      </BRow>
    </BContainer>
  </BApp>
</template>

<style scoped lang="scss">
// The styling below makes a colum scroll independently of the rest of the page if
//  its content is too large to fit in the current viewport
.scrollable-column {
  max-height: 100vh;
  overflow-y: auto;
  position: sticky;
  top: 0;
}
</style>

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

const sidebarVisible = ref(false)

const showSidebar = () => {
  sidebarVisible.value = true
}

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
