import { networkInterfaces } from "os";
import { telemetry } from "./telemetry.ts";
import { cleanExpiredTableHolds, getTableRowCounts } from "./db.ts";
import { corsHeaders, jsonResponse, errorResponse, BARISTA_PIN } from "./routes/helpers.ts";
import { handleStaticRoutes } from "./routes/static.ts";
import { handleClusterRoutes } from "./routes/cluster.ts";
import { handleApiRoutes, type ApiClientContext } from "./routes/api.ts";

const PORT = Number(process.env.PORT) || 4000;

// Telemetry & Rate Limiting state
const startTime = Date.now();
let totalRequestsHandled = 0;
let requestsInLastSecond = 0;
let currentRps = 0;
let activeWsClients = 0;

const ipRateLimits = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(ip: string, isOrder = false): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return false;
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  if (!limit || now > limit.expiresAt) {
    ipRateLimits.set(ip, { count: 1, expiresAt: now + 60_000 });
    return false;
  }
  limit.count++;
  const threshold = isOrder ? 10 : 200; // 10 orders/min or 200 general req/min per external IP
  return limit.count > threshold;
}

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

// ---------------- Bun.serve Engine ----------------

export const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0", // Accessible across LAN / WiFi hotspot for mobile devices

  websocket: {
    open(ws) {
      activeWsClients++;
      ws.subscribe("all-clients");
    },
    message(ws, message) {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.action === "subscribe_barista") {
          ws.subscribe("barista-kds");
          ws.send(JSON.stringify({ event: "subscribed", channel: "barista-kds" }));
        } else if (payload.action === "subscribe_dashboard") {
          ws.subscribe("dashboard-clients");
          ws.send(JSON.stringify({ event: "subscribed", channel: "dashboard-clients" }));
          // Immediately send current cluster state
          ws.send(
            JSON.stringify({
              event: "telemetry:cluster_state",
              data: telemetry.getClusterState(),
            })
          );
        } else if (payload.action === "audience_join") {
          ws.subscribe("audience-clients");
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "audience:joined",
              data: {
                clientId: payload.clientId,
                clientName: payload.clientName || "کاربر سالن",
                timestamp: Date.now(),
              },
            })
          );
          ws.send(JSON.stringify({ event: "subscribed", channel: "audience-clients" }));
        }
      } catch {
        // Ignore malformed WS packets
      }
    },
    close(ws) {
      activeWsClients = Math.max(0, activeWsClients - 1);
      ws.unsubscribe("all-clients");
      ws.unsubscribe("barista-kds");
      ws.unsubscribe("dashboard-clients");
    },
  },

  async fetch(req, server) {
    totalRequestsHandled++;
    requestsInLastSecond++;
    const t0 = performance.now();

    const url = new URL(req.url);
    const isHead = req.method === "HEAD";
    const method = isHead ? "GET" : req.method;
    const clientIp =
      req.headers.get("x-simulated-ip") ||
      req.headers.get("x-forwarded-for") ||
      url.searchParams.get("simulate_ip") ||
      url.searchParams.get("ip") ||
      "127.0.0.1";

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. WebSocket Upgrade route
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // 2. Static Assets & Pages (Docs, Dashboard, Join, Frontend Storefront)
    const staticRes = await handleStaticRoutes(url);
    if (staticRes) return staticRes;

    // 3. Cluster & Telemetry Control Routes
    const clusterRes = handleClusterRoutes(url, method);
    if (clusterRes) return clusterRes;

    // 4. RESTful API Core Engine
    if (url.pathname.startsWith("/api/v1")) {
      const path = url.pathname.replace("/api/v1", "");

      // Extract client identity
      const rawClientId =
        req.headers.get("x-client-id") ||
        url.searchParams.get("client_id") ||
        `sim_${clientIp.replace(/[^0-9]/g, "")}`;
      const rawHeaderName = req.headers.get("x-audience-name");
      let decodedHeaderName: string | null = null;
      if (rawHeaderName) {
        try {
          decodedHeaderName = decodeURIComponent(rawHeaderName);
        } catch {
          decodedHeaderName = rawHeaderName;
        }
      }
      const clientLabel =
        decodedHeaderName ||
        url.searchParams.get("name") ||
        `کاربر ${rawClientId.slice(-4)}`;
      const isAudience = req.headers.get("x-client-id") !== null;

      const tGatewayStart = performance.now();
      const traceSteps: Array<{
        node: string;
        durationUs: number;
        status: "ok" | "miss" | "hit" | "rejected";
        detail: string;
      }> = [];

      // Security Check A: Zero-Trust WAF Filter (SQLi Inspection)
      const sqliPattern =
        /('|\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|XP_|BENCHMARK|SLEEP)\b|--|\/\*)/i;
      const queryString = url.search;
      const isSqli = sqliPattern.test(queryString);

      if (isSqli) {
        const gatewayUs = Math.round((performance.now() - tGatewayStart) * 1000);
        traceSteps.push({
          node: "gateway",
          durationUs: gatewayUs,
          status: "rejected",
          detail: "WAF Intercept: Malicious SQLi signature blocked",
        });

        const totalUs = Math.round((performance.now() - t0) * 1000);
        telemetry.recordTrace({
          id: `trc_${Math.random().toString(36).substring(2, 8)}`,
          clientId: rawClientId,
          clientLabel,
          isAudience,
          method,
          endpoint: url.pathname + url.search,
          status: 403,
          outcome: "waf_blocked",
          totalDurationUs: totalUs,
          steps: traceSteps,
          workerNode: "worker_1",
          timestamp: Date.now(),
        });

        server.publish(
          "dashboard-clients",
          JSON.stringify({
            event: "telemetry:threat_detected",
            data: {
              type: "SQL_INJECTION_EXPLOIT",
              originIp: clientIp,
              clientLabel,
              endpoint: url.pathname,
              reason: "شناسایی تلاش برای تزریق SQL توسط WAF و توقف قبل از ورود به سرور",
              status: 403,
              timestamp: new Date().toISOString(),
            },
          })
        );

        return errorResponse("دسترسی مسدود شد: توکن مشکوک SQL Injection توسط WAF مهار گردید.", 403);
      }

      // Security Check B: Rate Limiter Protection
      const isOrderPost = method === "POST" && (path === "/orders" || path === "/orders/");
      if (isRateLimited(clientIp, isOrderPost)) {
        const gatewayUs = Math.round((performance.now() - tGatewayStart) * 1000);
        traceSteps.push({
          node: "gateway",
          durationUs: gatewayUs,
          status: "rejected",
          detail: isOrderPost
            ? "WAF Intercept: Order Burst Rate-Limit Exceeded (10 orders/min)"
            : "WAF Intercept: DDoS/Burst Rate-Limit Exceeded (200 req/min)",
        });

        const totalUs = Math.round((performance.now() - t0) * 1000);
        telemetry.recordTrace({
          id: `trc_${Math.random().toString(36).substring(2, 8)}`,
          clientId: rawClientId,
          clientLabel,
          isAudience,
          method,
          endpoint: url.pathname,
          status: 429,
          outcome: "waf_blocked",
          totalDurationUs: totalUs,
          steps: traceSteps,
          workerNode: "worker_1",
          timestamp: Date.now(),
        });

        server.publish(
          "dashboard-clients",
          JSON.stringify({
            event: "telemetry:threat_detected",
            data: {
              type: "DDoS_BURST_FLOOD",
              originIp: clientIp,
              clientLabel,
              endpoint: url.pathname,
              reason: "ترافیک مشکوک اسپم و رگبار فراتر از آستانه Rate-Limit",
              status: 429,
              timestamp: new Date().toISOString(),
            },
          })
        );

        return errorResponse("تعداد درخواست‌ها بیش از حد مجاز است. محافظ Rate-Limit فعال شد.", 429);
      }

      // Gateway Passed
      const gatewayUs = Math.round((performance.now() - tGatewayStart) * 1000);
      traceSteps.push({
        node: "gateway",
        durationUs: Math.max(1, gatewayUs),
        status: "ok",
        detail: "Zero-Trust WAF Filter Passed",
      });

      // Dispatch to Active Worker
      const workerNode = telemetry.selectWorker();
      traceSteps.push({
        node: workerNode,
        durationUs: Math.round(Math.random() * 25 + 15),
        status: "ok",
        detail: `Dispatched to ${workerNode.toUpperCase()}`,
      });

      const clientContext: ApiClientContext = {
        clientIp,
        rawClientId,
        clientLabel,
        isAudience,
        workerNode,
        t0,
        traceSteps,
        startTime,
        totalRequestsHandled,
        activeWsClients,
        localIp,
        port: PORT,
      };

      const apiRes = await handleApiRoutes(req, url, path, method, clientContext, server);
      if (apiRes) return apiRes;

      return errorResponse("روت مورد نظر یافت نشد.", 404);
    }

    return new Response("Not Found", { status: 404 });
  },
});

