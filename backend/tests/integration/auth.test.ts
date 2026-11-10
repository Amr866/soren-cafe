import { describe, it, expect } from "bun:test";
import { server } from "../../src/server.ts";
import { db, createPasswordReset, getUserByEmail } from "../../src/db.ts";

describe("Authentication: Forgot Password & Reset Password Security Flow", () => {
  const baseUrl = `http://localhost:${server.port}`;

  it("POST /api/v1/auth/forgot-password validates email format", async () => {
    const res = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email-format" }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe(true);
    expect(body.message).toContain("معتبر");
  });

  it("POST /api/v1/auth/forgot-password prevents user enumeration attacks", async () => {
    // 1. Existing user
    const resExisting = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Simulated-Ip": "192.168.10.1",
        },
        body: JSON.stringify({ email: "user@soren.cafe" }),
      })
    );
    expect(resExisting.status).toBe(200);
    const bodyExisting = (await resExisting.json()) as any;
    expect(bodyExisting.success).toBe(true);
    expect(bodyExisting.cooldownSeconds).toBe(60);

    // 2. Non-existent user
    const resNonExistent = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Simulated-Ip": "192.168.10.2",
        },
        body: JSON.stringify({ email: "doesnotexist@nowhere.com" }),
      })
    );
    expect(resNonExistent.status).toBe(200);
    const bodyNonExistent = (await resNonExistent.json()) as any;
    expect(bodyNonExistent.success).toBe(true);
    expect(bodyNonExistent.cooldownSeconds).toBe(60);

    // The user-facing success message must be IDENTICAL to prevent enumeration
    expect(bodyExisting.message).toBe(bodyNonExistent.message);
  });

  it("POST /api/v1/auth/forgot-password enforces rate limiting with 429 Too Many Requests", async () => {
    const simIp = "192.168.99.55";
    const testEmail = "rate_limit_test@soren.cafe";

    // First 3 requests should pass
    for (let i = 0; i < 3; i++) {
      const res = await server.fetch(
        new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Simulated-Ip": simIp,
          },
          body: JSON.stringify({ email: testEmail }),
        })
      );
      expect(res.status).toBe(200);
    }

    // 4th request must be rate limited with HTTP 429
    const blockedRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Simulated-Ip": simIp,
        },
        body: JSON.stringify({ email: testEmail }),
      })
    );
    expect(blockedRes.status).toBe(429);
    const blockedBody = (await blockedRes.json()) as any;
    expect(blockedBody.error).toBe(true);
    expect(blockedBody.retryAfter).toBeGreaterThan(0);
  });

  it("GET /api/v1/auth/verify-reset-token handles missing, invalid, and expired tokens", async () => {
    // Missing token
    const resMissing = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/verify-reset-token`)
    );
    expect(resMissing.status).toBe(400);

    // Invalid / tampered token
    const resInvalid = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=tampered_token_xyz`)
    );
    expect(resInvalid.status).toBe(400);
    const invalidBody = (await resInvalid.json()) as any;
    expect(invalidBody.code).toBe("INVALID_TOKEN");

    // Expired token
    const expiredToken = `expired_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    db.prepare(`
      INSERT OR REPLACE INTO password_resets (id, email, token, expires_at, used)
      VALUES (?, 'user@soren.cafe', ?, ?, 0)
    `).run(`rst_exp_${Date.now()}`, expiredToken, Date.now() - 5000);

    const resExpired = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${expiredToken}`)
    );
    expect(resExpired.status).toBe(400);
    const expiredBody = (await resExpired.json()) as any;
    expect(expiredBody.code).toBe("EXPIRED");
  });

  it("Completes full end-to-end token verification and password reset lifecycle", async () => {
    const testEmail = "user@soren.cafe";
    const initialUser = getUserByEmail(testEmail);
    expect(initialUser).toBeDefined();

    // 1. Generate a valid token
    const { token } = createPasswordReset(testEmail, 15 * 60 * 1000);

    // 2. Verify token
    const verifyRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${token}`)
    );
    expect(verifyRes.status).toBe(200);
    const verifyBody = (await verifyRes.json()) as any;
    expect(verifyBody.valid).toBe(true);
    expect(verifyBody.email).toContain("@soren.cafe");

    // 3. Reject password under 8 characters
    const shortPassRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "short" }),
      })
    );
    expect(shortPassRes.status).toBe(400);

    // 4. Reset password successfully
    const newPassword = "SorenNewSecurePassword2026!";
    const resetRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      })
    );
    expect(resetRes.status).toBe(200);
    const resetBody = (await resetRes.json()) as any;
    expect(resetBody.success).toBe(true);

    // 5. Verify token cannot be re-used (Single Use Guardrail)
    const reuseVerifyRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${token}`)
    );
    expect(reuseVerifyRes.status).toBe(400);
    const reuseVerifyBody = (await reuseVerifyRes.json()) as any;
    expect(reuseVerifyBody.code).toBe("ALREADY_USED");

    const reuseResetRes = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "AnotherPassword123!" }),
      })
    );
    expect(reuseResetRes.status).toBe(400);

    // 6. Verify password hash updated in SQLite
    const updatedUser = getUserByEmail(testEmail);
    expect(updatedUser).toBeDefined();
    const isMatch = await Bun.password.verify(newPassword, updatedUser!.password_hash);
    expect(isMatch).toBe(true);
  });
});
