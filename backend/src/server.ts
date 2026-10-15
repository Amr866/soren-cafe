import { join } from "path";
import {
  getAllProducts,
  getProductById,
  setProductAvailability,
  createOrderWithTelemetry,
  getOrderById,
  getActiveOrders,
  updateOrderStatus,
  settleTableOrders,
  getAnalyticsStats,
  getTableRowCounts,
} from "./db.ts";
import { openApiSpec, getScalarHtml } from "./docs.ts";

const PORT = Number(process.env.PORT) || 4000;
const BARISTA_PIN = process.env.BARISTA_PIN || "1234";

// Paths
const PUBLIC_DIR = join(import.meta.dir, "../public");
const FRONTEND_DIR = join(import.meta.dir, "../../frontend");
const ASSETS_DIR = join(import.meta.dir, "../../assets");

// Telemetry & Rate Limiting state
const startTime = Date.now();
let totalRequestsHandled = 0;
let requestsInLastSecond = 0;
let currentRps = 0;
let activeWsClients = 0;

const ipRateLimits = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  if (!limit || now > limit.expiresAt) {
    ipRateLimits.set(ip, { count: 1, expiresAt: now + 60_000 });
    return false;
  }
  limit.count++;
  return limit.count > 12; // Max 12 order attempts per minute per IP
}

// 1-Second Telemetry Meter
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
    },
  };

  server.publish("dashboard-clients", JSON.stringify(heartbeatPayload));
}, 1000);

