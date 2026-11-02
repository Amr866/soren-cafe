import glob

# index.html
with open("frontend/index.html", "r", encoding="utf-8") as f:
    idx = f.read()

preload_index = """    <!-- پیش‌لود پرسرعت فونت‌های محلی پیدا -->
    <link rel="preload" href="./fonts/Peyda-Regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="./fonts/Peyda-Bold.woff2" as="font" type="font/woff2" crossorigin />
"""

if "Peyda-Regular.woff2" not in idx:
    idx = idx.replace('<link rel="stylesheet" href="./css/style.css"', preload_index + '    <link rel="stylesheet" href="./css/style.css"')
    with open("frontend/index.html", "w", encoding="utf-8") as f:
        f.write(idx)
    print("Updated frontend/index.html")

# pages/*.html
preload_pages = """    <!-- پیش‌لود پرسرعت فونت‌های محلی پیدا -->
    <link rel="preload" href="../fonts/Peyda-Regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="../fonts/Peyda-Bold.woff2" as="font" type="font/woff2" crossorigin />
"""

for page in glob.glob("frontend/pages/*.html"):
    with open(page, "r", encoding="utf-8") as f:
        p_content = f.read()
    if "Peyda-Regular.woff2" not in p_content:
        p_content = p_content.replace('<link rel="stylesheet" href="../css/style.css"', preload_pages + '    <link rel="stylesheet" href="../css/style.css"')
        with open(page, "w", encoding="utf-8") as f:
            f.write(p_content)
        print("Updated", page)

print("All HTML files preloaded with Peyda WOFF2 fonts successfully!")
