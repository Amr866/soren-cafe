import { describe, it, expect, beforeAll } from "bun:test";
import { server } from "../../src/server.ts";
import { BARISTA_PIN } from "../../src/routes/helpers.ts";

describe("HTTP REST API Endpoints & Zero-Trust Security", () => {
  const baseUrl = `http://localhost:${server.port}`;

  it("GET /api/v1/health returns online status and system stats", async () => {
    const res = await server.fetch(new Request(`${baseUrl}/api/v1/health`));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe("healthy");
    expect(body.cluster).toBeDefined();
    expect(body.rowCounts).toBeDefined();
    expect(typeof body.uptimeSeconds).toBe("number");
  });

  it("GET /api/v1/products returns product list and filters by category", async () => {
    const allRes = await server.fetch(new Request(`${baseUrl}/api/v1/products`));
    expect(allRes.status).toBe(200);
    const allProducts = await allRes.json() as any[];
    expect(Array.isArray(allProducts)).toBe(true);
    expect(allProducts.length).toBeGreaterThan(0);

    const cakeRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?category=cake`));
    expect(cakeRes.status).toBe(200);
    const cakeProducts = await cakeRes.json() as any[];
    expect(Array.isArray(cakeProducts)).toBe(true);
    expect(cakeProducts.length).toBeGreaterThan(0);
    for (const p of cakeProducts) {
      expect(p.category).toBe("cake");
    }
  });

  it("GET /api/v1/products filters by search query 'q' and handles edge cases", async () => {
    // 1. English substring search in name/description
    const doppioRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?q=doppio`));
    expect(doppioRes.status).toBe(200);
    const doppioProducts = await doppioRes.json() as any[];
    expect(doppioProducts.length).toBeGreaterThan(0);
    expect(doppioProducts.every((p: any) => 
      p.name.toLowerCase().includes("doppio") || (p.description && p.description.toLowerCase().includes("doppio"))
    )).toBe(true);

    // 2. Persian search query
    const espressoRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?q=${encodeURIComponent("اسپرسو")}`));
    expect(espressoRes.status).toBe(200);
    const espressoProducts = await espressoRes.json() as any[];
    expect(espressoProducts.length).toBeGreaterThan(0);

    // 3. Persian / Arabic character normalization (e.g. Arabic Yeh 'ي' vs Persian 'ی', Kaf 'ك' vs 'ک')
    const arabicRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?q=${encodeURIComponent("دوپيو")}`));
    expect(arabicRes.status).toBe(200);
    const arabicProducts = await arabicRes.json() as any[];
    expect(arabicProducts.length).toBeGreaterThan(0);

    // 4. Trimming and special characters (must not crash with regex or SQL errors)
    const specialRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?q=${encodeURIComponent("  (Soren)  ")}`));
    expect(specialRes.status).toBe(200);
    const specialProducts = await specialRes.json() as any[];
    expect(specialProducts.length).toBeGreaterThan(0);

    // 5. Non-matching query returns empty list
    const noneRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?q=nonexistent_product_xyz`));
    expect(noneRes.status).toBe(200);
    const noneProducts = await noneRes.json() as any[];
    expect(Array.isArray(noneProducts)).toBe(true);
    expect(noneProducts.length).toBe(0);
  });

  it("GET /api/v1/openapi.json and GET /docs provide interactive OpenAPI specs", async () => {
    const openapiRes = await server.fetch(new Request(`${baseUrl}/api/v1/openapi.json`));
    expect(openapiRes.status).toBe(200);
    const openapi = await openapiRes.json() as any;
    expect(openapi.openapi).toBe("3.0.3");
    expect(openapi.info.title).toContain("Soren Café");

    const docsRes = await server.fetch(new Request(`${baseUrl}/docs`));
    expect(docsRes.status).toBe(200);
    const html = await docsRes.text();
    expect(html).toContain("@scalar/api-reference");
  });

  it("POST /api/v1/tables/:id/hold and release manages table lifecycle via API", async () => {
    const tableId = "tbl_4";

    // Hold table
    const holdRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/tables/${tableId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "api_test_client", clientName: "مشتری تست API", ttlSeconds: 30 }),
      })
    );
    expect(holdRes.status).toBe(200);
    const holdData = await holdRes.json() as any;
    expect(holdData.status).toBe("HELD");

    // Hijack attempt by another client should receive 409 Conflict
    const hijackRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/tables/${tableId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "intruder_client", clientName: "نفوذگر", ttlSeconds: 30 }),
      })
    );
    expect(hijackRes.status).toBe(409);

    // Release table
    const releaseRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/tables/${tableId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "api_test_client" }),
      })
    );
    expect(releaseRes.status).toBe(200);
  });

  it("POST /api/v1/orders enforces server-authoritative price and blocks price tampering", async () => {
    const productsRes = await server.fetch(new Request(`${baseUrl}/api/v1/products?category=coffee`));
    const products = await productsRes.json() as any[];
    const espresso = products.find((p) => p.name.includes("اسپرسو") || p.id.includes("espresso")) || products[0];

    // Client passes malicious price: 0 Toman
    const orderRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: "میز تست API",
          customerName: "تست کننده ضد تقلب",
          items: [{ productId: espresso.id, quantity: 2, price: 0 }],
        }),
      })
    );

    expect(orderRes.status).toBe(201);
    const orderData = await orderRes.json() as any;
    expect(orderData.order).toBeDefined();
    // Must equal authoritative real price * 2, NOT 0
    expect(orderData.order.total_price).toBe(espresso.price * 2);

    const orderId = orderData.order.id;

    // Fetch order by ID
    const getRes = await server.fetch(new Request(`${baseUrl}/api/v1/orders/${orderId}`));
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json() as any;
    expect(fetched.id).toBe(orderId);

    // Update status without Barista PIN should return 401
    const unauthUpdate = await server.fetch(
      new Request(`${baseUrl}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BREWING" }),
      })
    );
    expect(unauthUpdate.status).toBe(401);

    // Update status WITH Barista PIN should return 200
    const authUpdate = await server.fetch(
      new Request(`${baseUrl}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-barista-pin": BARISTA_PIN,
        },
        body: JSON.stringify({ status: "BREWING" }),
      })
    );
    expect(authUpdate.status).toBe(200);
    const updatedData = await authUpdate.json() as any;
    expect(updatedData.status).toBe("BREWING");
  });

  it("WAF intercepts and blocks malicious SQL injection payloads with 403 Forbidden", async () => {
    const maliciousQuery = `${baseUrl}/api/v1/products?category=coffee' UNION SELECT * FROM users --`;
    const wafRes = await server.fetch(new Request(maliciousQuery));
    expect(wafRes.status).toBe(403);
    const body = (await wafRes.json()) as any;
    expect(body.error).toBe(true);
    expect(body.message).toContain("WAF");
  });
});
