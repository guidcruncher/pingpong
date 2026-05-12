import { register, type IScheduledJob } from "../services/jobScheduler.js"
import { runNetworkScanner } from "../services/networkScanner.js"
import { MachineRepository } from "../db/machineRepository.js"

export class NetworkScanJob implements IScheduledJob {
  cron: string = "*/15 * * * *"
  title: string = "Network Scanner"

  async onBoot(ctx: any): Promise<any> {
    return this.task(ctx)
  }

  async task(ctx: any): Promise<any> {
    const machineRepository = new MachineRepository()
    return runNetworkScanner(machineRepository)
  }
}
