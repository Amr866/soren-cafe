/**
 * Soren Café — Enterprise Distributed Tracing & Cluster Telemetry Engine
 * 
 * Provides:
 * 1. Microsecond-resolution tracing of every HTTP/WS transaction
 * 2. Multi-node cluster simulation (Worker-1 / Worker-2) with live failover
 * 3. High-speed L1 In-Memory Cache with instant toggle for live benchmark comparison
 * 4. Zero-Trust WAF threat interception & step tracking
 * 5. 50ms batching pipeline over WebSockets to avoid browser saturation at high RPS
 * 6. In-memory ring buffer for deep trace inspection (JSON drill-down)
 */

export interface TraceStep {
  node: "client" | "gateway" | "worker_1" | "worker_2" | "cache" | "database";
  durationUs: number;
  status: "ok" | "miss" | "hit" | "rejected";
  detail?: string;
}

export interface TraceRecord {
  id: string;
  clientId: string;
  clientLabel: string;
  isAudience: boolean;
  method: string;
  endpoint: string;
  status: number;
  outcome: "cache_hit" | "db_query" | "waf_blocked" | "error";
  totalDurationUs: number;
  steps: TraceStep[];
  workerNode: "worker_1" | "worker_2";
  timestamp: number;
}

export interface ClusterState {
  worker1: boolean;
  worker2: boolean;
  activeWorkerCount: number;
  cacheEnabled: boolean;
  totalTracesRecorded: number;
  p95LatencyUs: number;
  p50LatencyUs: number;
  currentRps: number;
  recentFailoverEvent: {
    node: string;
    action: "killed" | "restored";
    timestamp: number;
    message: string;
  } | null;
}

// ---------------- Engine State ----------------

class TelemetryEngine {
  private worker1Alive = true;
  private worker2Alive = true;
  private cacheEnabled = true;
  private nextWorkerIndex = 0; // Round-robin selector

  // In-memory product cache
  private productCache: any[] | null = null;
  private productCacheTime = 0;
  private readonly CACHE_TTL_MS = 60_000;

  // Tracing Ring Buffer (Last 200 traces for inspector)
  private readonly RING_BUFFER_SIZE = 200;
  private ringBuffer: TraceRecord[] = [];

  // Batch queue for WebSocket broadcast
  private pendingBatch: TraceRecord[] = [];
  private batchFlushInterval: Timer | null = null;

  // Latency sliding window (for p50, p95 calculation)
  private latencyWindow: number[] = [];
  private totalTracesCount = 0;
  private requestsInWindow = 0;
  private currentRps = 0;

  private recentFailover: ClusterState["recentFailoverEvent"] = null;

  // WebSocket broadcaster hook
  private broadcaster: ((event: string, payload: any) => void) | null = null;

  constructor() {
    // 50ms Batch Dispatcher: Flushes all captured traces to dashboard clients in batches
    setInterval(() => {
      this.flushBatch();
    }, 50);

    // 1-second RPS & Metrics recalculator
    setInterval(() => {
      this.currentRps = this.requestsInWindow;
      this.requestsInWindow = 0;

      // Clean latency window to keep last 1000 items
      if (this.latencyWindow.length > 1000) {
        this.latencyWindow = this.latencyWindow.slice(-1000);
      }
    }, 1000);
  }

  public setBroadcaster(fn: (event: string, payload: any) => void) {
    this.broadcaster = fn;
  }

  // ---------------- Cluster Management (Kill Server / Failover) ----------------

  public getClusterState(): ClusterState {
    const latenciesSorted = [...this.latencyWindow].sort((a, b) => a - b);
    const p50 = latenciesSorted.length > 0 ? latenciesSorted[Math.floor(latenciesSorted.length * 0.5)] : 0;
    const p95 = latenciesSorted.length > 0 ? latenciesSorted[Math.floor(latenciesSorted.length * 0.95)] : 0;

    let activeCount = 0;
    if (this.worker1Alive) activeCount++;
    if (this.worker2Alive) activeCount++;

    return {
      worker1: this.worker1Alive,
      worker2: this.worker2Alive,
      activeWorkerCount: activeCount,
      cacheEnabled: this.cacheEnabled,
      totalTracesRecorded: this.totalTracesCount,
      p50LatencyUs: Math.round(p50),
      p95LatencyUs: Math.round(p95),
      currentRps: this.currentRps,
      recentFailoverEvent: this.recentFailover,
    };
  }

  public killWorker(workerName: "worker_1" | "worker_2"): { success: boolean; message: string; state: ClusterState } {
    if (workerName === "worker_1") {
      this.worker1Alive = false;
    } else {
      this.worker2Alive = false;
    }

    const survivingNode = this.worker1Alive ? "worker_1" : this.worker2Alive ? "worker_2" : "NONE (TOTAL BLACKOUT)";
    this.recentFailover = {
      node: workerName,
      action: "killed",
      timestamp: Date.now(),
      message: `هشدار قطعی: نود ${workerName} از دسترس خارج شد! ترافیک آنی به ${survivingNode} منتقل شد.`,
    };

    if (this.broadcaster) {
      this.broadcaster("telemetry:cluster_alert", {
        type: "NODE_KILLED",
        node: workerName,
        survivingNode,
        clusterState: this.getClusterState(),
      });
    }

    return {
      success: true,
      message: `Node ${workerName} has been terminated. Failover rerouted to ${survivingNode}.`,
      state: this.getClusterState(),
    };
  }

