import { describe, it, expect, beforeEach } from "bun:test";
import {
  db,
  getAllProducts,
  getProductById,
  setProductAvailability,
  createOrderWithTelemetry,
  holdTable,
  releaseTable,
  occupyTable,
  cleanExpiredTableHolds,
  getTableRowCounts,
  updateOrderStatus,
  getOrderById,
} from "../../src/db.ts";

describe("Database Layer (bun:sqlite WAL Mode)", () => {
  it("operates in WAL journal mode with foreign keys enabled", () => {
    const journalMode = db.prepare("PRAGMA journal_mode;").get() as { journal_mode: string };
    expect(journalMode.journal_mode.toLowerCase()).toBe("wal");

    const foreignKeys = db.prepare("PRAGMA foreign_keys;").get() as { foreign_keys: number };
    expect(foreignKeys.foreign_keys).toBe(1);
  });

  it("verifies tables and products schemas are initialized", () => {
    const counts = getTableRowCounts();
    expect(typeof counts.productsCount).toBe("number");
    expect(typeof counts.ordersCount).toBe("number");
    expect(typeof counts.tablesCount).toBe("number");
    expect(counts.tablesCount).toBeGreaterThanOrEqual(8);
  });

  it("queries products with category filter and sorts by price", () => {
    const coffeeProducts = getAllProducts("coffee");
    expect(Array.isArray(coffeeProducts)).toBe(true);
    expect(coffeeProducts.length).toBeGreaterThan(0);
    for (const p of coffeeProducts) {
      expect(p.category).toBe("coffee");
    }

    // Verify ordering by price ascending
    for (let i = 1; i < coffeeProducts.length; i++) {
      expect(coffeeProducts[i].price).toBeGreaterThanOrEqual(coffeeProducts[i - 1].price);
    }
  });

  it("toggles product availability correctly", () => {
    const products = getAllProducts();
    expect(products.length).toBeGreaterThan(0);
    const target = products[0];

    const updatedFalse = setProductAvailability(target.id, false);
    expect(updatedFalse).toBe(true);
    let refreshed = getProductById(target.id);
    expect(refreshed?.is_available).toBe(0);

    const updatedTrue = setProductAvailability(target.id, true);
    expect(updatedTrue).toBe(true);
    refreshed = getProductById(target.id);
    expect(refreshed?.is_available).toBe(1);
  });

  describe("Table Hold and Concurrency Lifecycle", () => {
    const testTableId = "tbl_1";

    beforeEach(() => {
      // Ensure clean free state before each table test
      db.prepare("UPDATE tables SET status = 'FREE', held_by = NULL, held_until = NULL WHERE id = ?").run(testTableId);
    });

    it("allows a client to hold a free table with TTL", () => {
      const holdRes = holdTable(testTableId, "client_unit_test", "کاربر تستی", 60);
      expect(holdRes.heldUntil).toBeGreaterThan(Date.now());
      expect(holdRes.ttlSeconds).toBe(60);

      const table = db.prepare("SELECT * FROM tables WHERE id = ?").get(testTableId) as any;
      expect(table.status).toBe("HELD");
      expect(table.held_by).toBe("client_unit_test");
    });

    it("prevents another client from hijacking an active hold", () => {
      holdTable(testTableId, "client_owner", "کاربر اولیه", 60);

      expect(() => {
        holdTable(testTableId, "client_intruder", "کاربر متجاوز", 60);
      }).toThrow();
    });

    it("releases table hold back to FREE status", () => {
      holdTable(testTableId, "client_owner", "کاربر اولیه", 60);
      releaseTable(testTableId, "client_owner");

      const table = db.prepare("SELECT * FROM tables WHERE id = ?").get(testTableId) as any;
      expect(table.status).toBe("FREE");
      expect(table.held_by).toBeNull();
    });

    it("cleans expired table holds automatically", () => {
      // Force expired timestamp in past
      const pastTime = Date.now() - 5000;
      db.prepare("UPDATE tables SET status = 'HELD', held_by = 'expired_client', held_until = ? WHERE id = ?").run(
        pastTime,
        testTableId
      );

      const cleanedIds = cleanExpiredTableHolds();
      expect(cleanedIds.length).toBeGreaterThanOrEqual(1);
      expect(cleanedIds).toContain(testTableId);

      const table = db.prepare("SELECT * FROM tables WHERE id = ?").get(testTableId) as any;
      expect(table.status).toBe("FREE");
    });
  });

  describe("Order Placement and Authoritative Pricing", () => {
    it("fails when placing an empty order", () => {
      expect(() => {
        createOrderWithTelemetry({
          tableNumber: "میز ۱",
          sessionToken: "sess_unit_test",
          items: [],
        });
      }).toThrow();
    });

    it("creates an order, enforcing database prices and recording telemetry", () => {
      const products = getAllProducts();
      expect(products.length).toBeGreaterThanOrEqual(2);
      const prodA = products[0];
      const prodB = products[1];

      const expectedTotal = prodA.price * 2 + prodB.price * 1;

      const { order, telemetry: tel } = createOrderWithTelemetry({
        tableNumber: "میز ۳",
        customerName: "تست یونیت",
        sessionToken: "sess_unit_test_valid",
        items: [
          { productId: prodA.id, quantity: 2 },
          { productId: prodB.id, quantity: 1 },
        ],
      });

      expect(order.id).toBeDefined();
      expect(order.total_price).toBe(expectedTotal);
      expect(order.status).toBe("PENDING");
      expect(tel.totalUs).toBeGreaterThan(0);
      expect(tel.steps.length).toBeGreaterThan(0);

      // Verify order can be retrieved and items match
      const fetchedOrder = getOrderById(order.id);
      expect(fetchedOrder).not.toBeNull();
      expect(fetchedOrder?.items?.length).toBe(2);

      // Verify status transitions
      const brewing = updateOrderStatus(order.id, "BREWING");
      expect(brewing).toBe(true);
      expect(getOrderById(order.id)?.status).toBe("BREWING");

      const ready = updateOrderStatus(order.id, "READY");
      expect(ready).toBe(true);
      expect(getOrderById(order.id)?.status).toBe("READY");
    });
  });
});
