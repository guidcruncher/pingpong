import { useRestClient } from "./useRestClient"
import { type MachineInfo } from "@pingpong/shared"

export function useNetworkClient() {
  const { get } = useRestClient({ baseUrl: "/api" })

  const listDevices = () => get<MachineInfo[]>("/network")

  return {
    listDevices,
  }
}
