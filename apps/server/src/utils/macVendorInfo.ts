import { type VendorInfo } from "@pingpong/shared"

export interface MacVendorData extends VendorInfo {
  success: boolean
  found: boolean
}

const OUI_CACHE = new Map<string, MacVendorData>()

/**
 * Checks if a MAC address is locally administered (randomized)
 * by checking the U/L bit of the first byte.
 */
export function isMacRandomized(mac: string): boolean {
  // Remove separators and get the first byte
  const cleanMac = mac.replace(/[:.-]/g, "")
  if (cleanMac.length < 2) return false

  const firstByte = parseInt(cleanMac.substring(0, 2), 16)

  // The U/L bit is the second bit (0x02)
  // (firstByte & 0b00000010) !== 0
  return (firstByte & 0x02) !== 0
}

export async function fetchMacVendorInfo(mac: string): Promise<VendorInfo | undefined> {
  if (!mac || mac === "00:00:00:00:00:00") return undefined

  if (isMacRandomized(mac)) {
    return {
      macPrefix: "",
      company: "",
      address: "",
      country: "",
      blockStart: "",
      blockEnd: "",
      blockSize: 0,
      blockType: "",
      updated: "",
      isRand: true,
      isPrivate: false,
    }
  }

  // Extract OUI (e.g., "F8:0F:F9")
  const oui = mac.substring(0, 8).toUpperCase()

  if (OUI_CACHE.has(oui)) {
    return OUI_CACHE.get(oui)!
  }

  try {
    const response = await fetch(`https://api.maclookup.app/v2/macs/${mac}`)

    if (response.status === 429) {
      console.warn("Rate limit hit. Skipping vendor lookup.")
      return undefined
    }

    if (!response.ok) return undefined

    const result = (await response.json()) as MacVendorData

    if (result.success && result.found) {
      OUI_CACHE.set(oui, result)
      return result
    }
  } catch (error) {
    console.error(`Vendor API error for ${mac}:`, error)
    return undefined
  }

  return {
    macPrefix: "",
    company: "",
    address: "",
    country: "",
    blockStart: "",
    blockEnd: "",
    blockSize: 0,
    blockType: "",
    updated: "",
    isRand: true,
    isPrivate: false,
  }
}
