import { type MdnsService, type MachineInfo } from "@pingpong/shared"

export interface IDiscovery {
  discover(opts?: any): Promise<MachineInfo[]>
}
