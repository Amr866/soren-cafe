import os
import zipfile
import io
from fontTools.ttLib import TTFont

ZIP_PATH = r"C:\Users\hp\.gemini\antigravity\brain\94a7d6ed-19f4-4657-a401-8e74999927fa\.user_uploaded\media_1793565531617_c4f96297.zip"
OUTPUT_DIR = r"D:\projects\soren-cafe\frontend\fonts"

TARGETS = {
    "static/Vazirmatn-Medium.ttf": "Vazirmatn-Medium.woff2",
    "static/Vazirmatn-SemiBold.ttf": "Vazirmatn-SemiBold.woff2",
    "static/Vazirmatn-ExtraBold.ttf": "Vazirmatn-ExtraBold.woff2",
}

print("☕ Extracting and converting Vazirmatn Medium, SemiBold & ExtraBold to WOFF2...")
print("=" * 65)

with zipfile.ZipFile(ZIP_PATH, 'r') as z:
    for src_path, target_name in TARGETS.items():
        raw_data = z.read(src_path)
        raw_size = len(raw_data)
        
        font = TTFont(io.BytesIO(raw_data))
        font.flavor = "woff2"
        out_path = os.path.join(OUTPUT_DIR, target_name)
        font.save(out_path)
        
        woff2_size = os.path.getsize(out_path)
        savings = (1 - (woff2_size / raw_size)) * 100
        print(f"✔ {src_path:30} -> {target_name:25} | {raw_size/1024:.1f} KB -> {woff2_size/1024:.1f} KB ({savings:.1f}% saved)")

print("=" * 65)
print("🎉 Vazirmatn weights successfully added to frontend/fonts!")
