import {
  getAllProducts,
  getProductById,
  getAllTables,
  holdTable,
  releaseTable,
  occupyTable,
  createOrderWithTelemetry,
  setProductAvailability,
  getActiveOrders,
  getOrderById,
  updateOrderStatus,
  settleTableOrders,
  getAnalyticsStats,
  getTableRowCounts,
} from "../db.ts";
import { telemetry } from "../telemetry.ts";
import { jsonResponse, errorResponse, BARISTA_PIN } from "./helpers.ts";

export interface ApiClientContext {
  clientIp: string;
  rawClientId: string;
  clientLabel: string;
  isAudience: boolean;
  workerNode: "worker_1" | "worker_2";
  t0: number;
  traceSteps: Array<{
    node: string;
    durationUs: number;
    status: "ok" | "miss" | "hit" | "rejected";
    detail: string;
  }>;
  startTime: number;
  totalRequestsHandled: number;
  activeWsClients: number;
  localIp: string;
  port: number;
}

export async function handleApiRoutes(
  req: Request,
  url: URL,
  path: string,
  method: string,
  ctx: ApiClientContext,
  server: any
): Promise<Response | null> {
  const { clientIp, rawClientId, clientLabel, isAudience, workerNode, t0, traceSteps } = ctx;

  // ---------------- ROUTE 1: GET /api/v1/products ----------------
  if (path === "/products" && method === "GET") {
    const category = url.searchParams.get("category");
    const bypassCache = url.searchParams.get("bypass_cache") === "true";

    // L1 In-Memory Cache Check
    if (!bypassCache) {
      const cached = telemetry.getCachedProducts();
      if (cached) {
        traceSteps.push({
          node: "cache",
          durationUs: 4,
          status: "hit",
          detail: "L1 In-Memory Cache Hit (0ms Disk)",
        });

        const filtered = category ? cached.filter((p: any) => p.category === category) : cached;
        const totalUs = Math.round((performance.now() - t0) * 1000);

        telemetry.recordTrace({
          id: `trc_${Math.random().toString(36).substring(2, 8)}`,
          clientId: rawClientId,
          clientLabel,
          isAudience,
          method,
          endpoint: url.pathname + url.search,
          status: 200,
          outcome: "cache_hit",
          totalDurationUs: totalUs,
          steps: traceSteps,
          workerNode,
          timestamp: Date.now(),
        });

        return jsonResponse(filtered);
      }
    }

    // Cache Miss or Bypassed
    traceSteps.push({
      node: "cache",
      durationUs: 12,
      status: "miss",
      detail: bypassCache ? "Cache bypassed by client query" : "L1 Cache Miss -> Direct SQLite WAL",
    });

    const tDbStart = performance.now();
    const allProducts = getAllProducts();
    if (!bypassCache) {
      telemetry.setCachedProducts(allProducts);
    }
    const products = category ? allProducts.filter((p) => p.category === category) : allProducts;
    const dbUs = Math.round((performance.now() - tDbStart) * 1000);

    traceSteps.push({
      node: "database",
      durationUs: Math.max(1, dbUs),
      status: "ok",
      detail: bypassCache ? "Direct Disk Read (L1 Cache Bypassed)" : "SQLite WAL Table Scan",
    });

    const totalUs = Math.round((performance.now() - t0) * 1000);
    telemetry.recordTrace({
      id: `trc_${Math.random().toString(36).substring(2, 8)}`,
      clientId: rawClientId,
      clientLabel,
      isAudience,
      method,
      endpoint: url.pathname + url.search,
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

  // ---------------- ROUTE: POST /api/v1/tables/:id/hold ----------------
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

      // Broadcast real-time table status update
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
      releaseTable(tableId, body.clientId || rawClientId);

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
        tableNumber: body.tableNumber || body.table_number || "میز نامشخص",
        customerName: body.customerName || body.customer_name || clientLabel,
        phoneNumber: body.phoneNumber || body.phone_number,
        sessionToken: body.sessionToken || body.session_token || rawClientId,
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
    return jsonResponse({
      status: "healthy",
      localIp: ctx.localIp,
      joinUrl: `http://${ctx.localIp}:${ctx.port}/join`,
      cluster: telemetry.getClusterState(),
      uptimeSeconds: Math.floor((Date.now() - ctx.startTime) / 1000),
      totalRequests: ctx.totalRequestsHandled,
      activeWsClients: ctx.activeWsClients,
      memoryRssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      rowCounts: getTableRowCounts(),
    });
  }

  return null;
}
