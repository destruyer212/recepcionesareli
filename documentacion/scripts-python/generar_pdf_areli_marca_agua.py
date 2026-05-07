from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(r"C:\SpringProjectsnew\recepcionesareli")
SOURCE_LOGO = Path(r"C:\Users\CARLOS\Downloads\img20.png")
INPUT_PDF = ROOT / "documentacion" / "pdf" / "Contrato_Areli_Piso_3_4_Pack_VIP_Pro_Final_base.pdf"
OUTPUT_PDF = ROOT / "documentacion" / "pdf" / "Contrato_Areli_Piso_3_4_Pack_VIP_Pro_Final.pdf"
WATERMARK_IMAGE = ROOT / "documentacion" / "metadata" / "areli_pdf_watermark.png"


def make_pdf_watermark_image() -> None:
    WATERMARK_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_LOGO).convert("RGBA")
    image.thumbnail((1100, 900))
    alpha = image.getchannel("A").point(lambda value: int(value * 0.08))
    image.putalpha(alpha)
    image.save(WATERMARK_IMAGE)


def watermark_page(page_width: float, page_height: float) -> BytesIO:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(page_width, page_height))
    image = Image.open(WATERMARK_IMAGE)
    aspect = image.height / image.width
    draw_width = min(page_width * 0.55, 330)
    draw_height = draw_width * aspect
    x = (page_width - draw_width) / 2
    y = (page_height - draw_height) / 2
    pdf.drawImage(ImageReader(str(WATERMARK_IMAGE)), x, y, width=draw_width, height=draw_height, mask="auto")
    pdf.save()
    buffer.seek(0)
    return buffer


def apply_watermark() -> None:
    make_pdf_watermark_image()
    reader = PdfReader(str(INPUT_PDF))
    writer = PdfWriter()

    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        overlay = PdfReader(watermark_page(width, height)).pages[0]
        page.merge_page(overlay)
        writer.add_page(page)

    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PDF.open("wb") as fh:
        writer.write(fh)

    print(OUTPUT_PDF)


if __name__ == "__main__":
    apply_watermark()
