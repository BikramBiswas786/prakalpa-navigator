# Validates files saved by the Drafting Desk editors (run after tests/editors-ui.mjs): python-docx, openpyxl, PIL, LibreOffice.
import sys, subprocess, tempfile, os, docx, openpyxl
from PIL import Image
D = sys.argv[1] if len(sys.argv) > 1 else "/workspace/v-editors-live"
bad = 0
def ok(c, m):
    global bad; print(("PASS " if c else "FAIL ") + m); bad += (not c)
d = docx.Document(f"{D}/word-saved.docx"); st = [p.style.name for p in d.paragraphs]
ok("Heading 1" in st and "Heading 2" in st, "docx headings as Word styles")
ok(len(d.tables) == 1 and [c.text for c in d.tables[0]._cells][:2] == ["Item", "Amount"], "docx table")
ok(any(r.bold for p in d.paragraphs for r in p.runs), "docx bold runs")
ok(st.count("List Paragraph") == 4 and len(d.part.numbering_part.element.findall('.//{*}num')) >= 2, "docx bullet + numbered lists")
ok(len(d.inline_shapes) == 1, "docx picture")
ok(any("ZZ" in p.text and p.alignment == 1 for p in d.paragraphs), "docx edited paragraph is centred")
ok(any("বাংলা" in p.text for p in d.paragraphs), "docx Bengali text")
with tempfile.TemporaryDirectory() as t:
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", t, f"{D}/word-saved.docx"], capture_output=True, timeout=120)
    ok(os.path.exists(f"{t}/word-saved.pdf") and os.path.getsize(f"{t}/word-saved.pdf") > 5000, "docx opens and renders in LibreOffice")
wb = openpyxl.load_workbook(f"{D}/excel-saved.xlsx"); ws = wb["Budget"]
ok(wb.sheetnames == ["Budget", "Notes"], "xlsx both sheets")
ok(ws["D2"].value == "=B2*C2" and ws["D6"].value == "=SUM(D2:D4)" and ws["D8"].value == "=D6*2+ROUND(D7,0)", "xlsx formulas kept as formulas")
v = openpyxl.load_workbook(f"{D}/excel-saved.xlsx", data_only=True)
ok(v["Budget"]["D6"].value == 17250 and v["Notes"]["B1"].value == 8625 and v["Notes"]["A1"].value == "বাংলা নোট", "xlsx cached values + cross-sheet + Bengali")
ok(ws.freeze_panes == "A2" and abs(ws.column_dimensions["A"].width - 20) < 1.5, "xlsx frozen header + column width")
im = Image.open(f"{D}/image-saved.jpg"); ok(im.format == "JPEG" and im.size == (150, 200), "image saved as JPEG 150×200")
print("ALL PASS" if not bad else f"{bad} FAILED"); sys.exit(1 if bad else 0)
