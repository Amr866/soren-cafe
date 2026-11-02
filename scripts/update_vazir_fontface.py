css_path = "frontend/css/style.css"
with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

old_vazir = """@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-Regular.woff2") format("woff2");
  font-weight: 100 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-Bold.woff2") format("woff2");
  font-weight: 600 900;
  font-style: normal;
  font-display: swap;
}"""

new_vazir = """@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-Medium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Vazirmatn";
  src: url("../fonts/Vazirmatn-ExtraBold.woff2") format("woff2");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}"""

normalized = content.replace("\r\n", "\n")
if old_vazir in normalized:
    normalized = normalized.replace(old_vazir, new_vazir)
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(normalized)
    print("✔ Vazirmatn @font-face rules updated with exact weights (400, 500, 600, 700, 800)!")
else:
    print("✖ Target pattern not found")
