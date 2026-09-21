"""Raster-only copies of a synthetic fixture. Never accepts customer documents."""
from pathlib import Path
from io import BytesIO
import subprocess
import tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

root = Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix="sparow-synthetic-ocr-") as directory:
    prefix = str(Path(directory) / "page")
    subprocess.run(["pdftoppm", "-r", "300", "-singlefile", "-png", str(root / "kotak.pdf"), prefix], check=True)
    raw = BytesIO()
    pdf = canvas.Canvas(raw, pagesize=(790, 840), invariant=1)
    pdf.setTitle("Synthetic scanned statement - no customer data")
    pdf.drawImage(ImageReader(prefix + ".png"), 0, 0, width=790, height=840)
    pdf.save()
    for name, locked in [("ocr-clean.pdf", False), ("ocr-locked.pdf", True)]:
        writer = PdfWriter(clone_from=PdfReader(BytesIO(raw.getvalue())))
        if locked:
            writer.encrypt("FixtureOnly42!", owner_password="SyntheticOwnerOnly42!", algorithm="AES-256")
        writer.write(str(root / name))
print("Generated two synthetic OCR fixtures")
