import re

css_path = "frontend/css/style.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Peyda @font-face rules
peyda_font_faces = """/* ========================================
   0. تعریف فونت لوکس و مدرن پیدا (Peyda Modern Font Family)
   و فونت پشتیبان وزیرمتن (Vazirmatn Fallback)
======================================== */
@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-Medium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-ExtraBold.woff2") format("woff2");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Peyda";
  src: url("../fonts/Peyda-Black.woff2") format("woff2");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}

"""

if 'font-family: "Peyda"' not in content:
    # Insert before the first @font-face
    first_font_face = content.find("@font-face")
    if first_font_face != -1:
        # Also clean the previous comment header if present
        header_start = content.rfind("/*", 0, first_font_face)
        if header_start != -1:
            content = content[:header_start] + peyda_font_faces + content[first_font_face:]
        else:
            content = peyda_font_faces + content

# 2. Update font variable definitions
old_font_pattern = r'--font-sans:\s*"Vazirmatn"[^;]+;'
new_font_def = '--font-peyda: "Peyda", "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  --font-sans: "Peyda", "Vazirmatn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  --font-body: "Vazirmatn", "Peyda", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'

content = re.sub(old_font_pattern, new_font_def, content)

# 3. Add .soren-price-lockup support classes
price_lockup_css = """
/* ------------------------------------------------------------------
   تایپوگرافی مدرن قیمت به سبک فین‌تک / دیجی‌کالا (Peyda Tabular Lockup)
   ------------------------------------------------------------------ */
.soren-price-lockup {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  direction: rtl;
  font-family: var(--font-peyda);
}

.soren-price-lockup .price-amount {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.soren-price-lockup .toman-glyph {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--muted, #766E66);
  opacity: 0.85;
}
"""

if ".soren-price-lockup" not in content:
    content += "\n" + price_lockup_css

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✔ style.css successfully updated with Peyda @font-face rules, --font-sans and .soren-price-lockup!")
