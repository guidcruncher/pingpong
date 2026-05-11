import { register, type IScheduledJob } from "../services/jobScheduler.js"
import { NetworkScanJob } from "./networkScanJob.js"

export const registerScheduledJobs = async () => {
  await register(new NetworkScanJob())
}
