import { createServer } from "http"
import next from "next"

const port = parseInt(process.env.PORT || "3000", 10)
const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const { initSocketServer } = await import("./lib/socket/server")
  const httpServer = createServer(handle)

  initSocketServer(httpServer)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server attached`)
  })
})
