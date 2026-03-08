#!/usr/bin/env python3
"""
cie_uno_fill.py — Fill CIE .xls via LibreOffice UNO bridge.

Opens the ORIGINAL .xls template, writes DATA cell values only
(preserving 100% of formatting, images, merged cells, FORMULAS),
saves as .xls and exports PDF (CIE sheet only, fit to 1 page A4).

After filling, reads formula-computed values (CIE identifier from R6,
completion status from R4) and writes them to meta.json.

Usage:
  python3 cie_uno_fill.py <template.xls> <output.xls> <output.pdf> <cells.json> [meta.json]
"""
import uno
import os
import sys
import time
import json


def col_letter_to_index(col_str):
    """Convert column letter(s) to 0-based index: A=0, B=1, ..., Z=25, AA=26"""
    idx = 0
    for ch in col_str.upper():
        idx = idx * 26 + (ord(ch) - ord('A'))
    return idx


def main():
    if len(sys.argv) < 5:
        print("Usage: cie_uno_fill.py <template.xls> <output.xls> <output.pdf> <cells.json> [meta.json]",
              file=sys.stderr)
        sys.exit(1)

    xls_input = sys.argv[1]
    xls_output = sys.argv[2]
    pdf_output = sys.argv[3]
    data_json = sys.argv[4]
    meta_output = sys.argv[5] if len(sys.argv) > 5 else None

    # Load cell data
    with open(data_json, 'r', encoding='utf-8') as f:
        cells = json.load(f)

    # Connect to LibreOffice UNO
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context)

    ctx = None
    for _ in range(15):
        try:
            ctx = resolver.resolve(
                "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext")
            break
        except Exception:
            time.sleep(0.5)

    if not ctx:
        print("ERROR: Cannot connect to LibreOffice UNO", file=sys.stderr)
        sys.exit(1)

    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    from com.sun.star.beans import PropertyValue

    # ── Open original .xls ──
    file_url = uno.systemPathToFileUrl(os.path.abspath(xls_input))
    doc = desktop.loadComponentFromURL(file_url, "_blank", 0, ())

    if not doc:
        print("ERROR: Failed to open document", file=sys.stderr)
        sys.exit(1)

    sheets = doc.getSheets()
    cie = sheets.getByName("CIE")

    # ── Write cell values (DATA ONLY — no formula cells) ──
    filled = 0
    for entry in cells:
        col_idx = col_letter_to_index(entry["col"])
        row = entry["row"]
        value = entry["value"]
        vtype = entry.get("type", "string")

        cell = cie.getCellByPosition(col_idx, row)

        if vtype == "number":
            cell.setValue(float(value))
        else:
            cell.setString(str(value))

        filled += 1

    print(f"Filled {filled} cells")

    # ── Read formula-computed values ──
    # R6 = CIE identifier (computed by formulas in sheet "K")
    # R4 = Completion status (COMPLETADO / CIE INCOMPLETO)
    r6_cell = cie.getCellByPosition(col_letter_to_index("R"), 5)  # R6 = row 5
    r4_cell = cie.getCellByPosition(col_letter_to_index("R"), 3)  # R4 = row 3

    cie_id = r6_cell.getString()
    status = r4_cell.getString()
    print(f"CIE ID (from formula): {cie_id}")
    print(f"Status: {status}")

    # Write meta.json if path provided
    if meta_output:
        meta = {
            "cieIdentificador": cie_id,
            "status": status,
        }
        with open(meta_output, 'w', encoding='utf-8') as f:
            json.dump(meta, f)
        print(f"Meta saved: {meta_output}")

    # ── Save as .xls (all sheets, formulas preserved) ──
    xls_url = uno.systemPathToFileUrl(os.path.abspath(xls_output))
    save_filter = PropertyValue()
    save_filter.Name = "FilterName"
    save_filter.Value = "MS Excel 97"
    doc.storeToURL(xls_url, (save_filter,))
    print(f"Saved .xls: {xls_output}")

    # ── Configure for PDF export ──
    page_styles = doc.getStyleFamilies().getByName("PageStyles")
    style = page_styles.getByName(cie.PageStyle)
    style.ScaleToPagesX = 1
    style.ScaleToPagesY = 1
    style.LeftMargin = 500
    style.RightMargin = 500
    style.TopMargin = 500
    style.BottomMargin = 500

    controller = doc.getCurrentController()
    controller.setActiveSheet(cie)

    pdf_filter = PropertyValue()
    pdf_filter.Name = "FilterName"
    pdf_filter.Value = "calc_pdf_Export"

    fd_selection = PropertyValue()
    fd_selection.Name = "Selection"
    fd_selection.Value = cie

    filter_data = PropertyValue()
    filter_data.Name = "FilterData"
    filter_data.Value = uno.Any(
        "[]com.sun.star.beans.PropertyValue", (fd_selection,))

    pdf_url = uno.systemPathToFileUrl(os.path.abspath(pdf_output))
    doc.storeToURL(pdf_url, (pdf_filter, filter_data))
    print(f"Exported PDF: {pdf_output}")

    doc.close(True)
    print("Done")


if __name__ == "__main__":
    main()
