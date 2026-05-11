import { type DevicePrediction, type MachineInfo } from "@pingpong/shared"

/**
 * Identifies the specific PlayStation model based on MAC address and Vendor name.
 */
function getPlayStationEdition(mac: string, vendorName: string) {
  const prefix = mac.replace(/[:.-]/g, "").substring(0, 6).toUpperCase()
  const vendor = vendorName.toLowerCase()

  // Check for Sony's gaming divisions
  const isSonyGaming = vendor.includes("sony interactive") || vendor.includes("sony computer")

  if (!isSonyGaming) return undefined

  // PlayStation 5 (Current Gen)
  // Common OUIs: 00:D9:D1, 70:AF:24, E4:AA:EA
  if (["00D9D1", "70AF24", "E4AAEA"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "PlayStation 5 System Software",
      hardware: "PlayStation 5",
    }
  }

  // PlayStation 4 / Pro (Last Gen)
  // Common OUIs: BC:60:A7, FC:0F:E6, 1C:66:6D, 2C:CC:44, F8:46:1C
  if (["BC60A7", "FC0FE6", "1C666D", "2CCC44", "F8461C"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "Orbis OS",
      hardware: "PlayStation 4",
    }
  }

  // PlayStation 3 / Vita / PSP (Legacy)
  // Common OUIs: 00:04:1F, 00:13:15, 00:1F:A7, 00:24:8D, D8:6B:F7
  if (["00041F", "001315", "001FA7", "00248D", "D86BF7"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "CellOS / XMB",
      hardware: "PlayStation 3 or Legacy Handheld",
    }
  }

  // Fallback for Sony consoles with unlisted or new OUI prefixes
  return {
    type: "Games Console",
    os: "PlayStation System Software",
    hardware: "Sony PlayStation",
  }
}

/**
 * Detects Xbox edition based on MAC prefix and Vendor strings.
 */
function identifyXbox(mac: string, vendorName: string) {
  const prefix = mac.replace(/[:.-]/g, "").substring(0, 6).toUpperCase()
  const vendor = vendorName.toLowerCase()
  const isMicrosoft = vendor.includes("microsoft")

  // Xbox Series X | S (Newest)
  if (isMicrosoft && ["501AC5", "DCE994", "281878"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "Xbox System Software (Scarlett)",
      hardware: "Xbox Series X/S",
    }
  }

  // Xbox One / One S / One X
  if (isMicrosoft && ["7CC0AA", "7CED8D", "985FD3", "B4AE2B"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "Xbox System Software (Durango)",
      hardware: "Xbox One",
    }
  }

  // Xbox 360 (Legacy)
  if (isMicrosoft && ["001DD8", "002248", "002500"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "Xbox 360 Dashboard",
      hardware: "Xbox 360",
    }
  }

  // Generic Microsoft Device fallback (could be Surface, PC, etc.)
  if (isMicrosoft) {
    return {
      type: "Workstation",
      os: "Windows",
      hardware: "Microsoft Corporation Device",
    }
  }

  return undefined
}

/**
 * Identifies the specific Nintendo model based on MAC address and Vendor name.
 */
