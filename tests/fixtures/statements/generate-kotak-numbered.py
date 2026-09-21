"""Entirely synthetic data in the numbered Kotak export layout; no customer source is copied."""
from pathlib import Path
from reportlab.pdfgen import canvas

output = Path(__file__).with_name("kotak-numbered.pdf")
pdf = canvas.Canvas(str(output), pagesize=(595, 842), invariant=1)
pdf.setTitle("Synthetic numbered statement regression - not bank issued")


def text(x, y, value, size=7.68, right=False):
    pdf.setFont("Helvetica", size)
    (pdf.drawRightString if right else pdf.drawString)(x, 842 - y, value)


def page(number):
    text(36, 21, "SYNTHETIC FIXTURE - NOT BANK ISSUED", 9)
    text(36, 45, "Account Statement", 8)
    text(111, 45, "01 Apr 2025 - 31 Mar 2026", 8)
    text(36, 826, "Statement Generated on 01 Apr 2026, 12:00", 8)
    text(514, 826, f"Page {number} of", 8)
    text(559, 826, "4", 8)


def transaction(sequence, y, date, narration, reference, debit, credit, balance):
    for x, value in [(39, str(sequence)), (73, date), (119.19, narration), (274.66, reference)]:
        text(x, y, value)
    for x, value in [(417.9, debit), (486.95, credit), (556, balance)]:
        if value:
            text(x, y, value, right=True)


page(1)
text(36, 70, "Currency: INR")
pdf.setFillColorRGB(.91, .92, .93)
pdf.rect(34, 842 - 207, 527, 20, fill=1, stroke=0)
pdf.setFillColorRGB(0, 0, 0)
for x, label in [(44, "#"), (75.18, "Date"), (124.19, "Description"), (279.66, "Chq/Ref. No."), (354.85, "Withdrawal (Dr.)"), (428.9, "Deposit (Cr.)"), (497.95, "Balance")]:
    text(x, 200, label, 8)
for x, value in [(39, "-"), (70.18, "-"), (119.19, "Opening Balance"), (274.66, "-"), (415.51, "-"), (484.56, "-")]:
    text(x, 220, value)
text(556, 220, "1,000.00", right=True)
transaction(1, 240, "02 Apr 2025", "SALARY TEST", "R01", "", "5,000.00", "6,000.00")
transaction(2, 260, "03 Apr 2025", "UPI TEST SHOP", "R02", "100.25", "", "5,899.75")
text(119.19, 270, "WRAPPED NARRATION")
pdf.showPage()
page(2)
transaction(3, 100, "30 Mar 2026", "TRANSFER HDFC BANK", "R03", "2,000.00", "", "3,899.75")
transaction(4, 120, "31 Mar 2026", "TEST REFUND", "R04", "", "50.00", "3,949.75")
pdf.showPage()
page(3)
text(251, 97.5, "Account Summary", 12)
for x, label in [(53.4, "Particulars"), (285.73, "Opening Balance"), (428.36, "Closing Balance")]:
    text(x, 126, label, 9)
text(43.61, 148.68, "Savings Account (SA):")
text(386.37, 148.68, "1,000.00", right=True)
text(529, 148.68, "3,949.75", right=True)
text(63.75, 799, "Registered Office: Synthetic test address. www.kotak.bank.in")
pdf.showPage()
page(4)
text(39, 100, "Important information for your account")
text(39, 625, "ATL - ATM withdrawal")
text(300, 625, "Interest information 5,000.00")
pdf.save()
print("Generated one four-page synthetic numbered Kotak layout fixture.")
