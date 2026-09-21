"""Independent, local-only oracle for the observed numbered Kotak layout.

Reads an explicitly supplied PDF and emits JSON to stdout. It does not save the
source or its extracted rows. Do not redirect private output into the repository.
"""
import json
import re
import sys
from datetime import datetime
from decimal import Decimal
import pdfplumber


def money(text):
    if not text or text == "-":
        return 0
    assert re.fullmatch(r"[\d,]+\.\d{2}", text), "Unexpected monetary token"
    return int(Decimal(text.replace(",", "")) * 100)


def inspect(path):
    rows = []
    opening = closing = None
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            groups = []
            for word in sorted(page.extract_words(x_tolerance=1), key=lambda w: (w["top"], w["x0"])):
                if not groups or abs(groups[-1][0]["top"] - word["top"]) > 2:
                    groups.append([])
                groups[-1].append(word)
            for words in groups:
                words.sort(key=lambda w: w["x0"])
                def field(left, right):
                    return " ".join(w["text"] for w in words if left <= w["x0"] < right)
                serial, date = field(34, 65), field(65, 114)
                if serial.isdigit() and re.fullmatch(r"\d{2} [A-Za-z]{3} \d{4}", date):
                    rows.append({"sequence": int(serial), "page": page_number, "date": datetime.strptime(date, "%d %b %Y").strftime("%Y-%m-%d"), "description": field(114, 269), "reference": field(269, 344), "debitPaise": money(field(344, 423)), "creditPaise": money(field(423, 492)), "balancePaise": money(field(492, 562))})
                elif rows and rows[-1]["page"] == page_number and not field(0, 114) and field(114, 269) and not field(344, 600):
                    rows[-1]["description"] += " " + field(114, 269)
                    if field(269, 344):
                        rows[-1]["reference"] += " " + field(269, 344)
                if re.fullmatch(r"(?:Savings|Current) Account \([A-Z]+\):", field(34, 280)):
                    opening, closing = money(field(280, 420)), money(field(420, 562))
        assert opening is not None and closing is not None, "Missing independent account summary"
        running = opening
        for index, row in enumerate(rows, 1):
            assert row["sequence"] == index, "Non-contiguous independent source sequence"
            running += row["creditPaise"] - row["debitPaise"]
            assert running == row["balancePaise"], "Independent running-balance mismatch"
        assert running == closing, "Independent closing-balance mismatch"
        return {"pageCount": len(pdf.pages), "openingPaise": opening, "closingPaise": closing, "rows": rows}


if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1])))
