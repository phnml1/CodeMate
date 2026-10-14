import { createHmac, randomUUID } from "crypto"
import { execFile } from "child_process"
import { createServer, type Server as HttpServer } from "http"
import { createServer as createTcpServer } from "net"
import { promisify } from "util"
import { spawn, type ChildProcess } from "child_process"
import Redis from "ioredis"
import { io as createClient, type Socket } from "socket.io-client"
import { createCollaborationRoomSocketToken, COLLABORATION_PRESENCE_CONVERGENCE_MS } from "../lib/collaboration/socket-token"

const run = promisify(execFile)
const secret = `fault-test-${randomUUID()}`
const scope = `fault-${randomUUID().slice(0, 8)}`
const containerName = `codemate-fault-${randomUUID().slice(0, 12)}`
const children: ChildProcess[] = []
const clients: Socket[] = []
let mockNext: HttpServer | undefined
let containerCreated = false

async function freePort() {
  const server = createTcpServer()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Could not allocate a port")
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

async function waitFor(label: string, check: () => Promise<boolean>, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (await check()) return
    } catch { /* The service may still be starting or restarting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function health(url: string) {
  return fetch(new URL("/health", url), { signal: AbortSignal.timeout(1_000) })
}

async function internalPost(url: string, path: string, body: unknown) {
  return fetch(new URL(path, url), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-socket-secret": secret, "x-collaboration-scope": scope },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3_000),
  })
}

function socketAuthToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, userName: userId, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url")
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`
}

async function join(url: string, roomId: string, userId: string) {
  const client = createClient(url, { transports: ["websocket"], autoConnect: false, reconnection: false, auth: { token: socketAuthToken(userId) } })
  clients.push(client)
  await new Promise<void>((resolve, reject) => {
    client.once("connect", resolve)
    client.once("connect_error", reject)
    client.connect()
  })
  const { token } = createCollaborationRoomSocketToken({ roomId, userId, userName: userId, memberId: `member-${userId}`, capacity: 8 })
  const ack = await client.timeout(5_000).emitWithAck("collaboration:join", { token })
  if (!ack.ok) throw new Error(`Join failed: ${JSON.stringify(ack)}`)
  return client
}

async function startSocket(port: number, redisUrl: string, nextUrl: string) {
  const child = spawn(process.execPath, ["--import", "tsx", "socket-server/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test", PORT: String(port), REDIS_URL: redisUrl, NEXTJS_URL: nextUrl,
      SOCKET_INTERNAL_SECRET: secret, COLLABORATION_PRESENCE_SCOPE: scope },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })
  children.push(child)
  let output = ""
  child.stdout?.on("data", (chunk) => { output = (output + chunk.toString()).slice(-8_000) })
  child.stderr?.on("data", (chunk) => { output = (output + chunk.toString()).slice(-8_000) })
  const url = `http://127.0.0.1:${port}`
  try {
    await waitFor(`Socket ${port} health`, async () => (await health(url)).status === 200)
  } catch (error) {
    throw new Error(`${error}\n${output}`)
  }
  return { child, url }
}

async function cleanup() {
  for (const client of clients) client.disconnect()
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGKILL")
  }
  if (mockNext) await new Promise<void>((resolve) => mockNext!.close(() => resolve()))
  if (containerCreated) await run("docker", ["rm", "-f", containerName]).catch(() => {})
}

async function main() {
  process.env.SOCKET_INTERNAL_SECRET = secret
  process.env.COLLABORATION_PRESENCE_SCOPE = scope
  const redisPort = await freePort()
  const firstPort = await freePort()
  const secondPort = await freePort()
  mockNext = createServer((_request, response) => { response.writeHead(200); response.end() })
  await new Promise<void>((resolve) => mockNext!.listen(0, "127.0.0.1", resolve))
  const nextAddress = mockNext.address()
  if (!nextAddress || typeof nextAddress === "string") throw new Error("Mock Next server has no port")
  const nextUrl = `http://127.0.0.1:${nextAddress.port}`

  await run("docker", ["run", "-d", "--name", containerName, "--publish", `127.0.0.1:${redisPort}:6379`, "redis:7-alpine"])
  containerCreated = true
  const redisUrl = `redis://127.0.0.1:${redisPort}`
  await waitFor("isolated Redis", async () => {
    const redis = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 500, maxRetriesPerRequest: 0 })
    try { await redis.connect(); return (await redis.ping()) === "PONG" }
    finally { redis.disconnect() }
  })
  console.log(`Isolated Redis ready on ${redisPort}`)

  const first = await startSocket(firstPort, redisUrl, nextUrl)
  const second = await startSocket(secondPort, redisUrl, nextUrl)
  const roomId = `fault-room-${randomUUID()}`
  const alice = await join(first.url, roomId, "alice")
  const bob = await join(second.url, roomId, "bob")
  const receive = new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Cross-replica message timed out")), 5_000)
    bob.once("collaboration:message", (message) => { clearTimeout(timeout); resolve(message) })
  })
  const emitResponse = await internalPost(first.url, "/internal/emit", { room: `collaboration:${roomId}`, event: "collaboration:message", data: { id: "fault-message" } })
  if (emitResponse.status !== 200 || (await receive as { id: string }).id !== "fault-message") throw new Error("Cross-replica broadcast failed")
  console.log("Cross-replica broadcast passed")

  const rates = await Promise.all(Array.from({ length: 11 }, (_, index) =>
    internalPost(index % 2 ? first.url : second.url, "/internal/collaboration/message-rate-limit", { roomId, userId: "rate-user", clientMessageId: `message-${index}` })
  ))
  if (rates.filter((response) => response.status === 200).length !== 10 || rates.filter((response) => response.status === 429).length !== 1) {
    throw new Error(`Cross-replica rate limit failed: ${rates.map((response) => response.status).join(",")}`)
  }
  console.log("Cross-replica rate limit passed (10 allowed, 1 rejected)")

  await run("docker", ["stop", containerName])
  await waitFor("both Socket health checks to fail closed", async () =>
    (await health(first.url)).status === 503 && (await health(second.url)).status === 503
  )
  const unavailable = await internalPost(second.url, "/internal/collaboration/message-rate-limit", { roomId, userId: "new-user" })
  if (unavailable.status !== 503) throw new Error(`Expected rate limiter 503 during Redis outage, got ${unavailable.status}`)
  console.log("Redis stop passed (both Socket nodes unhealthy, limiter 503)")

  await run("docker", ["start", containerName])
  await waitFor("Redis and both Socket nodes to recover", async () =>
    (await health(first.url)).status === 200 && (await health(second.url)).status === 200, 30_000
  )
  const rejoinedAlice = await join(first.url, roomId, "alice")
  const rejoinedBob = await join(second.url, roomId, "bob")
  const recoveredReceive = new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Post-restart broadcast timed out")), 5_000)
    rejoinedBob.once("collaboration:message", (message) => { clearTimeout(timeout); resolve(message) })
  })
  const recoveredEmit = await internalPost(first.url, "/internal/emit", { room: `collaboration:${roomId}`, event: "collaboration:message", data: { id: "recovered-message" } })
  if (recoveredEmit.status !== 200 || (await recoveredReceive as { id: string }).id !== "recovered-message") {
    throw new Error("Post-restart cross-replica broadcast failed")
  }
  console.log("Redis restart passed (rejoin and cross-replica broadcast)")

  const crashRoomId = `crash-room-${randomUUID()}`
  await join(first.url, crashRoomId, "crash-user")
  first.child.kill("SIGKILL")
  await waitFor("Socket process to exit", async () => first.child.exitCode !== null || first.child.signalCode !== null)
  if ((await health(second.url)).status !== 200) throw new Error("Surviving Socket node is unhealthy")
  console.log("Socket process kill passed (other node remains healthy)")

  await waitFor("crashed Socket lease to expire", async () => {
    const response = await internalPost(second.url, "/internal/collaboration/presence", { roomIds: [crashRoomId] })
    if (response.status !== 200) return false
    const body = await response.json() as { rooms: Array<{ users: unknown[] }> }
    return body.rooms[0]?.users.length === 0
  }, COLLABORATION_PRESENCE_CONVERGENCE_MS + 10_000)
  console.log("Crash convergence passed (stale presence removed)")
  alice.disconnect()
  rejoinedAlice.disconnect()
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(cleanup)
