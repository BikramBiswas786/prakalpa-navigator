import sys, openpyxl
p = sys.argv[1]; wb = openpyxl.load_workbook(p); fails = 0
def ok(c, m):
    global fails; print(("PASS " if c else "FAIL ") + m); fails += (not c)
ok(wb.sheetnames == ["Budget", "Data 2026", "Data 2026 (2)"], "sheets %s" % wb.sheetnames)
ws = wb["Budget"]; a1 = ws["A1"]
ok(a1.font.b and (a1.fill.fgColor.rgb or "").upper().endswith("1F4E79") and a1.font.name == "Arial", "A1 bold/fill/Arial %s %s" % (a1.fill.fgColor.rgb, a1.font.name))
ok("₹" in ws["C2"].number_format and "#,##" in ws["C2"].number_format, "C2 ₹ format %r" % ws["C2"].number_format)
ok("dd" in ws["D2"].number_format.lower() or "d" in ws["D2"].number_format, "D2 date format %r" % ws["D2"].number_format)
ok(ws["E2"].number_format == "0%", "E2 percent")
ok("A8:C8" in [str(r) for r in ws.merged_cells.ranges], "merge A8:C8 %s" % ws.merged_cells.ranges)
ok(ws.freeze_panes == "B3", "freeze %s" % ws.freeze_panes)
ok(ws["B3"].fill.fgColor.rgb.upper().endswith("FFFF00") and ws["B3"].font.name == "Times New Roman" and ws["B3"].font.sz == 14 and ws["B3"].border.top.style == "thin", "B3 range formatting")
ok(str(ws["G38"].value).startswith("='Data 2026'!B3") or str(ws["G38"].value).startswith("=\'Data 2026\'"), "cross-sheet formula %s" % ws["G38"].value)
ok(str(ws["G21"].value).upper().startswith("=VLOOKUP"), "VLOOKUP kept %s" % ws["G21"].value)
ok(len(ws.conditional_formatting) >= 1, "conditional formatting kept")
ok(ws["A13"].is_date or isinstance(ws["A13"].value, (int, float)), "A13 date value %r" % ws["A13"].value)
print("ALL PASS" if not fails else "%d FAILED" % fails); sys.exit(1 if fails else 0)
