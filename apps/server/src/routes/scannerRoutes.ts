import type { FastifyInstance } from "fastify"
import { Type } from "@sinclair/typebox"
import { runNetworkScanner } from "../services/networkScanner.js"
import { MachineInfoSchema } from "../schemas/machineInfo.js"
import { MachineRepository } from "../db/machineRepository.js"

export async function registerScannerRoutes(app: FastifyInstance) {
  const machineRepository = new MachineRepository()

  app.get(
    "/api/scanner",
    {
      schema: {
        tags: ["discovery"],
        summary: "Launch a network discovery and return results",
        response: {
          200: Type.Array(MachineInfoSchema),
        },
      },
    },
    async (_req, _reply) => {
      // runNetworkScanner returns Promise<MachineInfo[]>
      const devices = await runNetworkScanner(machineRepository)
      return devices
    },
  )
}
