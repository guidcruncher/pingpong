import type { FastifyInstance } from "fastify"
import { Type } from "@sinclair/typebox"
import { MachineInfoSchema } from "../schemas/machineInfo.js"
import { MachineRepository } from "../db/machineRepository.js"

export async function registerNetworkRoutes(app: FastifyInstance) {
  const machineRepository = new MachineRepository()

  app.get(
    "/api/network",
    {
      schema: {
        tags: ["network"],
        summary: "Gets the current Network Inventory",
        response: {
          200: Type.Array(MachineInfoSchema),
        },
      },
    },
    async (_req, _reply) => {
      const devices = machineRepository.listAll()
      return devices
    },
  )
}
