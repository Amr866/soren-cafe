import glob

with open("frontend/index.html", "r", encoding="utf-8") as f:
    idx = f.read()

if "style.css?v=" not in idx:
    idx = idx.replace('href="./css/style.css"', 'href="./css/style.css?v=2.0-peyda"')
    with open("frontend/index.html", "w", encoding="utf-8") as f:
        f.write(idx)
    print("Updated index.html with cache-buster")

for p in glob.glob("frontend/pages/*.html"):
    with open(p, "r", encoding="utf-8") as f:
        c = f.read()
    if "style.css?v=" not in c:
        c = c.replace('href="../css/style.css"', 'href="../css/style.css?v=2.0-peyda"')
        with open(p, "w", encoding="utf-8") as f:
            f.write(c)
        print("Updated", p, "with cache-buster")

print("All HTML files updated with cache-busting query parameter!")
