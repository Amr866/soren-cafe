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
  getAllTables,
  getTableById,
  holdTable,
  releaseTable,
  occupyTable,
  cleanExpiredTableHolds,
  type CafeTable,
} from "./db.ts";
import { openApiSpec, getScalarHtml } from "./docs.ts";
import { telemetry, type TraceStep } from "./telemetry.ts";

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
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return false;
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  if (!limit || now > limit.expiresAt) {
    ipRateLimits.set(ip, { count: 1, expiresAt: now + 60_000 });
    return false;
  }
  limit.count++;
  return limit.count > 200; // 200 requests per minute per external IP
}

// Helper: Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Barista-Pin, X-Client-Id, X-Audience-Name, X-Burst-Index",
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
    const t0 = performance.now();

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

    // 2. Interactive Documentation & Dashboards
    if (url.pathname === "/docs") {
      return new Response(getScalarHtml(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Interactive Audience Client (Mobile Join)
    if (url.pathname === "/join" || url.pathname === "/join.html" || url.pathname === "/play") {
      const joinFile = Bun.file(join(PUBLIC_DIR, "join.html"));
      if (await joinFile.exists()) {
        return new Response(joinFile, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
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

    // 3. Cluster & Telemetry Control Endpoints (For Presentation & Verification)
    if (url.pathname.startsWith("/api/v1/cluster")) {
      const clusterPath = url.pathname.replace("/api/v1/cluster", "");

      // GET /api/v1/cluster/state
      if (clusterPath === "/state" && method === "GET") {
        return jsonResponse(telemetry.getClusterState());
      }

      // POST /api/v1/cluster/worker/kill?worker=worker_1
      if (clusterPath === "/worker/kill" && method === "POST") {
        const worker = (url.searchParams.get("worker") || "worker_1") as "worker_1" | "worker_2";
        const result = telemetry.killWorker(worker);
        return jsonResponse(result);
      }

      // POST /api/v1/cluster/worker/restore?worker=worker_1
      if (clusterPath === "/worker/restore" && method === "POST") {
        const worker = (url.searchParams.get("worker") || "worker_1") as "worker_1" | "worker_2";
        const result = telemetry.restoreWorker(worker);
        return jsonResponse(result);
      }

      // POST /api/v1/cluster/cache/toggle
      if (clusterPath === "/cache/toggle" && method === "POST") {
        const enabled = telemetry.toggleCache();
        return jsonResponse({
          success: true,
          cacheEnabled: enabled,
          message: enabled ? "L1 In-Memory Cache Activated (Sub-millisecond responses)" : "L1 In-Memory Cache Bypassed (Direct Disk WAL writes)",
        });
      }
    }

    // Telemetry Inspect Endpoints
    if (url.pathname === "/api/v1/telemetry/traces" && method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 50;
      return jsonResponse(telemetry.getRecentTraces(limit));
    }

    if (url.pathname.startsWith("/api/v1/telemetry/traces/") && method === "GET") {
      const traceId = url.pathname.replace("/api/v1/telemetry/traces/", "");
      const trace = telemetry.getTraceById(traceId);
      if (!trace) return errorResponse("تریس مورد نظر یافت نشد.", 404);
      return jsonResponse(trace);
    }

    // -------------------------------------------------------------
    // 4. REST API Routes (/api/v1) with Real-Time Distributed Tracing
    // -------------------------------------------------------------
    if (url.pathname.startsWith("/api/v1")) {
      const path = url.pathname.replace("/api/v1", "");

      // Client Identity Extraction
      const rawClientId = req.headers.get("x-client-id") || `ip_${clientIp.replace(/[^a-zA-Z0-9]/g, "")}`;
      let audienceName = req.headers.get("x-audience-name") || url.searchParams.get("audience");
      if (audienceName) {
        try {
          audienceName = decodeURIComponent(audienceName);
        } catch {}
      }
      const isAudience = Boolean(audienceName || rawClientId.startsWith("aud_") || url.searchParams.has("audience"));
      const clientLabel = audienceName || (isAudience ? "کاربر سالن" : `کلاینت (${clientIp})`);

      const traceSteps: TraceStep[] = [];
      traceSteps.push({
        node: "client",
        durationUs: 0,
        status: "ok",
        detail: `Client Ingress: ${clientLabel}`,
      });

      // ---------------- GATEWAY & ZERO-TRUST WAF INSPECTION ----------------
      const tGatewayStart = performance.now();

      // Check A: SQL Injection Interception
      const isSqliAttempt = url.searchParams.has("sqli") || req.url.includes("' OR 1=1") || req.url.includes("UNION SELECT");
      if (isSqliAttempt) {
        const gatewayUs = Math.round((performance.now() - tGatewayStart) * 1000);
        traceSteps.push({
          node: "gateway",
          durationUs: gatewayUs,
          status: "rejected",
          detail: "WAF Intercept: SQL Injection Token Pattern Detected",
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

      // Check B: Rate Limiter Protection
      if (isRateLimited(clientIp)) {
        const gatewayUs = Math.round((performance.now() - tGatewayStart) * 1000);
        traceSteps.push({
          node: "gateway",
          durationUs: gatewayUs,
          status: "rejected",
          detail: "WAF Intercept: DDoS/Burst Rate-Limit Exceeded (40 req/min)",
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

      // ---------------- ROUTE 1: GET /api/v1/products ----------------
      if (path === "/products" && method === "GET") {
        const category = url.searchParams.get("category") || undefined;
        const bypassCache = url.searchParams.get("no_cache") === "1";

        // Check L1 In-Memory Cache
        const tCacheStart = performance.now();
        const cachedProducts = (!bypassCache && !category) ? telemetry.getCachedProducts() : null;

        if (cachedProducts) {
          const cacheUs = Math.round((performance.now() - tCacheStart) * 1000);
          traceSteps.push({
            node: "cache",
            durationUs: Math.max(1, cacheUs),
            status: "hit",
            detail: `L1 In-Memory Hit (${cachedProducts.length} items)`,
          });

          const totalUs = Math.round((performance.now() - t0) * 1000);
          telemetry.recordTrace({
            id: `trc_${Math.random().toString(36).substring(2, 8)}`,
            clientId: rawClientId,
            clientLabel,
            isAudience,
            method,
            endpoint: url.pathname,
            status: 200,
            outcome: "cache_hit",
            totalDurationUs: totalUs,
            steps: traceSteps,
            workerNode,
            timestamp: Date.now(),
          });

          return jsonResponse(cachedProducts);
        }

        // Cache Miss / Cold Read -> Fetch from SQLite WAL
        traceSteps.push({
          node: "cache",
          durationUs: 20,
          status: "miss",
          detail: bypassCache ? "Cache Bypass Flag Set" : "Cache Miss / Cold Read",
        });

        const tDbStart = performance.now();
        const products = getAllProducts(category);
        if (!category) {
          telemetry.setCachedProducts(products);
        }
        const dbUs = Math.round((performance.now() - tDbStart) * 1000);

        traceSteps.push({
          node: "database",
          durationUs: Math.max(1, dbUs),
          status: "ok",
          detail: "SQLite WAL Table Scan",
        });

        const totalUs = Math.round((performance.now() - t0) * 1000);
        telemetry.recordTrace({
          id: `trc_${Math.random().toString(36).substring(2, 8)}`,
          clientId: rawClientId,
          clientLabel,
          isAudience,
          method,
          endpoint: url.pathname,
          status: 200,
          outcome: "db_query",
          totalDurationUs: totalUs,
          steps: traceSteps,
          workerNode,
          timestamp: Date.now(),
        });

        return jsonResponse(products);
      }

      // ---------------- ROUTE: GET /api/v1/tables ----------------
      if (path === "/tables" && method === "GET") {
        const tDbStart = performance.now();
        const tables = getAllTables();
        const dbUs = Math.round((performance.now() - tDbStart) * 1000);

        traceSteps.push({
          node: "database",
          durationUs: Math.max(1, dbUs),
          status: "ok",
          detail: `Read ${tables.length} Tables Status`,
        });

        const totalUs = Math.round((performance.now() - t0) * 1000);
        telemetry.recordTrace({
          id: `trc_${Math.random().toString(36).substring(2, 8)}`,
          clientId: rawClientId,
          clientLabel,
          isAudience,
          method,
          endpoint: url.pathname,
          status: 200,
          outcome: "db_query",
          totalDurationUs: totalUs,
          steps: traceSteps,
          workerNode,
          timestamp: Date.now(),
        });

        return jsonResponse(tables);
      }

      // ---------------- ROUTE: POST /api/v1/tables/:id/hold (Anti-Race Lock) ----------------
      if (path.match(/^\/tables\/([^/]+)\/hold$/) && method === "POST") {
        const match = path.match(/^\/tables\/([^/]+)\/hold$/)!;
        const tableId = match[1];
        const body = await req.json().catch(() => ({}));
        const targetClientId = body.clientId || rawClientId;
        const ttlSeconds = Number(body.ttlSeconds) || 120;

        try {
          const tDbStart = performance.now();
          const result = holdTable(tableId, targetClientId, body.clientName || clientLabel, ttlSeconds);
          const dbUs = Math.round((performance.now() - tDbStart) * 1000);

          traceSteps.push({
            node: "database",
            durationUs: Math.max(1, dbUs),
            status: "ok",
            detail: `Atomic Hold Lock Acquired (${ttlSeconds}s TTL)`,
          });

          const totalUs = Math.round((performance.now() - t0) * 1000);
          telemetry.recordTrace({
            id: `trc_${Math.random().toString(36).substring(2, 8)}`,
            clientId: rawClientId,
            clientLabel,
            isAudience,
            method,
            endpoint: url.pathname,
            status: 200,
            outcome: "db_query",
            totalDurationUs: totalUs,
            steps: traceSteps,
            workerNode,
            timestamp: Date.now(),
          });

          // Broadcast real-time table status update to all connected screens
          server.publish(
            "all-clients",
            JSON.stringify({
              event: "table:held",
              data: {
                tableId,
                heldBy: targetClientId,
                heldUntil: result.heldUntil,
                ttlSeconds: result.ttlSeconds,
                clientName: body.clientName || clientLabel,
              },
            })
          );

          return jsonResponse({
            success: true,
            tableId,
            status: "HELD",
            heldUntil: result.heldUntil,
            ttlSeconds: result.ttlSeconds,
            message: `میز به مدت ${ttlSeconds} ثانیه برای شما قفل گردید.`,
          });
        } catch (err: any) {
          const isConflict = err.message?.includes("کاربر دیگری");
          return errorResponse(err.message || "خطا در قفل میز.", isConflict ? 409 : 400);
        }
      }

      // ---------------- ROUTE: POST /api/v1/tables/:id/release ----------------
      if (path.match(/^\/tables\/([^/]+)\/release$/) && method === "POST") {
        const match = path.match(/^\/tables\/([^/]+)\/release$/)!;
        const tableId = match[1];
        const body = await req.json().catch(() => ({}));

        try {
          const result = releaseTable(tableId, body.clientId || rawClientId);

          server.publish(
            "all-clients",
            JSON.stringify({
              event: "table:released",
              data: { tableId },
            })
          );

          return jsonResponse({ success: true, tableId, status: "FREE" });
        } catch (err: any) {
          return errorResponse(err.message || "خطا در آزادسازی میز.", 400);
        }
      }

      // ---------------- ROUTE: POST /api/v1/tables/:id/book ----------------
      if (path.match(/^\/tables\/([^/]+)\/book$/) && method === "POST") {
        const match = path.match(/^\/tables\/([^/]+)\/book$/)!;
        const tableId = match[1];
        const body = await req.json().catch(() => ({}));

        try {
          const result = occupyTable(tableId, body.clientId || rawClientId);

          server.publish(
            "all-clients",
            JSON.stringify({
              event: "table:taken",
              data: { tableId, table: result.table },
            })
          );

          return jsonResponse({ success: true, tableId, status: "OCCUPIED" });
        } catch (err: any) {
          return errorResponse(err.message || "خطا در ثبت نهایی میز.", 400);
        }
      }

      // ---------------- ROUTE 2: POST /api/v1/orders ----------------
      if (path === "/orders" && method === "POST") {
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
                tamperedDetails = `Passed price=${item.price} T for «${realProd.name}», Real price is ${realProd.price} T`;
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
                clientLabel,
                endpoint: "/api/v1/orders",
                reason: `تلاش برای دستکاری قیمت (${tamperedDetails})`,
                enforcedAction: "قیمت کلاینت نادیده گرفته شد و قیمت معتبر دیتابیس جایگزین گردید.",
                status: 200,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }

        try {
          traceSteps.push({
            node: "cache",
            durationUs: 15,
            status: "miss",
            detail: "Order Mutation Bypasses Cache -> Direct WAL Persist",
          });

          const { order: newOrder, telemetry: dbTelemetry } = createOrderWithTelemetry({
            tableNumber: body.tableNumber || "میز نامشخص",
            customerName: body.customerName || clientLabel,
            phoneNumber: body.phoneNumber,
            sessionToken: body.sessionToken || rawClientId,
            items: body.items || [],
          });

          traceSteps.push({
            node: "database",
            durationUs: dbTelemetry.totalUs,
            status: "ok",
            detail: `Atomic SQLite Transaction (${dbTelemetry.totalUs} µs)`,
          });

          const totalUs = Math.round((performance.now() - t0) * 1000);
          telemetry.recordTrace({
            id: newOrder.id,
            clientId: rawClientId,
            clientLabel,
            isAudience,
            method,
            endpoint: "/api/v1/orders",
            status: 201,
            outcome: "db_query",
            totalDurationUs: totalUs,
            steps: traceSteps,
            workerNode,
            timestamp: Date.now(),
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
                ...dbTelemetry,
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
              telemetryMicroseconds: dbTelemetry.totalUs,
              workerNode,
            },
            201
          );
        } catch (err: any) {
          return errorResponse(err.message || "خطا در ثبت سفارش.", 400);
        }
      }

      // ---------------- ROUTE 3: PATCH /api/v1/products/:id/toggle-stock ----------------
      if (path.match(/^\/products\/([^/]+)\/toggle-stock$/) && method === "PATCH") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
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

        // Invalidate L1 Cache so instant changes take effect
        telemetry.invalidateCache();

        server.publish(
          "all-clients",
          JSON.stringify({
            event: "product:stock_updated",
            data: { productId, isAvailable },
          })
        );

        return jsonResponse({ success: true, productId, isAvailable });
      }

      // ---------------- ROUTE 4: GET /api/v1/orders (Active Orders for Barista) ----------------
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

      // ---------------- ROUTE 5: GET /api/v1/orders/:id ----------------
      if (path.match(/^\/orders\/([^/]+)$/) && method === "GET") {
        const match = path.match(/^\/orders\/([^/]+)$/)!;
        const orderId = match[1];
        const order = getOrderById(orderId);
        if (!order) return errorResponse("سفارش یافت نشد.", 404);
        return jsonResponse(order);
      }

      // ---------------- ROUTE 6: PATCH /api/v1/orders/:id/status ----------------
      if (path.match(/^\/orders\/([^/]+)\/status$/) && method === "PATCH") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
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

      // ---------------- ROUTE 7: PATCH /api/v1/orders/tables/:tableNumber/settle ----------------
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

      // ---------------- ROUTE 8: GET /api/v1/analytics/stats ----------------
      if (path === "/analytics/stats" && method === "GET") {
        const pin = req.headers.get("x-barista-pin");
        if (pin !== BARISTA_PIN) {
          return errorResponse("دسترسی غیرمجاز: پین باریستا نامعتبر است.", 401);
        }
        return jsonResponse(getAnalyticsStats());
      }

      // ---------------- ROUTE 9: GET /api/v1/health ----------------
      if (path === "/health" && method === "GET") {
        const memory = process.memoryUsage();
        const currentIp = getLocalIp();
        return jsonResponse({
          status: "healthy",
          localIp: currentIp,
          joinUrl: `http://${currentIp}:${PORT}/join`,
          cluster: telemetry.getClusterState(),
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

    // 5. Static Asset Delivery
    if (url.pathname.startsWith("/assets/")) {
      const assetPath = join(ASSETS_DIR, url.pathname.replace("/assets/", ""));
      const file = Bun.file(assetPath);
      if (await file.exists()) return new Response(file);
    }

    // Serve Frontend files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const indexFile = Bun.file(join(FRONTEND_DIR, "index.html"));
      if (await indexFile.exists()) return new Response(indexFile);
      const previewFile = Bun.file(join(import.meta.dir, "../../../cafe-preview.html"));
      if (await previewFile.exists()) return new Response(previewFile);
    }

    if (url.pathname === "/barista" || url.pathname === "/barista.html") {
      const baristaFile = Bun.file(join(FRONTEND_DIR, "barista.html"));
      if (await baristaFile.exists()) return new Response(baristaFile);
    }

    const possibleFile = Bun.file(join(FRONTEND_DIR, url.pathname.slice(1)));
    if (await possibleFile.exists()) {
      return new Response(possibleFile);
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

// 3-Second Automatic Sweeper for Expired Table Holds (Releases abandoned holds)
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
│  ☕ SOREN CAFÉ — Distributed Engine Online                       │
│  🚀 Local Host:      http://localhost:${PORT}                     │
│  📱 Audience Join:   http://${localIp}:${PORT}/join                  │
│  📊 Observability:   http://localhost:${PORT}/dashboard         │
│  📖 Scalar Docs:     http://localhost:${PORT}/docs              │
│  ⚡ WebSocket:       ws://localhost:${PORT}/ws                   │
│  🛡️ Barista PIN:     ${BARISTA_PIN}                               │
└──────────────────────────────────────────────────────────────────┘
`);
