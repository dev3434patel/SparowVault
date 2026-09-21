"""Synthetic layout/crypto regression fixtures, not samples issued by banks."""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

OUT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 790, 840
POSITIONS = [24, 100, 330, 430, 540, 650]
ROWS = [
    ["01/08/2026", "SALARY ACME", "R01", "", "50,000.00", "60,000.00"],
    ["02/08/2026", "UPI ZOMATO", "R02", "500.50", "", "59,499.50"],
    ["03/08/2026", "UPI UNKNOWN PERSON", "R03", "1,000.00", "", "58,499.50"],
]
BANKS = {
    "hdfc": ("HDFC Bank", ["Date", "Narration", "Chq/Ref No", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]),
    "kotak": ("Kotak Mahindra Bank", ["Date", "Narration", "Ref No", "Debit", "Credit", "Balance"]),
    "sbi": ("State Bank of India", ["Txn Date", "Description", "Ref No/Cheque No", "Debit", "Credit", "Balance"]),
    "indusind": ("IndusInd Bank", ["Date", "Particulars", "Chq No", "Withdrawal", "Deposit", "Balance"]),
    "axis": ("Axis Bank", ["Tran Date", "Particulars", "Cheque No", "Debit", "Credit", "Balance"]),
}

def heading(pdf, bank, headers, opening=True):
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(24, HEIGHT - 35, bank)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(24, HEIGHT - 60, "SYNTHETIC ACCOUNT STATEMENT - NOT BANK ISSUED")
    pdf.drawString(24, HEIGHT - 85, "Statement Period: 01/08/2026 to 31/08/2026")
    pdf.drawString(24, HEIGHT - 105, "Currency: INR")
    if opening:
        pdf.drawString(24, HEIGHT - 130, "Opening Balance: 10,000.00")
    pdf.setFillColorRGB(.93, .94, .95)
    pdf.rect(20, HEIGHT - 172, WIDTH - 40, 26, fill=1, stroke=0)
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 9)
    for x, text in zip(POSITIONS, headers):
        pdf.drawString(x, HEIGHT - 163, text)

def entries(pdf, rows):
    pdf.setFont("Helvetica", 9)
    for index, row in enumerate(rows):
        y = HEIGHT - 195 - index * 35
        for x, text in zip(POSITIONS, row):
            pdf.drawString(x, y, text)
        pdf.setStrokeColorRGB(.83, .85, .88)
        pdf.line(20, y - 13, WIDTH - 20, y - 13)

def create(name, bank_id, encrypted=False, multi=False):
    bank, headers = BANKS[bank_id]
    output = BytesIO() if encrypted else str(OUT / name)
    pdf = canvas.Canvas(output, pagesize=(WIDTH, HEIGHT), invariant=1)
    pdf.setTitle("Synthetic statement extraction fixture")
    heading(pdf, bank, headers)
    entries(pdf, ROWS[:2] if multi else ROWS)
    if multi:
        pdf.showPage()
        heading(pdf, bank, headers, opening=False)
        entries(pdf, ROWS[2:])
    pdf.setFont("Helvetica", 10)
    pdf.drawString(24, HEIGHT - 330, "Closing Balance: 58,499.50")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(24, 30, "TEST FIXTURE - contains no real customer or account data")
    pdf.save()
    if encrypted:
        output.seek(0)
        writer = PdfWriter(clone_from=PdfReader(output))
        writer.encrypt("FixtureOnly42!", owner_password="SyntheticOwnerOnly42!", algorithm="AES-256")
        writer.write(str(OUT / name))

for bank_id in BANKS:
    create(f"{bank_id}.pdf", bank_id)
create("hdfc-locked.pdf", "hdfc", encrypted=True)
create("multipage.pdf", "sbi", multi=True)
image = Image.new("RGB", (790, 840), "white")
draw = ImageDraw.Draw(image)
draw.text((40, 40), "SCANNED SYNTHETIC STATEMENT - IMAGE ONLY", fill="black")
draw.text((40, 80), "01/08/2026 Salary 50000.00 Credit Balance 60000.00", fill="black")
pdf = canvas.Canvas(str(OUT / "scanned.pdf"), pagesize=(WIDTH, HEIGHT), invariant=1)
pdf.drawImage(ImageReader(image), 0, 0, width=WIDTH, height=HEIGHT)
pdf.save()
print("Generated eight synthetic statement PDFs, including encrypted and image-only variants.")