  public restoreWorker(workerName: "worker_1" | "worker_2"): { success: boolean; message: string; state: ClusterState } {
    if (workerName === "worker_1") {
      this.worker1Alive = true;
    } else {
      this.worker2Alive = true;
    }

    this.recentFailover = {
      node: workerName,
      action: "restored",
      timestamp: Date.now(),
      message: `بازیابی سلامت: نود ${workerName} دوباره به کلاستر پیوست. توازن لود برقرار شد.`,
    };

    if (this.broadcaster) {
      this.broadcaster("telemetry:cluster_alert", {
        type: "NODE_RESTORED",
        node: workerName,
        clusterState: this.getClusterState(),
      });
    }

    return {
      success: true,
      message: `Node ${workerName} is back online and accepting requests.`,
      state: this.getClusterState(),
    };
  }

  public toggleCache(enable?: boolean): boolean {
    if (enable !== undefined) {
      this.cacheEnabled = enable;
    } else {
      this.cacheEnabled = !this.cacheEnabled;
    }

    if (!this.cacheEnabled) {
      this.invalidateCache();
    }

    if (this.broadcaster) {
      this.broadcaster("telemetry:cache_toggled", {
        cacheEnabled: this.cacheEnabled,
      });
    }

    return this.cacheEnabled;
  }

  public isCacheEnabled(): boolean {
    return this.cacheEnabled;
  }

  public getCachedProducts(category?: string): any[] | null {
    if (!this.cacheEnabled) return null;
    if (this.productCache && Date.now() - this.productCacheTime < this.CACHE_TTL_MS) {
      if (category) {
        return this.productCache.filter((p: any) => p.category === category);
      }
      return this.productCache;
    }
    return null;
  }

  public setCachedProducts(products: any[]) {
    if (!this.cacheEnabled) return;
    this.productCache = products;
    this.productCacheTime = Date.now();
  }

  public invalidateCache() {
    this.productCache = null;
    this.productCacheTime = 0;
  }

  // Choose active worker according to cluster availability
  public selectWorker(): "worker_1" | "worker_2" {
    if (this.worker1Alive && this.worker2Alive) {
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % 2;
      return this.nextWorkerIndex === 0 ? "worker_1" : "worker_2";
    }
    if (this.worker1Alive) return "worker_1";
    if (this.worker2Alive) return "worker_2";
    // Both dead (blackout) fallback to worker_1
    return "worker_1";
  }

  // ---------------- Trace Creation & Batching ----------------

  public recordTrace(trace: TraceRecord) {
    this.totalTracesCount++;
    this.requestsInWindow++;
    this.latencyWindow.push(trace.totalDurationUs);

    // Add to ring buffer
    this.ringBuffer.push(trace);
    if (this.ringBuffer.length > this.RING_BUFFER_SIZE) {
      this.ringBuffer.shift();
    }

    // Queue for WebSocket batch flush
    this.pendingBatch.push(trace);
  }

  private flushBatch() {
    if (this.pendingBatch.length === 0 || !this.broadcaster) return;

    const totalBatchCount = this.pendingBatch.length;
    let tracesToSend: TraceRecord[];

    // Under normal traffic (<30 traces/50ms), send everything.
    // Under heavy load (10k request burst), adaptively sample visual traces to keep WebSocket bandwidth lightweight and browser at 60 FPS
    if (totalBatchCount <= 30) {
      tracesToSend = this.pendingBatch;
    } else {
      // Priority 1: Never drop audience or security events
      const priorityTraces = this.pendingBatch.filter(
        (t) => t.isAudience || t.outcome === "waf_blocked" || t.status >= 400
      );
      // Priority 2: Evenly sample normal high-speed requests
      const normalTraces = this.pendingBatch.filter(
        (t) => !t.isAudience && t.outcome !== "waf_blocked" && t.status < 400
      );

      const remainingSlots = Math.max(5, 30 - priorityTraces.length);
      const step = Math.max(1, Math.floor(normalTraces.length / remainingSlots));
      const sampledNormal: TraceRecord[] = [];
      for (let i = 0; i < normalTraces.length && sampledNormal.length < remainingSlots; i += step) {
        sampledNormal.push(normalTraces[i]);
      }

      tracesToSend = [...priorityTraces, ...sampledNormal];
    }

    this.pendingBatch = [];
    const clusterState = this.getClusterState();

    this.broadcaster("telemetry:trace_batch", {
      count: totalBatchCount,
      traces: tracesToSend,
      clusterState,
    });
  }

  public getRecentTraces(limit = 50): TraceRecord[] {
    return this.ringBuffer.slice(-limit).reverse();
  }

  public getTraceById(id: string): TraceRecord | null {
    return this.ringBuffer.find((t) => t.id === id) || null;
  }
}

export const telemetry = new TelemetryEngine();