// Helper: Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Barista-Pin",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: true, message }, status);
}

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
        } else if (payload.action === "subscribe_order" && payload.orderId) {
          ws.subscribe(`order_${payload.orderId}`);
          ws.send(JSON.stringify({ event: "subscribed", channel: `order_${payload.orderId}` }));
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
    const url = new URL(req.url);
    const method = req.method;
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

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

    // 2. Interactive Documentation & Visual Mission Control Dashboard
    if (url.pathname === "/docs") {
      return new Response(getScalarHtml(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/dashboard" || url.pathname === "/dashboard.html") {
      const dashboardFile = Bun.file(join(PUBLIC_DIR, "dashboard.html"));
      if (await dashboardFile.exists()) {
        return new Response(dashboardFile, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    if (url.pathname === "/api/v1/openapi.json") {
      return jsonResponse(openApiSpec);
    }

    // 3. REST API Routes (/api/v1)
    if (url.pathname.startsWith("/api/v1")) {
      const path = url.pathname.replace("/api/v1", "");

      // GET /api/v1/products
      if (path === "/products" && method === "GET") {
        const category = url.searchParams.get("category") || undefined;
        const products = getAllProducts(category);
        return jsonResponse(products);
      }

      // PATCH /api/v1/products/:id/toggle-stock (Barista only)
      if (path.match(/^\/products\/([^/]+)\/toggle-stock$/) && method === "PATCH") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          // Emit Security Radar Threat Alert
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:threat_detected",
              data: {
                type: "UNAUTHORIZED_PRIVILEGE_ESCALATION",
                originIp: clientIp,
                endpoint: url.pathname,
                reason: "تلاش برای تغییر موجودی بدون پین معتبر باریستا",
                status: 401,
                timestamp: new Date().toISOString(),
              },
            })
          );
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }

        const match = path.match(/^\/products\/([^/]+)\/toggle-stock$/)!;
        const productId = match[1];
        const body = await req.json().catch(() => ({}));
        const isAvailable = Boolean(body.isAvailable);

        const updated = setProductAvailability(productId, isAvailable);
        if (!updated) {
          return errorResponse("محصول پیدا نشد.", 404);
        }

        // Broadcast availability update to all customer screens and dashboard
        server.publish(
          "all-clients",
          JSON.stringify({
            event: "product:stock_updated",
            data: { productId, isAvailable },
          })
        );

        return jsonResponse({ success: true, productId, isAvailable });
      }

      // POST /api/v1/orders (Place Order)
      if (path === "/orders" && method === "POST") {
        if (isRateLimited(clientIp)) {
          // Emit Threat Alert for Rate-Limiting
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:threat_detected",
              data: {
                type: "DDoS_ORDER_BURST_FLOOD",
                originIp: clientIp,
                endpoint: "/api/v1/orders",
                reason: "ترافیک مشکوک اسپم و رگبار سفارشات از یک IP",
                status: 429,
                timestamp: new Date().toISOString(),
              },
            })
          );
          return errorResponse("تعداد درخواست‌ها بیش از حد مجاز است. محافظ Rate-Limit فعال شد.", 429);
        }

        let body: any;
        try {
          body = await req.json();
        } catch {
          return errorResponse("قالب درخواست JSON نامعتبر است.", 400);
        }

        // Detect Price Tampering Attempt
        let isTamperAttempt = false;
        let tamperedDetails = "";
        if (Array.isArray(body.items)) {
          for (const item of body.items) {
            if (item.price !== undefined) {
              const realProd = getProductById(item.productId);
              if (realProd && Number(item.price) !== realProd.price) {
                isTamperAttempt = true;
                tamperedDetails = `Client passed price=${item.price} T for «${realProd.name}», Real price is ${realProd.price} T`;
              }
            }
          }
        }

        if (isTamperAttempt) {
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:threat_detected",
              data: {
                type: "PRICE_TAMPER_ATTACK",
                originIp: clientIp,
                endpoint: "/api/v1/orders",
                reason: `تلاش برای دستکاری قیمت (${tamperedDetails})`,
                enforcedAction: "قیمت کلاینت نادیده گرفته شد و قیمت معتبر دیتابیس جایگزین گردید.",
                status: 200, // Handled defensively
                timestamp: new Date().toISOString(),
              },
            })
          );
        }

        try {
          const { order: newOrder, telemetry } = createOrderWithTelemetry({
            tableNumber: body.tableNumber || "میز نامشخص",
            customerName: body.customerName,
            phoneNumber: body.phoneNumber,
            sessionToken: body.sessionToken || `sess_${Date.now()}`,
            items: body.items || [],
          });

          // Broadcast real-time order arrival to Barista KDS
          server.publish(
            "barista-kds",
            JSON.stringify({
              event: "order:created",
              data: newOrder,
            })
          );

          // Broadcast Microsecond Database Transaction Waterfall to Mission Control Dashboard
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:db_txn",
              data: {
                ...telemetry,
                rowCounts: getTableRowCounts(),
              },
            })
          );

          return jsonResponse(
            {
              success: true,
              message: "سفارش شما با موفقیت ثبت شد و به مانیتور باریستا ارسال گردید.",
              order: newOrder,
              etaMinutes: 8,
              telemetryMicroseconds: telemetry.totalUs,
            },
            201
          );
        } catch (err: any) {
          return errorResponse(err.message || "خطا در ثبت سفارش.", 400);
        }
      }

      // GET /api/v1/orders (Active Orders for Barista)
      if (path === "/orders" && method === "GET") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:threat_detected",
              data: {
                type: "UNAUTHORIZED_BARISTA_ACCESS",
                originIp: clientIp,
                endpoint: url.pathname,
                reason: "درخواست غیرمجاز برای دریافت صف باریستا",
                status: 401,
                timestamp: new Date().toISOString(),
              },
            })
          );
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }
        const activeOrders = getActiveOrders();
        return jsonResponse(activeOrders);
      }

      // GET /api/v1/orders/:id (Check specific order)
      if (path.match(/^\/orders\/([^/]+)$/) && method === "GET") {
        const match = path.match(/^\/orders\/([^/]+)$/)!;
        const orderId = match[1];
        const order = getOrderById(orderId);
        if (!order) return errorResponse("سفارش یافت نشد.", 404);
        return jsonResponse(order);
      }

      // PATCH /api/v1/orders/:id/status (Barista advances status)
      if (path.match(/^\/orders\/([^/]+)\/status$/) && method === "PATCH") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          server.publish(
            "dashboard-clients",
            JSON.stringify({
              event: "telemetry:threat_detected",
              data: {
                type: "UNAUTHORIZED_BARISTA_ACCESS",
                originIp: clientIp,
                endpoint: url.pathname,
                reason: "تلاش برای تغییر وضعیت سفارش بدون پین معتبر باریستا",
                status: 401,
                timestamp: new Date().toISOString(),
              },
            })
          );
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }

        const match = path.match(/^\/orders\/([^/]+)\/status$/)!;
        const orderId = match[1];
        const body = await req.json().catch(() => ({}));
        const status = body.status;

        const validStatuses = ["PENDING", "BREWING", "READY", "DELIVERED", "CANCELLED"];
        if (!validStatuses.includes(status)) {
          return errorResponse("وضعیت ارسال شده نامعتبر است.", 400);
        }

        const updated = updateOrderStatus(orderId, status);
        if (!updated) return errorResponse("سفارش یافت نشد.", 404);

        // Notify customer and barista screen
        server.publish(
          "all-clients",
          JSON.stringify({
            event: "order:status_updated",
            data: { orderId, status },
          })
        );
        server.publish(
          `order_${orderId}`,
          JSON.stringify({
            event: "order:status_updated",
            data: { orderId, status },
          })
        );

        return jsonResponse({ success: true, orderId, status });
      }

      // PATCH /api/v1/orders/tables/:tableNumber/settle (Settle table bill)
      if (path.match(/^\/orders\/tables\/([^/]+)\/settle$/) && method === "PATCH") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }

        const match = path.match(/^\/orders\/tables\/([^/]+)\/settle$/)!;
        const tableNumber = decodeURIComponent(match[1]);
        const result = settleTableOrders(tableNumber);

        server.publish(
          "all-clients",
          JSON.stringify({
            event: "table:settled",
            data: { tableNumber, ...result },
          })
        );

        return jsonResponse({ success: true, tableNumber, ...result });
      }


      // GET /api/v1/analytics/stats
      if (path === "/analytics/stats" && method === "GET") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }
        return jsonResponse(getAnalyticsStats());
      }

      // GET /api/v1/health (Telemetry HUD)
      if (path === "/health" && method === "GET") {
        const memory = process.memoryUsage();
        return jsonResponse({
          status: "healthy",
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
          totalRequests: totalRequestsHandled,
          activeWsClients,
          memoryRssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          rowCounts: getTableRowCounts(),
        });
      }

      return errorResponse("روت مورد نظر یافت نشد.", 404);
    }

    // 4. Static Asset Delivery (Serves friend's frontend and brand assets)
    if (url.pathname.startsWith("/assets/")) {
      const assetPath = join(ASSETS_DIR, url.pathname.replace("/assets/", ""));
      const file = Bun.file(assetPath);
      if (await file.exists()) return new Response(file);
    }

    // Serve Frontend files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const indexFile = Bun.file(join(FRONTEND_DIR, "index.html"));
      if (await indexFile.exists()) return new Response(indexFile);
      // Fallback preview
      const previewFile = Bun.file(join(import.meta.dir, "../../../cafe-preview.html"));
      if (await previewFile.exists()) return new Response(previewFile);
    }

    if (url.pathname === "/barista" || url.pathname === "/barista.html") {
      const baristaFile = Bun.file(join(FRONTEND_DIR, "barista.html"));
      if (await baristaFile.exists()) return new Response(baristaFile);
    }

    // Try serving other frontend files (.js, .css)
    const possibleFile = Bun.file(join(FRONTEND_DIR, url.pathname.slice(1)));
    if (await possibleFile.exists()) {
      return new Response(possibleFile);
    }

    return new Response("Not Found", { status: 404 });
  },
});

import { networkInterfaces } from "os";

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

console.log(`
┌──────────────────────────────────────────────────────────────────┐
│  ☕ SOREN CAFÉ — Backend Server Online                           │
│  🚀 Local Host:   http://localhost:${PORT}                        │
│  📱 Mobile Access: http://${localIp}:${PORT}                     │
│  📊 Observability: http://localhost:${PORT}/dashboard            │
│  📖 Scalar Docs:   http://localhost:${PORT}/docs                 │
│  ⚡ WebSocket:     ws://localhost:${PORT}/ws                      │
│  🛡️ Barista PIN:   ${BARISTA_PIN}                                  │
└──────────────────────────────────────────────────────────────────┘
`);