function getNintendoEdition(mac: string, vendorName: string) {
  const prefix = mac.replace(/[:.-]/g, "").substring(0, 6).toUpperCase()
  const vendor = vendorName.toLowerCase()

  const isNintendo = vendor.includes("nintendo")

  if (!isNintendo) return undefined

  // Nintendo Switch
  // Common OUIs: 3C:15:C2, 64:B5:C6, 98:B6:E9, E0:E2:E6, 18:C2:BF
  if (
    ["342FBD", "3C15C2", "64B5C6", "98B6E9", "E0E2E6", "18C2BF", "CCFB65", "9458CB"].includes(
      prefix,
    )
  ) {
    return {
      type: "Games Console",
      os: "Nintendo Switch System Software (Horizon)",
      hardware: "Nintendo Switch",
    }
  }

  // Nintendo Wii U / 3DS (Previous Gen)
  // Common OUIs: 2C:10:C1, 58:2F:40, B8:AE:6E, E4:10:7B
  if (["2C10C1", "582F40", "B8AE6E", "E4107B", "DC68EB"].includes(prefix)) {
    return {
      type: "Games Console",
      os: "Nintendo 3DS/WiiU OS",
      hardware: "Nintendo Wii U or 3DS Family",
    }
  }

  // Nintendo Wii / DS / DSi (Legacy)
  // Common OUIs: 00:09:BF, 00:16:56, 00:17:AB, 00:19:1D, 00:1B:7A, 00:1E:A9, 00:21:47, 00:22:AA, 00:23:31, 00:24:1E, 00:25:A0, 00:26:59
  if (prefix.startsWith("00")) {
    return {
      type: "Games Console",
      os: "Wii Menu / DS Firmware",
      hardware: "Nintendo Wii or DS",
    }
  }

  // Fallback for new Nintendo hardware
  return {
    type: "Games Console",
    os: "Nintendo System Software",
    hardware: "Nintendo Device",
  }
}

/**
 * Identifies Samsung device type and OS based on MAC and Vendor strings.
 */
function identifySamsung(mac: string, vendorName: string, services: any[]) {
  const prefix = mac.replace(/[:.-]/g, "").substring(0, 6).toUpperCase()
  const vendor = vendorName.toLowerCase()

  if (!vendor.includes("samsung")) return undefined

  // 1. Samsung Smart TVs (Tizen OS)
  // Check for mDNS service: _samsung-tv._tcp or _dial._tcp
  const isTV = services.some(
    (s) => s.type?.includes("samsung-tv") || s.type?.includes("sec-videoshare"),
  )

  if (isTV) {
    return {
      type: "Media Player",
      os: "Tizen OS",
      hardware: "Samsung Smart TV",
    }
  }

  // 2. Samsung Mobile (Android)
  // Most modern Samsung OUIs fall here.
  // We exclude TVs based on service discovery above.
  return {
    type: "Mobile",
    os: "Android (One UI)",
    hardware: "Samsung Galaxy Device",
  }
}

/**
 * Identifies Google device type and OS based on MAC, Vendor, and mDNS services.
 */
function identifyGoogle(mac: string, vendorName: string, services: any[]) {
  const prefix = mac.replace(/[:.-]/g, "").substring(0, 6).toUpperCase()
  const vendor = vendorName.toLowerCase()

  if (!vendor.includes("google")) return undefined

  const serviceTypes = services.map((s) => s.type?.toLowerCase())

  // 1. Cast Devices (Chromecast, Nest Hub, Google Home)
  if (serviceTypes.some((s) => s.includes("googlecast"))) {
    return {
      type: "Media Player",
      os: "Cast OS / Android TV",
      hardware: "Google Nest or Chromecast",
    }
  }

  // 2. Networking (Google WiFi / Nest WiFi)
  // These often show open ports like 53 (DNS) or 443 (Admin)
  if (serviceTypes.some((s) => s.includes("googlezone"))) {
    return {
      type: "Infrastructure",
      os: "ChromeOS Variant",
      hardware: "Google Nest WiFi",
    }
  }

  // 3. Pixel Devices (Android)
  return {
    type: "Mobile",
    os: "Android (Pixel Edition)",
    hardware: "Google Pixel Device",
  }
}

/**
 * Identifies TP-Link Tapo IoT devices.
 */
