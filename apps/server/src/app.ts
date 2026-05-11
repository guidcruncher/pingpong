import Fastify from "fastify"
import { registerScannerRoutes } from "./routes/scannerRoutes.js"
import { registerNetworkRoutes } from "./routes/networkRoutes.js"
import * as process from "node:process"
import fastifyStatic from "@fastify/static"
import path from "node:path"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { registerScheduledJobs } from "./scheduler/index.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isProduction: boolean = process.env.NODE_ENV === "production"

export const createServer = async () => {
  const app = Fastify({})

  if (isProduction) {
    app.register(fastifyStatic, {
      root: path.join(__dirname, "..", "..", "client", "dist"),
      prefix: "/",
    })

    app.setNotFoundHandler((request, reply) => {
      return reply.sendFile("index.html")
    })
  }

  await registerScannerRoutes(app)
  await registerNetworkRoutes(app)

  await registerScheduledJobs()
  return app
}

console.log("Starting Server")
createServer()
  .then((app) => {
    app.listen({ port: isProduction ? 5173 : 3001, host: isProduction ? "0.0.0.0" : "127.0.0.1" })
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
