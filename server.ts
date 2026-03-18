import { createServer } from "http"
import next from "next"
import { initSocketServer } from "./lib/socket/server"

const port = parseInt(process.env.PORT || "3000", 10)
const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  // Socket.io 초기화
  initSocketServer(httpServer)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Socket.io server initialized`)
  })
})
