"""Check a docx saved by the Word editor (stage 1): fonts, page setup, header/footer, page breaks, pictures; then LibreOffice → PDF for page count and fonts."""
import sys, subprocess, tempfile, os, re, zipfile
from docx import Document
from docx.shared import Mm
path = sys.argv[1]; fails = 0
def ok(c, m):
    global fails
    print(("PASS " if c else "FAIL ") + m); fails += (not c)
d = Document(path)
fonts = set()
for p in d.paragraphs:
    for r in p.runs:
        if r.font.name: fonts.add(r.font.name)
ok({"Calibri", "Verdana", "Georgia", "Arial", "Cambria"} <= fonts, "fonts named in runs: " + ", ".join(sorted(fonts)))
ok(not any(re.search(r"Carlito|Tinos|Arimo|Caladea|Gelasio", f) for f in fonts), "no web-font stand-in names written")
st = d.styles["Normal"].font; x = zipfile.ZipFile(path).read("word/styles.xml").decode()
ok('w:ascii="Times New Roman"' in x and 'w:sz w:val="24"' in x, "document default Times New Roman 12pt")
s = d.sections[0]
ok(abs(s.page_width.mm - 279.4) < 1 and abs(s.page_height.mm - 215.9) < 1 and s.orientation == 1, f"Letter landscape {s.page_width.mm:.1f}×{s.page_height.mm:.1f} orient={s.orientation}")
ok(abs(s.top_margin.mm - 12.7) < .3 and abs(s.left_margin.mm - 12.7) < .3, "narrow margins")
hx = zipfile.ZipFile(path).read("word/footer1.xml").decode()
ok("Confidential" in hx and "PAGE" in hx and 'w:val="right"' in hx, "footer text + PAGE field right aligned")
ok("BDO" in zipfile.ZipFile(path).read("word/header1.xml").decode(), "header text kept")
dx = zipfile.ZipFile(path).read("word/document.xml").decode()
ok(dx.count('w:type="page"') >= 2, "page breaks: %d" % dx.count('w:type="page"'))
ok(len(d.inline_shapes) == 3, "WordArt + 2 shapes as pictures: %d" % len(d.inline_shapes))
ok('<w:vertAlign w:val="superscript"/>' in dx and "<w:strike/>" in dx and "<w:pBdr>" in dx and 'w:line="360"' in dx and '<w:ind w:left="720"' in dx, "superscript, strike, borders, 1.5 spacing, indent written")
ok('w:fill="FFFF00"' in dx and 'w:color w:val="1F4E79"' in dx, "highlight + font colour written")
with tempfile.TemporaryDirectory() as t:
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", t, path], capture_output=True, timeout=180)
    pdf = os.path.join(t, os.path.basename(path)[:-5] + ".pdf")
    ok(os.path.exists(pdf), "LibreOffice opens and converts it")
    if os.path.exists(pdf):
        info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
        n = int(re.search(r"Pages:\s+(\d+)", info).group(1)); size = re.search(r"Page size:\s+([\d.]+) x ([\d.]+)", info)
        ok(n >= 5, f"LibreOffice page count {n}")
        ok(size and float(size.group(1)) > float(size.group(2)), "LibreOffice pages are landscape: " + (size.group(0) if size else "?"))
        pf = subprocess.run(["pdffonts", pdf], capture_output=True, text=True).stdout
        print("   pdf fonts:", ", ".join(sorted(set(re.findall(r"^\S+?\+(\S+)", pf, re.M)))))
        txt = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True).stdout
        ok("Last page typed text" in txt and "due date" in txt and "Confidential" in txt, "text, replacement and footer in the PDF")
print("ALL PASS" if not fails else f"{fails} FAILED"); sys.exit(1 if fails else 0)
