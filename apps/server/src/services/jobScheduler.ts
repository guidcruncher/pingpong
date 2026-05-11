import cron from "node-cron"

export type ScheduledTask = (ctx: any) => Promise<void | any>

export interface IScheduledJob {
  cron: string
  title: string
  onBoot?: ScheduledTask
  task: ScheduledTask
}

export const register = async (job: IScheduledJob): Promise<any> => {
  let isRunning = false
  console.log(`Registering cron job "${job.title}"`)

  const task = cron.schedule(job.cron, async (ctx) => {
    if (isRunning) {
      console.log(`Skipping job "${job.title}": Task is already running.`)
      return
    }

    try {
      isRunning = true
      console.log(`Starting cron job "${job.title}"`)
      console.log(`Task started at ${ctx.triggeredAt.toISOString()}`)
      console.log(`Scheduled for: ${ctx.dateLocalIso}`)
      await job.task(ctx)
      console.log(`Finished cron job "${job.title}"`)
    } catch (err) {
      console.log(`Error running cron job "${job.title}"`, err)
    } finally {
      isRunning = false
    }
  })

  if (job.onBoot) {
    const now = new Date()
    console.log(`Starting run at boot of cron job "${job.title}"`)
    job.onBoot({ triggeredAt: now, dateLocalIso: now.toISOString() })
    console.log(`Finished run at boot of cron job "${job.title}"`)
  }

  console.log(`Registered cron job "${job.title}"`)
  return task.start()
}