// Attach Telemetry Broadcaster to Bun WebSocket
telemetry.setBroadcaster((event, payload) => {
  server.publish("dashboard-clients", JSON.stringify({ event, data: payload }));
});

// 1-Second Global Heartbeat
setInterval(() => {
  currentRps = requestsInLastSecond;
  requestsInLastSecond = 0;

  const memory = process.memoryUsage();
  const heartbeatPayload = {
    event: "telemetry:heartbeat",
    data: {
      rps: currentRps,
      activeWsClients,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      totalRequests: totalRequestsHandled,
      memoryRssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      rowCounts: getTableRowCounts(),
      cluster: telemetry.getClusterState(),
    },
  };

  server.publish("dashboard-clients", JSON.stringify(heartbeatPayload));
}, 1000);

// 3-Second Automatic Sweeper for Expired Table Holds
setInterval(() => {
  const expiredIds = cleanExpiredTableHolds();
  for (const tableId of expiredIds) {
    server.publish(
      "all-clients",
      JSON.stringify({
        event: "table:released",
        data: { tableId, reason: "HOLD_EXPIRED" },
      })
    );
  }
}, 3000);

console.log(`
┌──────────────────────────────────────────────────────────────────┐
│  ☕ SOREN CAFÉ — Distributed Engine Online                       │
│  🚀 Local Host:      http://localhost:${PORT}                     │
│  📱 Audience Join:   http://${localIp}:${PORT}/join                  │
│  📊 Observability:   http://localhost:${PORT}/dashboard         │
│  📖 Scalar Docs:     http://localhost:${PORT}/docs              │
│  ⚡ WebSocket:       ws://localhost:${PORT}/ws                   │
│  🛡️ Barista PIN:     ${BARISTA_PIN}                               │
└──────────────────────────────────────────────────────────────────┘
`);
