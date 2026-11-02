import os
import zipfile
import io
from fontTools.ttLib import TTFont

ZIP_PATH = r"C:\Users\hp\.gemini\antigravity\brain\94a7d6ed-19f4-4657-a401-8e74999927fa\.user_uploaded\media_1793565035392_8b63090e.zip"
OUTPUT_DIR = r"D:\projects\soren-cafe\frontend\fonts"

WEIGHT_MAP = {
    "Peyda-Regular.ttf": "Peyda-Regular.woff2",
    "Peyda-Medium.ttf": "Peyda-Medium.woff2",
    "Peyda-SemiBold.ttf": "Peyda-SemiBold.woff2",
    "Peyda-Bold.ttf": "Peyda-Bold.woff2",
    "Peyda-ExtraBold.ttf": "Peyda-ExtraBold.woff2",
    "Peyda-Black.ttf": "Peyda-Black.woff2",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("☕ Extracting and converting Peyda font weights to WOFF2...")
print("=" * 65)

with zipfile.ZipFile(ZIP_PATH, 'r') as z:
    for filename in z.namelist():
        base = os.path.basename(filename)
        if base in WEIGHT_MAP:
            target_name = WEIGHT_MAP[base]
            target_path = os.path.join(OUTPUT_DIR, target_name)
            
            # Avoid duplicate subfolders inside zip
            if os.path.exists(target_path):
                continue
                
            raw_data = z.read(filename)
            raw_size = len(raw_data)
            
            # Convert TTF to WOFF2 using fontTools
            font = TTFont(io.BytesIO(raw_data))
            font.flavor = "woff2"
            font.save(target_path)
            
            woff2_size = os.path.getsize(target_path)
            savings = (1 - (woff2_size / raw_size)) * 100
            
            print(f"✔ {base:20} -> {target_name:22} | {raw_size/1024:.1f} KB -> {woff2_size/1024:.1f} KB ({savings:.1f}% saved)")

print("=" * 65)
print(f"🎉 Conversion complete! Saved to: {OUTPUT_DIR}")
