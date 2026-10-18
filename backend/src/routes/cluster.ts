import { telemetry } from "../telemetry.ts";
import { jsonResponse, errorResponse } from "./helpers.ts";

export function handleClusterRoutes(url: URL, method: string): Response | null {
  // Cluster control routes
  if (url.pathname.startsWith("/api/v1/cluster")) {
    const clusterPath = url.pathname.replace("/api/v1/cluster", "");

    // GET /api/v1/cluster/state
    if (clusterPath === "/state" && (method === "GET" || method === "HEAD")) {
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
        message: enabled
          ? "L1 In-Memory Cache Activated (Sub-millisecond responses)"
          : "L1 In-Memory Cache Bypassed (Direct Disk WAL writes)",
      });
    }
  }

  // Telemetry inspect routes
  if (url.pathname === "/api/v1/telemetry/traces" && (method === "GET" || method === "HEAD")) {
    const limit = Number(url.searchParams.get("limit")) || 50;
    return jsonResponse(telemetry.getRecentTraces(limit));
  }

  if (url.pathname.startsWith("/api/v1/telemetry/traces/") && (method === "GET" || method === "HEAD")) {
    const traceId = url.pathname.replace("/api/v1/telemetry/traces/", "");
    const trace = telemetry.getTraceById(traceId);
    if (!trace) return errorResponse("تریس مورد نظر یافت نشد.", 404);
    return jsonResponse(trace);
  }

  return null;
}
