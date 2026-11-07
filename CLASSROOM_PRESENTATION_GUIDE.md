# 🎓 Soren Architecture & Observability Console — Classroom Presentation Guide

This guide prepares you to present [`backend/public/dashboard.html`](file:///D:/projects/soren-cafe/backend/public/dashboard.html) in your programming, distributed systems, or cybersecurity class.

---

## 1. Technical Explanations for Common Questions

### Q1: Why does a request go through L1 Cache when the cache is down or bypassed?
* **Computer Architecture Principle:** In a *Read-Through / Cache-Aside* architecture, when a cache is down or bypassed, the request pipeline **still performs the cache lookup check** (taking $\approx 4\text{–}12\ \mu\text{s}$) before concluding a `CACHE MISS` or `BYPASSED` state.
* **The Disk Fallback:** Because the memory page lookup missed, the request must fall through to the persistent storage tier (**SQLite WAL / PostgreSQL**), which incurs a physical I/O latency penalty ($\approx 1{,}500\text{–}3{,}000\ \mu\text{s}$).
* **Visual Update:** The canvas visualizer now features **Smart Bypass Routing**: when L1 cache is toggled offline, traffic visibly routes along the direct `Worker ➔ Database` conduit, clearly demonstrating the bypass to students.

### Q2: Why do all 50 requests come from the WAF?
* **Edge Ingress Security Invariant:** In modern zero-trust cloud architectures (Cloudflare, AWS CloudFront, Envoy), **no untrusted client packet ever reaches an application worker directly**.
* The **WAF (Web Application Firewall) / Reverse Proxy** sits at the perimeter as the single entry point. When you click **"Burst 50 Reads"**, all 50 HTTP requests enter through the WAF. The WAF inspects each packet's signatures and rate-limits, and then load balances them across `Worker-1` and `Worker-2`. That is why all 50 particles flow out from the WAF into the cluster.

---

## 2. Classroom & Projector High-Visibility Architecture

Projectors in lecture halls often suffer from low contrast, washed-out black levels, and students sitting 20–30 feet away. The console incorporates high-visibility presentation readability directly by default across the entire dashboard (no toggle needed).

### Built-In Readability Invariants:
* **Typography Scaled & Bold:** Node titles (13–14px bold), status badges (12px bold), and telemetry tags are configured for instant readability from the 10th row.
* **Solid 2.5px Conduits:** Connection line strokes are rendered with solid 2.5px stroke width and high-contrast boundaries.
* **Luminous Request Packets:** Travelling request packets feature clear luminous glowing halos (`drop-shadow(0 0 8px rgba(6, 182, 212, 0.9))`), making the trajectory clearly visible across lecture hall screens.
* **Instrument-Grade Contrast:** Node cards use `#0E1015` cards with hairline slate borders and deep shadow elevation.

---

## 3. GitHub & Offline Deployment (Zero-Dependency Readiness)

### If you push this to GitHub or GitHub Pages:
* **The Problem:** Without a local Bun backend running, a traditional dashboard would freeze because WebSockets (`/ws`) and REST endpoints (`/api/...`) would fail.
* **The Built-In Solution:** `dashboard.html` includes an **Autonomous Standalone Simulation Engine**:
  1. If running on `github.io` or `file:///` (or if WebSocket fails after 2 seconds), the page **automatically switches to Standalone Demo Mode**.
  2. Realistic telemetry begins ticking automatically (240–320 req/s, P95 latency ~280µs).
  3. Steady-state particles pulse across the topology in real time.
  4. All interactive buttons (**Burst 50 Reads**, **Kill Worker-1**, **L1 Cache Bypass**, **Inject SQLi**, and the **Attack Scenario Simulator**) execute with full fidelity in-memory without throwing network errors.
* **What you need to bring to class:**
  * Just the `dashboard.html` file! You can open it in any browser (Chrome, Edge, Safari, Firefox) with or without internet.

---

## 4. 5-Minute Live Classroom Presentation Script

Follow this 4-step script for a stellar presentation:

### Step 1: The Zero-Trust Perimeter (1 minute)
> *"Most web applications are taught as just 'Client talks to Server talks to Database'. In production, this is dangerously incomplete. Today, I'm demonstrating Soren's distributed observability architecture across 5 distinct trust boundaries: Untrusted Client, Edge WAF, API Middleware, ORM AST, and Storage."*
* **Action:** Point out the top physical network topology and the 5-stage Security Pipeline with high-visibility conduits.

### Step 2: The Caching & Failover Demo (1.5 minutes)
> *"Notice the latency sparkline at the top right: steady-state L1 in-memory cache hits take under 5 microseconds."*
* **Action:** Click **"Stage Controls"** $\rightarrow$ Click **"L1 Cache [Bypass/Enable]"**.
* Point to the sparkline: latency jumps from $4\ \mu\text{s}$ to $2{,}500\ \mu\text{s}$ as requests fall back to SQLite WAL disk reads.
* **Action:** Click **"Burst 50 Reads"**. Show all 50 packets hitting the WAF and round-robining between Worker-1 and Worker-2.

### Step 3: Live Exploit Simulation (Vulnerable Mode) (1.5 minutes)
* **Action:** Scroll to the **Security & Data-Flow Pipeline Simulator**.
* Click **"Vulnerable Mode"** $\rightarrow$ Select **"SQL Injection (SQLi)"** $\rightarrow$ Click **"▶ Run Attack Simulation"**.
* Watch the packet pulse breach each node: Client ➔ WAF ➔ Middleware ➔ ORM ➔ Database.
* The screen flashes with a crimson **Critical Breach** alert, and the **Data Leakage Preview Panel** opens, displaying exfiltrated confidential catalog secrets and pricing data.

### Step 4: Defense in Depth (Hardened Mode) & Code Inspector (1 minute)
* **Action:** Click **"Hardened Mode"** $\rightarrow$ Click **"▶ Run Attack Simulation"**.
* Watch the packet travel from Client and get **immediately intercepted at the WAF / ORM layer** with a crisp emerald green `[MITIGATED]` badge and `0 bytes leaked`.
* **Action:** Click the **WAF** or **ORM** node to slide open the **Inspector Drawer (`emil-design-eng`)**.
* Show the class:
  1. **Tab 1:** The raw HTTP headers with the attack payload.
  2. **Tab 2:** The SQL Query AST showing how parameter bindings isolate `' OR 1=1 --` into a harmless literal `$1` parameter.
  3. **Tab 3:** The exact **Vulnerable Code vs. Secure Fix** snippet citing **OWASP A03:2021** and **CWE-89**.

---

## 5. Summary Matrix for the Professor

| Attack Vector | CWE / OWASP | Vulnerable Flaw | Hardened Mitigation |
| :--- | :--- | :--- | :--- |
| **SQL Injection (SQLi)** | CWE-89 / OWASP A03 | String concatenation in query builder | AST Parameterized Query & ModSecurity CRS Tokenizer |
| **IDOR / Access Control** | CWE-639 / OWASP A01 | Object fetch without tenant assertion | PostgreSQL Row-Level Security (`USING tenant_id = current_setting(...)`) |
| **SSRF** | CWE-918 / OWASP A10 | Unrestricted outbound HTTP `fetch()` | DNS Pre-flight Pinning & RFC 1918 / 3927 Metadata blocklist |
| **Rate-Limit Bypass** | CWE-290 / OWASP A07 | Trusting client-supplied `X-Forwarded-For` | Socket-level IP extraction (`trust proxy 1`) & Redis Token Bucket |
