from __future__ import annotations

from pathlib import Path
from typing import List, Optional


class PDFBuilder:
    def __init__(self) -> None:
        self.objects: List[Optional[bytes]] = []
        self.root_object: Optional[int] = None

    def add_object(self, content: bytes) -> int:
        self.objects.append(content)
        return len(self.objects)

    def reserve_object(self) -> int:
        self.objects.append(None)
        return len(self.objects)

    def set_object(self, obj_id: int, content: bytes) -> None:
        self.objects[obj_id - 1] = content

    def set_root(self, obj_id: int) -> None:
        self.root_object = obj_id

    def build(self) -> bytes:
        if self.root_object is None:
            raise ValueError("Root object not set")
        if any(obj is None for obj in self.objects):
            raise ValueError("Not all objects have been set")
        pdf = bytearray(b"%PDF-1.4\n")
        offsets = []
        for index, obj in enumerate(self.objects, start=1):
            assert obj is not None
            offsets.append(len(pdf))
            pdf.extend(f"{index} 0 obj\n".encode("ascii"))
            pdf.extend(obj)
            if not obj.endswith(b"\n"):
                pdf.extend(b"\n")
            pdf.extend(b"endobj\n")
        xref_offset = len(pdf)
        pdf.extend(f"xref\n0 {len(self.objects) + 1}\n".encode("ascii"))
        pdf.extend(b"0000000000 65535 f \n")
        for off in offsets:
            pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))
        trailer = (
            f"trailer\n<< /Size {len(self.objects) + 1} /Root {self.root_object} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        )
        pdf.extend(trailer.encode("ascii"))
        return bytes(pdf)


def make_stream(contents: str) -> bytes:
    stream_data = contents.encode("utf-8")
    header = f"<< /Length {len(stream_data)} >>\nstream\n".encode("ascii")
    footer = b"\nendstream\n"
    return header + stream_data + footer


def build_brochure(output_path: Path) -> None:
    builder = PDFBuilder()

    # Fonts
    regular_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    bold_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n")
    italic_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\n")

    font_resources = (
        f"<< /Font << /F1 {regular_font_obj} 0 R /F2 {bold_font_obj} 0 R /F3 {italic_font_obj} 0 R >> >>"
    )

    media_box = "[0 0 595 842]"

    pages_obj = builder.reserve_object()

    page_streams: List[int] = []
    page_objects: List[int] = []

    # Page 1 - Cover
    cover_content = """0.12 0.22 0.45 rg
0 0 595 842 re
f
0.06 0.12 0.24 rg
0 510 595 332 re
f
1 1 1 rg
BT
/F2 48 Tf
70 720 Td
(AKTONZ LETTINGS) Tj
0 -56 Td
/F2 26 Tf
(SETTING THE STANDARD IN RESIDENTIAL LETTINGS) Tj
0 -40 Td
/F1 16 Tf
(High-impact marketing, precision tenant matching, and data-led asset care.) Tj
0 -22 Td
(Partner with a lettings team obsessed with delivering premium results.) Tj
ET
0.84 0.55 0.16 rg
70 590 200 4 re
f
1 1 1 rg
BT
/F1 18 Tf
70 560 Td
(Data-backed pricing | Executive tenant network | 24/7 support) Tj
ET
0.88 0.32 0.20 rg
365 180 200 200 re
f
1 1 1 rg
BT
/F2 24 Tf
375 350 Td
(2023 Performance) Tj
0 -30 Td
/F1 14 Tf
(- 99% of landlords renew with Aktonz) Tj
0 -22 Td
(- 14 days average time-to-let) Tj
0 -22 Td
(- +8.7% rental uplift vs. market) Tj
ET
"""

    cover_stream = builder.add_object(make_stream(cover_content))
    page_streams.append(cover_stream)
    cover_page = builder.reserve_object()
    page_objects.append(cover_page)

    # Page 2 - Why Aktonz
    why_content = """1 1 1 rg
0 0 595 842 re
f
0.12 0.22 0.45 rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 34 Tf
60 780 Td
(Why landlords choose Aktonz) Tj
ET
0.06 0.12 0.24 rg
60 700 475 2 re
f
0 0 0 rg
BT
/F1 14 Tf
60 660 Td
(Aktonz blends boutique service with enterprise-grade intelligence to maximise every tenancy.) Tj
0 -20 Td
(Our dedicated specialists manage the full lifecycle: marketing, compliance, negotiation, and care.) Tj
ET
0.88 0.32 0.20 rg
60 610 150 150 re
f
1 1 1 rg
BT
/F2 22 Tf
70 730 Td
(Data Advantage) Tj
0 -26 Td
/F1 13 Tf
(AI-informed rental valuations for smarter pricing.) Tj
0 -18 Td
(Market trend dashboards keep you ahead of shifts.) Tj
ET
0.12 0.22 0.45 rg
225 610 150 150 re
f
1 1 1 rg
BT
/F2 22 Tf
235 730 Td
(Experience) Tj
0 -26 Td
/F1 13 Tf
(11-step tenant vetting protocol led by ARLA agents.) Tj
0 -18 Td
(Dedicated property partner from instruction to renewal.) Tj
ET
0.06 0.12 0.24 rg
390 610 150 150 re
f
1 1 1 rg
BT
/F2 22 Tf
400 730 Td
(Confidence) Tj
0 -26 Td
/F1 13 Tf
(Transparent reporting portal with live updates.) Tj
0 -18 Td
(Proactive compliance and maintenance auditing.) Tj
ET
0.84 0.55 0.16 rg
60 420 475 2 re
f
0 0 0 rg
BT
/F2 20 Tf
60 390 Td
(Aktonz impact in numbers) Tj
0 -26 Td
/F1 13 Tf
(98.4% rent collected on time | 21% of tenants from corporate relocations | 4.9/5 service rating) Tj
ET
"""

    why_stream = builder.add_object(make_stream(why_content))
    page_streams.append(why_stream)
    why_page = builder.reserve_object()
    page_objects.append(why_page)

    # Page 3 - Services and Journey
    services_content = """1 1 1 rg
0 0 595 842 re
f
0.06 0.12 0.24 rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 32 Tf
60 780 Td
(Your lettings journey, perfected) Tj
ET
0.12 0.22 0.45 rg
60 700 475 2 re
f
0 0 0 rg
BT
/F2 20 Tf
60 670 Td
(Launch with impact) Tj
0 -24 Td
/F1 13 Tf
(- Signature lifestyle photography and videography within 48 hours.) Tj
0 -18 Td
(- Premium listings across major portals and Aktonz relocation partners.) Tj
0 -18 Td
(- Bespoke brochure and paid targeting to qualified tenants.) Tj
0 -32 Td
/F2 20 Tf
60 540 Td
(Secure exceptional tenants) Tj
0 -24 Td
/F1 13 Tf
(- 360-degree referencing, affordability analytics, and right-to-rent checks.) Tj
0 -18 Td
(- Negotiation strategists maximise rent while protecting occupancy.) Tj
0 -18 Td
(- Digital contracting with e-sign, compliance packs, and deposit registration.) Tj
0 -32 Td
/F2 20 Tf
60 410 Td
(Protect your investment) Tj
0 -24 Td
/F1 13 Tf
(- Planned maintenance schedule with pre-qualified contractors.) Tj
0 -18 Td
(- Quarterly asset performance reviews benchmarking rent, arrears, and yields.) Tj
0 -18 Td
(- 24/7 tenant concierge and emergency response.) Tj
ET
0.88 0.32 0.20 rg
60 270 475 2 re
f
0 0 0 rg
BT
/F2 20 Tf
60 240 Td
(Value-add services) Tj
0 -24 Td
/F1 13 Tf
(Interior styling | Licensing & compliance management | Portfolio growth advisory | Landlord academy) Tj
ET
"""

    services_stream = builder.add_object(make_stream(services_content))
    page_streams.append(services_stream)
    services_page = builder.reserve_object()
    page_objects.append(services_page)

    # Page 4 - Testimonials and CTA
    testimonials_content = """1 1 1 rg
0 0 595 842 re
f
0.12 0.22 0.45 rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 32 Tf
60 780 Td
(Proof in every tenancy) Tj
ET
0.06 0.12 0.24 rg
60 700 475 2 re
f
0 0 0 rg
BT
/F2 20 Tf
60 670 Td
(Landlords say it best) Tj
0 -26 Td
/F1 13 Tf
("Aktonz secured a corporate tenant at 12% above our previous rent within two weeks." - Priya, portfolio landlord) Tj
0 -22 Td
("Their reporting dashboard gives total clarity; arrears have disappeared." - Mark, overseas investor) Tj
0 -22 Td
("From styling to move-in, every detail is proactive and polished." - Eleanor, first-time landlord) Tj
0 -34 Td
/F2 20 Tf
60 520 Td
(What you receive) Tj
0 -24 Td
/F1 13 Tf
(- Dedicated property partner and escalation lead.) Tj
0 -18 Td
(- Always-on communication via landlord portal and WhatsApp.) Tj
0 -18 Td
(- Compliance roadmap, renewal strategy, and portfolio insights.) Tj
0 -34 Td
/F2 20 Tf
60 380 Td
(Ready to elevate your lettings experience?) Tj
0 -24 Td
/F1 13 Tf
(Book a discovery consultation to unlock bespoke pricing, marketing previews, and tenant demand analytics.) Tj
0 -20 Td
(Email lettings@aktonz.com | Call +44 (0)20 1234 5678 | aktonz.com/lettings) Tj
ET
0.84 0.55 0.16 rg
60 320 475 2 re
f
0.88 0.32 0.20 rg
60 160 475 120 re
f
1 1 1 rg
BT
/F2 24 Tf
75 250 Td
(Get started today) Tj
0 -26 Td
/F1 13 Tf
(Schedule a strategy session and receive a complimentary rental performance audit tailored to your property.) Tj
0 -18 Td
(We will deliver a clear action plan within 48 hours.) Tj
ET
"""

    testimonials_stream = builder.add_object(make_stream(testimonials_content))
    page_streams.append(testimonials_stream)
    testimonials_page = builder.reserve_object()
    page_objects.append(testimonials_page)

    # Define page objects referencing pages tree
    for page_obj, content_obj in zip(page_objects, page_streams):
        builder.set_object(
            page_obj,
            f"<< /Type /Page /Parent {pages_obj} 0 R /MediaBox {media_box} /Resources {font_resources} /Contents {content_obj} 0 R >>\n".encode(
                "ascii"
            ),
        )

    kids = "[" + " ".join(f"{obj} 0 R" for obj in page_objects) + "]"
    builder.set_object(
        pages_obj,
        f"<< /Type /Pages /Kids {kids} /Count {len(page_objects)} /MediaBox {media_box} >>\n".encode("ascii"),
    )

    catalog_obj = builder.add_object(
        f"<< /Type /Catalog /Pages {pages_obj} 0 R >>\n".encode("ascii")
    )
    builder.set_root(catalog_obj)

    pdf_bytes = builder.build()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(pdf_bytes)


if __name__ == "__main__":
    output_file = Path("docs/aktonz-lettings-brochure.pdf")
    build_brochure(output_file)
    print(f"Created {output_file}")
