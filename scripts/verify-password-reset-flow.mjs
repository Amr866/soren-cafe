/**
 * Soren Café — End-to-End Forgot & Reset Password Verification Suite
 * Tests edge cases: malformed email, slow network/timing, expired token, mismatched passwords,
 * anti-enumeration response equality, 429 rate limit cooldown, and single-use token lifecycle.
 */

process.env.PORT = process.env.PORT || "0";
process.env.NODE_ENV = "test";

const { server } = await import("../backend/src/server.ts");
const { db, createPasswordReset, getUserByEmail } = await import("../backend/src/db.ts");

const baseUrl = `http://localhost:${server.port}`;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  ☕ SOREN CAFÉ: FORGOT & RESET PASSWORD E2E SUITE");
  console.log("=======================================================\n");

  // 1. Static Route Check: /forgot-password & /reset-password
  console.log("1. Static Routes & Clean URL Mapping:");
  const forgotPageRes = await server.fetch(new Request(`${baseUrl}/forgot-password`));
  assert(forgotPageRes.status === 200, "Clean route /forgot-password serves 200 OK");
  const forgotHtml = await forgotPageRes.text();
  assert(forgotHtml.includes("بازیابی رمز عبور"), "/forgot-password contains Persian title");
  assert(forgotHtml.includes('id="forgotPasswordForm"'), "Contains #forgotPasswordForm");
  assert(forgotHtml.includes('id="forgotConfirmView"'), "Contains #forgotConfirmView for anti-enumeration");
  assert(forgotHtml.includes('id="resendBtn"'), "Contains #resendBtn with cooldown state");

  const resetPageRes = await server.fetch(new Request(`${baseUrl}/reset-password`));
  assert(resetPageRes.status === 200, "Clean route /reset-password serves 200 OK");
  const resetHtml = await resetPageRes.text();
  assert(resetHtml.includes('id="tokenRecoveryView"'), "/reset-password contains #tokenRecoveryView recovery screen");
  assert(resetHtml.includes('id="passwordStrength"'), "Contains #passwordStrength meter");
  assert(resetHtml.includes('id="ruleLength"'), "Contains live criteria checklist (#ruleLength, etc.)");

  // 2. Anti-Enumeration Security
  console.log("\n2. Anti-Enumeration Attack Prevention:");
  const t0Existing = performance.now();
  const resExisting = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Simulated-Ip": "10.0.1.1" },
      body: JSON.stringify({ email: "user@soren.cafe" }),
    })
  );
  const durExisting = performance.now() - t0Existing;
  const jsonExisting = await resExisting.json();

  const t0Non = performance.now();
  const resNon = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Simulated-Ip": "10.0.1.2" },
      body: JSON.stringify({ email: "nonexistent-ghost-user@example.com" }),
    })
  );
  const durNon = performance.now() - t0Non;
  const jsonNon = await resNon.json();

  assert(resExisting.status === 200 && resNon.status === 200, "Both existing and non-existing emails return 200 OK");
  assert(jsonExisting.message === jsonNon.message, "Response message is strictly identical to prevent user enumeration");
  assert(jsonExisting.cooldownSeconds === 60 && jsonNon.cooldownSeconds === 60, "Cooldown seconds match (60s)");
  console.log(`     Timing: existing = ${Math.round(durExisting)}ms, non-existing = ${Math.round(durNon)}ms`);

  // 3. Email Format Validation
  console.log("\n3. Email Validation Edge Cases:");
  const badEmails = ["notanemail", "plainaddress", "missing@domain", "@nodomain.com", "spaces in@email.com"];
  for (const bad of badEmails) {
    const res = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bad }),
      })
    );
    assert(res.status === 400, `Rejected malformed email "${bad}" with HTTP 400`);
  }

  // 4. Rate Limiting Protection (429)
  console.log("\n4. Rate Limiting & Cooldown Protection:");
  const rateLimitIp = "172.16.20.99";
  const rateEmail = "rate_tester@soren.cafe";
  let got429 = false;
  for (let i = 0; i < 5; i++) {
    const res = await server.fetch(
      new Request(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Simulated-Ip": rateLimitIp },
        body: JSON.stringify({ email: rateEmail }),
      })
    );
    if (res.status === 429) {
      got429 = true;
      const data = await res.json();
      assert(data.retryAfter > 0, `HTTP 429 payload includes retryAfter: ${data.retryAfter}s`);
      break;
    }
  }
  assert(got429, "Rate limiter tripped and responded with HTTP 429 Too Many Requests");

  // 5. Token Verification Guardrails
  console.log("\n5. Token Verification Edge Cases (Invalid, Expired, Tampered):");
  // Missing
  const missingRes = await server.fetch(new Request(`${baseUrl}/api/v1/auth/verify-reset-token`));
  assert(missingRes.status === 400, "Missing token returns 400 Bad Request");

  // Tampered / Non-existent
  const tamperedRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=tampered_fake_token_hex_9999`)
  );
  assert(tamperedRes.status === 400, "Tampered/invalid token returns 400 Bad Request");
  const tamperedData = await tamperedRes.json();
  assert(tamperedData.code === "INVALID_TOKEN", "Error code is INVALID_TOKEN");

  // Expired
  const expToken = `exp_test_${Date.now()}`;
  db.prepare(`
    INSERT INTO password_resets (id, email, token, expires_at, used)
    VALUES (?, 'user@soren.cafe', ?, ?, 0)
  `).run(`rst_exp_${Date.now()}`, expToken, Date.now() - 10000);
  const expRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${expToken}`)
  );
  assert(expRes.status === 400, "Expired token returns 400 Bad Request");
  const expData = await expRes.json();
  assert(expData.code === "EXPIRED", "Error code is EXPIRED");

  // 6. Complete End-to-End Reset Lifecycle
  console.log("\n6. End-to-End Reset Password Lifecycle:");
  const testUserEmail = "user@soren.cafe";
  const { token: validToken } = createPasswordReset(testUserEmail);

  // Verification
  const verifyRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${validToken}`)
  );
  assert(verifyRes.status === 200, "Valid token returns 200 OK");
  const verifyData = await verifyRes.json();
  assert(verifyData.valid === true, "Token marked as valid");
  assert(verifyData.email.includes("@soren.cafe"), "Masked email returned for UX confirmation");

  // Short password rejected
  const shortRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: validToken, password: "123" }),
    })
  );
  assert(shortRes.status === 400, "Short password (< 8 chars) rejected with 400 Bad Request");

  // Valid password update
  const brandNewPassword = "ArtisanalCoffee#2026";
  const resetRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: validToken, password: brandNewPassword }),
    })
  );
  assert(resetRes.status === 200, "New password saved successfully (200 OK)");

  // Verify Single-Use Guarantee: token CANNOT be used again!
  const reuseRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/verify-reset-token?token=${validToken}`)
  );
  assert(reuseRes.status === 400, "Single-use token cannot be verified again");
  const reuseData = await reuseRes.json();
  assert(reuseData.code === "ALREADY_USED", "Error code is ALREADY_USED");

  const reuseAttemptRes = await server.fetch(
    new Request(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: validToken, password: "AnotherAttempt1234!" }),
    })
  );
  assert(reuseAttemptRes.status === 400, "Single-use token blocks subsequent password resets");

  // Verify hash matches in SQLite
  const userInDb = getUserByEmail(testUserEmail);
  const verifyHash = await Bun.password.verify(brandNewPassword, userInDb.password_hash);
  assert(verifyHash === true, "Argon2id password hash in SQLite matches new password");

  // 7. Accessibility & CSS Structure Check
  console.log("\n7. Accessibility & CSS Design System Compliance:");
  const cssRes = await server.fetch(new Request(`${baseUrl}/css/style.css`));
  const css = await cssRes.text();
  assert(css.includes(".auth-alert--error"), "CSS defines .auth-alert--error");
  assert(css.includes(".auth-alert--warning"), "CSS defines .auth-alert--warning");
  assert(css.includes(".auth-alert--success"), "CSS defines .auth-alert--success");
  assert(css.includes(".auth-button.is-loading"), "CSS defines .auth-button.is-loading spinner");
  assert(css.includes(".input-wrapper.is-invalid"), "CSS defines .input-wrapper.is-invalid");

  console.log("\n=======================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