function identifyTapo(mac: string, vendorName: string, ports: number[]) {
  const vendor = vendorName.toLowerCase()

  // Tapo devices are almost exclusively TP-Link or Espressif chips
  const isTapoVendor = vendor.includes("tp-link") || vendor.includes("espressif")

  if (!isTapoVendor) return undefined

  // 1. Tapo Smart Cameras (C100, C200, etc.)
  // These usually have ONVIF (8899) or RTSP (554) open
  if (ports.includes(8899) || ports.includes(554)) {
    return {
      type: "IoT",
      os: "Embedded Linux",
      hardware: "TP-Link Tapo Camera",
    }
  }

  // 2. Tapo Smart Plugs/Bulbs (P100, L530)
  // These use port 9999 for local management/discovery
  if (ports.includes(9999)) {
    return {
      type: "IoT",
      os: "FreeRTOS",
      hardware: "TP-Link Tapo Smart Device",
    }
  }

  // Fallback for identified TP-Link IoT hardware
  return {
    type: "IoT",
    os: "Proprietary RTOS",
    hardware: "TP-Link IoT Device",
  }
}

export function classifyDevice(machine: MachineInfo): DevicePrediction {
  const prediction: DevicePrediction = { type: "Unknown", os: "Unknown" }
  try {
    const services = machine.mdnsServices.map((s) => s.type.toLowerCase())
    const host = (machine.hostname || "").toLowerCase()
    const vendor = (machine.vendor?.company || "").toLowerCase()
    const openPorts = machine.ports?.map((p) => p.port) || []
    const mac = (machine.macAddress || "").toLowerCase()

    const tapo = identifyTapo(mac, vendor, openPorts)
    if (tapo) {
      return tapo
    }

    const goog = identifyGoogle(mac, vendor, machine.mdnsServices)
    if (goog) {
      return goog
    }

    const sam = identifySamsung(mac, vendor, machine.mdnsServices)
    if (sam) {
      return sam
    }

    const xbox = identifyXbox(mac, vendor)
    if (xbox) {
      return xbox
    }

    const ps = getPlayStationEdition(mac, vendor)
    if (ps) {
      return ps
    }

    const nin = getNintendoEdition(mac, vendor)
    if (nin) {
      return nin
    }

    // 1. Infrastructure (Routers/Switches)
    if (host.includes("gateway") || host.includes("router") || openPorts.includes(53)) {
      return { type: "Infrastructure", os: "Embedded Linux" }
    }

    // 2. Media Players (Cast/AirPlay)
    if (services.some((s) => s.includes("googlecast") || s.includes("airplay"))) {
      const isApple = vendor.includes("apple")
      return {
        type: "Media",
        os: isApple ? "tvOS/iOS" : "Android/CastOS",
      }
    }

    // 3. Printers
    if (
      services.some((s) => s.includes("printer") || s.includes("ipp")) ||
      openPorts.includes(631)
    ) {
      return { type: "Printer", os: "Firmware" }
    }

    // 4. Desktop/Laptops
    if (openPorts.includes(3389)) return { type: "Desktop", os: "Windows" }
    if (services.some((s) => s.includes("smb") || s.includes("adisk"))) {
      return { type: "Desktop", os: vendor.includes("apple") ? "macOS" : "Windows/Linux" }
    }

    // 5. Mobile Devices
    if (vendor.includes("apple") && !openPorts.includes(22)) {
      return { type: "Mobile", os: "iOS" }
    }
    if (vendor.includes("google") || vendor.includes("samsung")) {
      return { type: "Mobile", os: "Android" }
    }

    // 6. IoT (Smart Home)
    if (vendor.includes("espressif") || vendor.includes("tuya") || vendor.includes("lifx")) {
      return { type: "IoT", os: "Real-time OS" }
    }

    if (vendor.includes("nest labs")) {
      return { type: "IoT", os: "nest", hardware: "Nest Thermostat" }
    }

    if (vendor.includes("meross")) {
      return { type: "IoT", os: "meross", hardware: "Meross IoT" }
    }

    if (vendor.includes("raspberry")) {
      return { type: "sbc", os: "linux", hardware: "Raspberry Pi SBC" }
    }

    return prediction
  } catch (err) {
    console.error(err)
  }
  return prediction
}
