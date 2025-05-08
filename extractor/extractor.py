import fitz  # PyMuPDF
import requests
import re
import json
import os

URLS = [
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083100/2025-SS_S_ESV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083053/2025-SS_S_NIV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083106/2025-SS_S_NKJV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083102/2025-SS_S_KJV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083104/2025-SS_S_NASB_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083115/2025-SS_J_NKJV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083113/2025-SS_J_NASB_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083107/2025-SS_J_NIV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083109/2025-SS_J_ESV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083111/2025-SS_J_KJV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083125/2025-SS_P_NKJV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083123/2025-SS_P_NASB_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083117/2025-SS_P_NIV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083119/2025-SS_P_ESV_Full.pdf",
    "https://cdn.biblebee.org/wp-content/uploads/2025/05/01083121/2025-SS_P_KJV_Full.pdf",
]

DIVISION_MAP = {"P": "primary", "J": "junior", "S": "senior"}
output_dir = "../2025"
os.makedirs(output_dir, exist_ok=True)

def extract_passages_from_pdf(pdf_data: bytes, version: str, division: str):
    doc = fitz.open(stream=pdf_data, filetype="pdf")
    passages = []

    current_lines = []
    current_ref = None
    current_passage_number = None

    for page_num, page in enumerate(doc):
        lines = page.get_text().splitlines()
        print(f"\n--- PAGE {page_num + 1} ---")
        for line in lines:
            line = line.strip()
            print(f"> {line}")  # Debug: print every line seen

            # Skip boilerplate
            if line.startswith(("Created", "Explore Memory Passage", "Navigate Memory Passage", "National Bible Bee", "•")):
                continue

            # Check for "Senior Passage 1", etc.
            match_meta = re.match(r'^(Senior|Junior|Primary) Passage (\d+)', line)
            if match_meta:
                # Save previous passage if ready
                if current_ref and current_lines and current_passage_number is not None:
                    full_text = " ".join(current_lines).strip()
                    passages.append({
                        "reference": current_ref["reference"],
                        "translation": version.upper(),
                        "division": division.capitalize(),
                        "passage_number": current_passage_number,
                        "release": "Navigate",
                        "cards": [full_text],
                        "start_index": current_ref["start_index"],
                        "end_index": current_ref["end_index"],
                        "verse_count": current_ref["verse_count"],
                        "word_count": len(full_text.split())
                    })
                    print(f"✔ Saved passage #{current_passage_number}: {current_ref['reference']}")

                current_lines = []
                current_ref = None
                current_passage_number = int(match_meta.group(2))
                continue

            # Check for verse reference line
            match_ref = re.match(r'^([A-Za-z ]+\d+ ?:\d+(?:[–-]\d+)?)(?: \((\d+)/(\d+)\))?', line)
            if match_ref:
                current_ref = {
                    "reference": match_ref.group(1),
                    "start_index": int(match_ref.group(2)) if match_ref.group(2) else 0,
                    "end_index": int(match_ref.group(3)) if match_ref.group(3) else 0,
                    "verse_count": int(match_ref.group(3)) if match_ref.group(3) else 0,
                }
                print(f"📖 Found reference: {current_ref['reference']}")
                continue

            # Capture passage content
            if current_passage_number is not None:
                current_lines.append(line)

    # Flush final passage
    if current_ref and current_lines and current_passage_number is not None:
        full_text = " ".join(current_lines).strip()
        passages.append({
            "reference": current_ref["reference"],
            "translation": version.upper(),
            "division": division.capitalize(),
            "passage_number": current_passage_number,
            "release": "Navigate",
            "cards": [full_text],
            "start_index": current_ref["start_index"],
            "end_index": current_ref["end_index"],
            "verse_count": current_ref["verse_count"],
            "word_count": len(full_text.split())
        })
        print(f"✔ Saved passage #{current_passage_number}: {current_ref['reference']}")

    return passages

# MAIN
for url in URLS:
    filename = url.split("/")[-1]
    match = re.search(r"_([PJS])_([A-Z]+)_", filename)
    if not match:
        print(f"❌ Could not parse division/version from: {filename}")
        continue

    div_code, version = match.groups()
    division = DIVISION_MAP.get(div_code, "unknown")
    out_path = os.path.join(output_dir, f"{division}-{version.lower()}.json")

    print(f"\nDownloading {url}")
    response = requests.get(url)
    response.raise_for_status()

    passages = extract_passages_from_pdf(response.content, version, division)
    print(f"\n✅ Found {len(passages)} passages in {division} {version.upper()}")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(passages, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved to {out_path}")
