/**
 * Soren Café — Auth Flow Module
 * High-performance, anti-enumeration, accessible password reset logic.
 */

(function initAuthFlow() {
  const API_BASE = "/api/v1";

  // Helper: Format Persian digits
  function toPersianDigits(n) {
    const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return String(n).replace(/\d/g, (x) => farsiDigits[x]);
  }

  // Helper: RFC 5322-compatible email validation
  function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim();
    if (trimmed.length < 5 || trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  // Helper: Display Alert Banner
  function showAlert(containerEl, type, message) {
    if (!containerEl) return;
    const alertIcons = {
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    };

    containerEl.innerHTML = `
      <div class="auth-alert auth-alert--${type}" role="alert">
        ${alertIcons[type] || ""}
        <div class="auth-alert-content">${message}</div>
      </div>
    `;
    containerEl.hidden = false;
  }

  function clearAlert(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    containerEl.hidden = true;
  }

  /* -------------------------------------------------------------
     FLOW A: FORGOT PASSWORD (/forgot-password)
  ------------------------------------------------------------- */
  const forgotForm = document.getElementById("forgotPasswordForm");
  if (forgotForm) {
    const emailInput = document.getElementById("forgotEmail");
    const emailWrapper = emailInput ? emailInput.closest(".input-wrapper") : null;
    const emailError = document.getElementById("emailError");
    const alertBox = document.getElementById("forgotAlertBox");
    const submitBtn = forgotForm.querySelector(".auth-button");
    const initialView = document.getElementById("forgotInitialView");
    const confirmView = document.getElementById("forgotConfirmView");
    const confirmedEmailDisplay = document.getElementById("confirmedEmailDisplay");
    const resendBtn = document.getElementById("resendBtn");
    const resendCountdownText = document.getElementById("resendCountdownText");
    const changeEmailBtn = document.getElementById("changeEmailBtn");

    let cooldownInterval = null;
    let remainingCooldown = 0;

    function validateEmailField() {
      const val = emailInput.value.trim();
      if (!val) {
        emailWrapper?.classList.remove("is-valid", "is-invalid");
        if (emailError) emailError.textContent = "";
        return false;
      }
      if (!isValidEmail(val)) {
        emailWrapper?.classList.add("is-invalid");
        emailWrapper?.classList.remove("is-valid");
        if (emailError) emailError.textContent = "لطفاً یک آدرس ایمیل معتبر وارد کنید (مثال: name@domain.com)";
        return false;
      }
      emailWrapper?.classList.remove("is-invalid");
      emailWrapper?.classList.add("is-valid");
      if (emailError) emailError.textContent = "";
      return true;
    }

    emailInput?.addEventListener("input", () => {
      clearAlert(alertBox);
      if (emailWrapper?.classList.contains("is-invalid")) {
        validateEmailField();
      }
    });

    emailInput?.addEventListener("blur", validateEmailField);

    function startCooldown(seconds = 60) {
      if (cooldownInterval) clearInterval(cooldownInterval);
      remainingCooldown = seconds;
      if (resendBtn) resendBtn.disabled = true;

      function updateUI() {
        if (remainingCooldown <= 0) {
          clearInterval(cooldownInterval);
          if (resendBtn) resendBtn.disabled = false;
          if (resendCountdownText) resendCountdownText.textContent = "ارسال مجدد پیوند";
          return;
        }
        if (resendCountdownText) {
          resendCountdownText.textContent = `ارسال مجدد پیوند (${toPersianDigits(remainingCooldown)} ثانیه)`;
        }
        remainingCooldown--;
      }

      updateUI();
      cooldownInterval = setInterval(updateUI, 1000);
    }

    async function handleForgotRequest(emailVal) {
      clearAlert(alertBox);
      submitBtn?.classList.add("is-loading");
      if (submitBtn) submitBtn.disabled = true;
      if (resendBtn) resendBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal }),
        });

        const data = await response.json();

        if (response.status === 429) {
          showAlert(
            alertBox,
            "warning",
            data.message || "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً پس از پایان زمان شکیبایی مجدداً تلاش کنید."
          );
          startCooldown(data.retryAfter || 60);
          return;
        }

        if (!response.ok) {
          showAlert(alertBox, "error", data.message || "خطایی در پردازش رخ داد. لطفاً مجدداً امتحان کنید.");
          return;
        }

        // Generic Success State (Anti-Enumeration)
        if (confirmedEmailDisplay) {
          confirmedEmailDisplay.textContent = emailVal;
        }
        if (initialView) initialView.hidden = true;
        if (confirmView) {
          confirmView.hidden = false;
          confirmView.focus();
        }

        startCooldown(data.cooldownSeconds || 60);
      } catch (err) {
        showAlert(
          alertBox,
          "error",
          "ارتباط با سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی و دوباره تلاش فرمایید."
        );
      } finally {
        submitBtn?.classList.remove("is-loading");
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = emailInput.value.trim();
      if (!validateEmailField()) {
        emailInput.focus();
        return;
      }
      handleForgotRequest(val);
    });

    resendBtn?.addEventListener("click", () => {
      const val = emailInput.value.trim();
      if (!val) return;
      handleForgotRequest(val);
    });

    changeEmailBtn?.addEventListener("click", () => {
      if (confirmView) confirmView.hidden = true;
      if (initialView) initialView.hidden = false;
      emailInput?.focus();
      emailInput?.select();
    });
  }

  /* -------------------------------------------------------------
     FLOW B: RESET PASSWORD (/reset-password?token=...)
  ------------------------------------------------------------- */
  const resetForm = document.getElementById("resetPasswordForm");
  const tokenLoadingView = document.getElementById("tokenLoadingView");
  const tokenRecoveryView = document.getElementById("tokenRecoveryView");
  const resetSuccessView = document.getElementById("resetSuccessView");
  const resetAlertBox = document.getElementById("resetAlertBox");
  const recoveryReasonText = document.getElementById("recoveryReasonText");

  if (resetForm || tokenLoadingView) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || "";

    const passwordInput = document.getElementById("newPassword");
    const confirmInput = document.getElementById("confirmPassword");
    const strengthEl = document.getElementById("passwordStrength");
    const strengthLabel = strengthEl ? strengthEl.querySelector(".strength-label") : null;
    const submitBtn = resetForm?.querySelector(".auth-button");
    const userEmailMaskedEl = document.getElementById("userEmailMasked");
    const redirectCounterEl = document.getElementById("redirectCounter");

    // Password Criteria Checklist elements
    const ruleLen = document.getElementById("ruleLength");
    const ruleCase = document.getElementById("ruleCase");
    const ruleNum = document.getElementById("ruleNumber");
    const ruleMatch = document.getElementById("ruleMatch");
    const matchError = document.getElementById("matchError");

    // Password visibility toggle handler
    document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
      const targetInput = document.getElementById(btn.dataset.passwordToggle);
      if (!targetInput) return;
      btn.addEventListener("click", () => {
        const isPassword = targetInput.type === "password";
        targetInput.type = isPassword ? "text" : "password";
        btn.setAttribute("aria-pressed", String(isPassword));
        btn.setAttribute("aria-label", isPassword ? "پنهان کردن رمز" : "نمایش رمز");
      });
    });

    function showRecoveryScreen(reasonMessage) {
      if (tokenLoadingView) tokenLoadingView.hidden = true;
      if (resetForm) resetForm.closest(".form-content").hidden = true;
      if (tokenRecoveryView) {
        if (recoveryReasonText && reasonMessage) {
          recoveryReasonText.textContent = reasonMessage;
        }
        tokenRecoveryView.hidden = false;
        tokenRecoveryView.focus();
      }
    }

    // 1. Initial Token Verification
    async function verifyTokenOnLoad() {
      if (!token) {
        showRecoveryScreen("توکن بازیابی در نشانی صفحه یافت نشد. پیوند ممکن است ناقص کپی شده باشد.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          const reasonMsg =
            data.code === "EXPIRED"
              ? "مهلت استفاده از این لینک (۱۵ دقیقه) سپری شده است."
              : data.code === "ALREADY_USED"
              ? "از این پیوند بازیابی قبلاً برای تغییر رمز استفاده شده است."
              : "لینک بازیابی نامعتبر است یا توسط سرور تایید نشد.";
          showRecoveryScreen(reasonMsg);
          return;
        }

        // Token is valid! Show reset form
        if (tokenLoadingView) tokenLoadingView.hidden = true;
        if (resetForm) resetForm.closest(".form-content").hidden = false;
        if (userEmailMaskedEl && data.email) {
          userEmailMaskedEl.textContent = `حساب کاربری: ${data.email}`;
        }
        passwordInput?.focus();
      } catch (err) {
        showRecoveryScreen("امکان ارتباط با سرور برای اعتبارسنجی لینک وجود ندارد. لطفاً ارتباط خود را بررسی فرمایید.");
      }
    }

    // Password Strength Evaluator
    function evaluatePassword(pwd) {
      const hasLength = pwd.length >= 8;
      const hasCase = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
      const hasNumber = /\d/.test(pwd);
      const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

      ruleLen?.classList.toggle("is-met", hasLength);
      ruleCase?.classList.toggle("is-met", hasCase);
      ruleNum?.classList.toggle("is-met", hasNumber || hasSpecial);

      let score = 0;
      if (hasLength) score++;
      if (pwd.length >= 12) score++;
      if (hasCase) score++;
      if (hasNumber) score++;
      if (hasSpecial) score++;

      let level = 0;
      let label = "امنیت رمز";
      if (!pwd) {
        level = 0;
        label = "امنیت رمز";
      } else if (score <= 2) {
        level = 1;
        label = "ضعیف";
      } else if (score <= 3) {
        level = 2;
        label = "متوسط";
      } else {
        level = 3;
        label = "بسیار قوی";
      }

      if (strengthEl) strengthEl.dataset.level = String(level);
      if (strengthLabel) strengthLabel.textContent = label;
      return hasLength;
    }

    function checkPasswordMatch() {
      const pwd = passwordInput ? passwordInput.value : "";
      const confirmVal = confirmInput ? confirmInput.value : "";
      const wrapper = confirmInput?.closest(".input-wrapper");

      if (!confirmVal) {
        wrapper?.classList.remove("is-valid", "is-invalid");
        ruleMatch?.classList.remove("is-met");
        if (matchError) matchError.textContent = "";
        return false;
      }

      if (pwd === confirmVal) {
        wrapper?.classList.remove("is-invalid");
        wrapper?.classList.add("is-valid");
        ruleMatch?.classList.add("is-met");
        if (matchError) matchError.textContent = "";
        return true;
      } else {
        wrapper?.classList.remove("is-valid");
        wrapper?.classList.add("is-invalid");
        ruleMatch?.classList.remove("is-met");
        if (matchError) matchError.textContent = "رمزهای عبور با یکدیگر تطابق ندارند.";
        return false;
      }
    }

    passwordInput?.addEventListener("input", () => {
      clearAlert(resetAlertBox);
      evaluatePassword(passwordInput.value);
      if (confirmInput?.value) checkPasswordMatch();
    });

    confirmInput?.addEventListener("input", () => {
      clearAlert(resetAlertBox);
      checkPasswordMatch();
    });

    // Handle Reset Form Submit
    resetForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert(resetAlertBox);

      const pwd = passwordInput.value;
      const confirmVal = confirmInput.value;

      if (pwd.length < 8) {
        showAlert(resetAlertBox, "error", "رمز عبور باید حداقل ۸ کاراکتر باشد.");
        passwordInput.focus();
        return;
      }

      if (pwd !== confirmVal) {
        showAlert(resetAlertBox, "error", "رمزهای عبور وارد شده همخوانی ندارند.");
        confirmInput.focus();
        return;
      }

      submitBtn?.classList.add("is-loading");
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: pwd }),
        });

        const data = await response.json();

        if (!response.ok) {
          showAlert(resetAlertBox, "error", data.message || "ثبت رمز جدید با خطا مواجه شد.");
          return;
        }

        // Success state!
        if (resetForm) resetForm.closest(".form-content").hidden = true;
        if (resetSuccessView) {
          resetSuccessView.hidden = false;
          resetSuccessView.focus();
        }

        // Automatic redirect countdown (3 seconds)
        let redirectSeconds = 3;
        function updateCounter() {
          if (redirectCounterEl) {
            redirectCounterEl.textContent = `انتقال خودکار به ورود در ${toPersianDigits(redirectSeconds)} ثانیه...`;
          }
          if (redirectSeconds <= 0) {
            window.location.href = "./login.html";
            return;
          }
          redirectSeconds--;
          setTimeout(updateCounter, 1000);
        }
        updateCounter();
      } catch (err) {
        showAlert(resetAlertBox, "error", "خطا در ارتباط با سرور. لطفاً مجدداً امتحان کنید.");
      } finally {
        submitBtn?.classList.remove("is-loading");
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    verifyTokenOnLoad();
  }
})();
