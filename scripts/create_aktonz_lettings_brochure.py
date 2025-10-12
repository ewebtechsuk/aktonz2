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

    deep_blue = "0 0.294 0.553"
    dusk_blue = "0.133 0.278 0.459"
    soft_blue = "0.894 0.937 0.976"
    gold = "0.812 0.682 0.396"
    page_contents: List[str] = []

    # Page 1 - Cover with logo and hero statement
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{deep_blue} rg
0 420 595 422 re
f
{soft_blue} rg
0 0 595 420 re
f
q
0 0 0 rg
{gold} RG
4 w
207 630 181 72 re
B
Q
1 1 1 rg
BT
/F2 38 Tf
235 670 Td
(Akt) Tj
ET
{gold} rg
BT
/F2 38 Tf
323 670 Td
(o) Tj
ET
1 1 1 rg
BT
/F2 38 Tf
347 670 Td
(nz) Tj
ET
{gold} rg
0 610 595 4 re
f
1 1 1 rg
BT
/F2 30 Tf
80 560 Td
(Premium Lettings \& Management) Tj
0 -32 Td
/F1 20 Tf
(Modern Service, Local Expertise) Tj
0 -36 Td
/F1 13 Tf
(Move smarter with Aktonz local property experts guiding every tenancy with precision.) Tj
ET
{deep_blue} rg
0 502 595 2 re
f
0 0 0 rg
BT
/F1 13 Tf
80 470 Td
(High-impact marketing, proactive compliance guardianship, and data-backed asset care.) Tj
0 -18 Td
(A modern lettings partner for London landlords ready to elevate performance.) Tj
ET
{gold} rg
80 400 120 8 re
f
0 0 0 rg
BT
/F1 12 Tf
80 360 Td
(2023 delivery: 99% landlord retention, 14-day average time-to-let, 8.7% rental uplift vs. market.) Tj
ET
"""
    )

    # Page 2 - Company introduction and why choose us
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{soft_blue} rg
0 760 595 82 re
f
{deep_blue} rg
0 740 595 4 re
f
0 0 0 rg
BT
/F2 32 Tf
70 780 Td
(Aktonz Lettings \u2013 London rooted, tech forward) Tj
0 -32 Td
/F1 13 Tf
(Aktonz is a London-based online estate and letting agency delivering residential lettings and management citywide.) Tj
0 -18 Td
(We blend concierge-style service with a property-tech backbone so landlords stay informed in real time.) Tj
0 -28 Td
/F2 20 Tf
(Why landlords choose us) Tj
0 -24 Td
/F1 12 Tf
(- Local London experts embedded across Canary Wharf, Shoreditch, Hackney and beyond.) Tj
0 -18 Td
(- Insight-rich advice built on neighbourhood data and on-the-ground negotiations.) Tj
0 -18 Td
(- Modern marketing assets, lifestyle videography, and relocation networks for premium exposure.) Tj
0 -18 Td
(- Transparent fixed fees with no VAT for immediate savings of up to 20% versus traditional agents.) Tj
0 -28 Td
/F2 20 Tf
(Credibility that converts) Tj
0 -24 Td
/F1 12 Tf
(72% of consumers trust businesses with clear value proof and testimonials \u2013 we lead with both to win instruction.) Tj
ET
{gold} rg
70 520 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 490 Td
(Mission: maximise rental income while protecting your asset and time through proactive management.) Tj
0 -18 Td
(Scope: from single apartments to multi-unit portfolios, Aktonz handles compliance, marketing, and tenant care.) Tj
ET
"""
    )

    # Page 3 - Landlord services overview
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{soft_blue} rg
0 742 595 100 re
f
0 0 0 rg
BT
/F2 30 Tf
70 780 Td
(Landlord services tailored to every need) Tj
0 -34 Td
/F1 13 Tf
(Three service levels so you control involvement while Aktonz drives performance.) Tj
0 -30 Td
/F2 20 Tf
(Let Only) Tj
0 -24 Td
/F1 12 Tf
(- Strategic marketing blast across portals and targeted campaigns.) Tj
0 -18 Td
(- Accompanied viewings, right-to-rent, and professional referencing.) Tj
0 -18 Td
(- Tenancy agreement drafting plus rent and deposit onboarding.) Tj
0 -28 Td
/F2 20 Tf
(Rent Collection) Tj
0 -24 Td
/F1 12 Tf
(- Everything in Let Only plus monthly rent administration and arrears management.) Tj
0 -18 Td
(- Detailed landlord statements and payment tracking via the portal.) Tj
0 -28 Td
/F2 20 Tf
(Full Management) Tj
0 -24 Td
/F1 12 Tf
(- Comprehensive day-to-day management with zero tenant contact required.) Tj
0 -18 Td
(- Repairs coordinated with vetted contractors and transparent approvals.) Tj
0 -18 Td
(- Periodic inspections, 24/7 emergency support, and legal notice handling.) Tj
ET
{gold} rg
70 260 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 230 Td
(Each pathway includes access to our landlord success team, compliance tracking, and renewal strategy reviews.) Tj
ET
"""
    )

    # Page 4 - Services comparison table
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{deep_blue} rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 28 Tf
70 780 Td
(Service comparison) Tj
ET
{gold} rg
70 720 455 2 re
f
0 0 0 rg
BT
/F2 14 Tf
90 700 Td
(Key features) Tj
ET
0 0 0 RG
1 w
70 690 m
525 690 l
S
70 640 m
525 640 l
S
70 590 m
525 590 l
S
70 540 m
525 540 l
S
70 490 m
525 490 l
S
70 440 m
525 440 l
S
70 390 m
525 390 l
S
70 340 m
525 340 l
S
70 290 m
525 290 l
S
70 240 m
525 240 l
S
70 190 m
525 190 l
S
70 140 m
525 140 l
S
70 690 m
70 140 l
S
235 690 m
235 140 l
S
360 690 m
360 140 l
S
525 690 m
525 140 l
S
BT
/F2 13 Tf
250 660 Td
(Let Only) Tj
ET
BT
/F2 13 Tf
375 660 Td
(Rent Collection) Tj
ET
BT
/F2 13 Tf
435 660 Td
(Full Mgmt) Tj
ET
BT
/F1 11 Tf
80 620 Td
(Professional photography \& lifestyle marketing) Tj
ET
BT
/F1 11 Tf
250 620 Td
([x]) Tj
ET
BT
/F1 11 Tf
375 620 Td
([x]) Tj
ET
BT
/F1 11 Tf
440 620 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 570 Td
(Tenant vetting, referencing, and contracts) Tj
ET
BT
/F1 11 Tf
250 570 Td
([x]) Tj
ET
BT
/F1 11 Tf
375 570 Td
([x]) Tj
ET
BT
/F1 11 Tf
440 570 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 520 Td
(Rent collection \& arrears management) Tj
ET
BT
/F1 11 Tf
250 520 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 520 Td
([x]) Tj
ET
BT
/F1 11 Tf
440 520 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 470 Td
(Monthly landlord statements) Tj
ET
BT
/F1 11 Tf
250 470 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 470 Td
([x]) Tj
ET
BT
/F1 11 Tf
440 470 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 420 Td
(Maintenance coordination) Tj
ET
BT
/F1 11 Tf
250 420 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 420 Td
([ ]) Tj
ET
BT
/F1 11 Tf
440 420 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 370 Td
(24/7 emergency support) Tj
ET
BT
/F1 11 Tf
250 370 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 370 Td
([ ]) Tj
ET
BT
/F1 11 Tf
440 370 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 320 Td
(Periodic inspections \& reporting) Tj
ET
BT
/F1 11 Tf
250 320 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 320 Td
([ ]) Tj
ET
BT
/F1 11 Tf
440 320 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 270 Td
(Legal notices and tenancy renewals) Tj
ET
BT
/F1 11 Tf
250 270 Td
([ ]) Tj
ET
BT
/F1 11 Tf
375 270 Td
([ ]) Tj
ET
BT
/F1 11 Tf
440 270 Td
([x]) Tj
ET
BT
/F1 11 Tf
80 220 Td
(Fee structure) Tj
ET
BT
/F1 11 Tf
250 220 Td
(One-off %) Tj
ET
BT
/F1 11 Tf
375 220 Td
(Monthly %) Tj
ET
BT
/F1 11 Tf
440 220 Td
(Monthly %) Tj
ET
BT
/F1 11 Tf
80 170 Td
(Ideal for) Tj
ET
BT
/F1 11 Tf
250 170 Td
(Hands-on landlords) Tj
ET
BT
/F1 11 Tf
375 170 Td
(Owners wanting support with cashflow) Tj
ET
BT
/F1 11 Tf
440 170 Td
(Portfolio or time-poor landlords) Tj
ET
"""
    )

    # Page 5 - Pricing and fees transparency
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{soft_blue} rg
0 742 595 100 re
f
0 0 0 rg
BT
/F2 30 Tf
70 780 Td
(Transparent pricing \u2013 no VAT, no surprises) Tj
0 -34 Td
/F1 13 Tf
(Our fixed, VAT-free pricing keeps more income in your pocket while delivering premium service.) Tj
0 -36 Td
/F2 22 Tf
(Let Only) Tj
0 -26 Td
/F1 12 Tf
(7% of first year\u2019s rent, VAT-free. Tenant marketing, vetting, and tenancy setup completed before handover.) Tj
0 -30 Td
/F2 22 Tf
(Rent Collection) Tj
0 -26 Td
/F1 12 Tf
(6% of monthly rent collected, VAT-free. Includes Let Only plus rent processing, arrears chasing, and statements.) Tj
0 -30 Td
/F2 22 Tf
(Full Management) Tj
0 -26 Td
/F1 12 Tf
(10% of monthly rent, VAT-free. Includes Rent Collection plus maintenance coordination and full tenant liaison.) Tj
0 -34 Td
/F2 20 Tf
(Fee advantages) Tj
0 -24 Td
/F1 12 Tf
(Most agencies quote \"6% + VAT\" equating to 7.2%. Aktonz simply charges 6%, saving you 20% immediately.) Tj
0 -18 Td
(No renewal fees, no mark-ups on contractor invoices, and no hidden admin costs.) Tj
ET
{gold} rg
70 340 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 310 Td
(Optional onboarding items are clearly labelled; many are included within Full Management as standard.) Tj
ET
"""
    )

    # Page 6 - Add-on services
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{deep_blue} rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 28 Tf
70 780 Td
(Add-on solutions for total compliance) Tj
0 -34 Td
/F1 13 Tf
(Aktonz can arrange every statutory certificate and protection to keep your tenancy watertight.) Tj
0 -30 Td
/F2 20 Tf
(Energy Performance Certificates) Tj
0 -24 Td
/F1 12 Tf
(Certified assessors scheduled within 72 hours to secure an EPC that meets lettings regulations.) Tj
0 -28 Td
/F2 20 Tf
(Inventory \& check-in/out) Tj
0 -24 Td
/F1 12 Tf
(Detailed photo-led inventories, professional clerks, and check-out reconciliation to protect deposits.) Tj
0 -28 Td
/F2 20 Tf
(Rent guarantee \& legal cover) Tj
0 -24 Td
/F1 12 Tf
(Optional insurance safeguarding rent and covering eviction legal costs for up to 12 months of arrears.) Tj
0 -28 Td
/F2 20 Tf
(Safety certificates) Tj
0 -24 Td
/F1 12 Tf
(Gas safety, EICR electrical inspections, and smoke/CO compliance managed through approved engineers.) Tj
0 -28 Td
/F2 20 Tf
(Professional cleaning \& staging) Tj
0 -24 Td
/F1 12 Tf
(Pre-tenancy and move-out cleaning, plus styling upgrades to accelerate marketing response.) Tj
ET
{gold} rg
70 260 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 230 Td
(Bundle add-ons with Full Management for preferential rates and a single point of instruction.) Tj
ET
"""
    )

    # Page 7 - Testimonials
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{soft_blue} rg
0 742 595 100 re
f
0 0 0 rg
BT
/F2 28 Tf
70 780 Td
(Landlords rate Aktonz 4.9/5) Tj
0 -34 Td
/F1 12 Tf
(Real experiences from London landlords who trust us with their homes and portfolios.) Tj
0 -30 Td
/F3 14 Tf
(\"Aktonz found corporate tenants in under a week and managed everything end-to-end. I stayed overseas stress-free.\" \u2013 Sarah K., Canary Wharf) Tj
0 -40 Td
(\"Their tech portal means I see viewings, offers, and maintenance updates instantly. Transparency like this is rare.\" \u2013 John M., Shoreditch) Tj
0 -40 Td
(\"Rent is always on time and the team pre-empts renewals months ahead. Exceptional foresight.\" \u2013 Priya L., Hackney) Tj
0 -40 Td
(\"From photography to check-in, every touchpoint was polished. Tenants constantly remark on the service.\" \u2013 David R., Islington) Tj
0 -40 Td
/F2 20 Tf
(Proof sells properties) Tj
0 -24 Td
/F1 12 Tf
(72% of consumers trust positive testimonials; Aktonz builds that trust from the first conversation.) Tj
ET
{gold} rg
70 260 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 230 Td
(Ask us for references and case studies relevant to your property type for even deeper assurance.) Tj
ET
"""
    )

    # Page 8 - FAQ and helpful information
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{deep_blue} rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 28 Tf
70 780 Td
(FAQs and landlord guidance) Tj
0 -34 Td
/F1 12 Tf
(We anticipate common questions so you step into partnership with clarity and confidence.) Tj
0 -28 Td
/F2 16 Tf
(What certificates do I need before letting?) Tj
0 -20 Td
/F1 12 Tf
(Gas safety, EICR electrical reports, EPC, smoke and CO compliance. Aktonz can arrange each requirement.) Tj
0 -28 Td
/F2 16 Tf
(How are deposits handled?) Tj
0 -20 Td
/F1 12 Tf
(Deposits are registered with government-approved schemes. Full Management includes registration and dispute support.) Tj
0 -28 Td
/F2 16 Tf
(When will I receive rent?) Tj
0 -20 Td
/F1 12 Tf
(Rent Collection and Full Management clients receive transfers within two working days of tenant payment with monthly statements.) Tj
0 -28 Td
/F2 16 Tf
(Do you inspect the property during tenancy?) Tj
0 -20 Td
/F1 12 Tf
(Full Management includes inspections every six months with photo reports and action plans.) Tj
0 -28 Td
/F2 16 Tf
(How long is the agreement?) Tj
0 -20 Td
/F1 12 Tf
(Services are on a per-tenancy basis with flexible terms; fees continue only while tenants remain in situ.) Tj
0 -28 Td
/F2 16 Tf
(Where do you operate?) Tj
0 -20 Td
/F1 12 Tf
(We cover all London zones with specialist teams in East London hubs including Hackney, Canary Wharf, and Shoreditch.) Tj
ET
{gold} rg
70 200 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 170 Td
(Need more detail? Email info@aktonz.com for tailored guidance or to access our landlord knowledge base.) Tj
ET
"""
    )

    # Page 9 - London area showcase
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{soft_blue} rg
0 742 595 100 re
f
0 0 0 rg
BT
/F2 28 Tf
70 780 Td
(Showcasing London neighbourhood expertise) Tj
0 -34 Td
/F1 13 Tf
(Our specialists live and work across the capital so marketing speaks authentically to local audiences.) Tj
ET
{deep_blue} rg
70 610 150 160 re
f
{gold} rg
235 610 150 160 re
f
{dusk_blue} rg
400 610 150 160 re
f
1 1 1 rg
BT
/F2 16 Tf
90 740 Td
(Canary Wharf) Tj
0 -20 Td
/F1 11 Tf
(Financial hub with luxury riverside towers.) Tj
0 -16 Td
(Corporate tenants seek premium amenities and concierge living.) Tj
ET
BT
/F2 16 Tf
255 740 Td
(Shoreditch) Tj
0 -20 Td
/F1 11 Tf
(Creative heartland of East London.) Tj
0 -16 Td
(Converted lofts and tech professionals drive demand.) Tj
ET
BT
/F2 16 Tf
420 740 Td
(Hackney) Tj
0 -20 Td
/F1 11 Tf
(Vibrant, community-led streets with Victorian homes.) Tj
0 -16 Td
(Strong rental yields and lifestyle appeal.) Tj
ET
0 0 0 rg
BT
/F2 20 Tf
70 560 Td
(Beyond the East) Tj
0 -24 Td
/F1 12 Tf
(Aktonz also covers City fringe, Greenwich riverside, and North London enclaves, tailoring marketing to each micro-market.) Tj
0 -18 Td
(Portfolio reviews highlight area-by-area performance so you know where to expand next.) Tj
ET
"""
    )

    # Page 10 - Contact and call to action
    page_contents.append(
        f"""1 1 1 rg
0 0 595 842 re
f
{deep_blue} rg
0 742 595 100 re
f
1 1 1 rg
BT
/F2 30 Tf
70 780 Td
(Let\u2019s move your lettings forward) Tj
0 -34 Td
/F1 13 Tf
(Ready to maximise rental returns with a modern, proactive partner? We\u2019re one conversation away.) Tj
ET
q
0 0 0 rg
{gold} RG
3 w
70 640 200 60 re
B
Q
1 1 1 rg
BT
/F2 28 Tf
95 675 Td
(Aktonz) Tj
ET
{gold} rg
BT
/F2 28 Tf
195 675 Td
(o) Tj
ET
1 1 1 rg
BT
/F2 28 Tf
215 675 Td
(nz) Tj
ET
0 0 0 rg
BT
/F1 12 Tf
70 600 Td
(Office: 33 Abersham Road, Hackney, London E8 2LN) Tj
0 -18 Td
(Phone: 0203 389 8009) Tj
0 -18 Td
(Email: info@aktonz.com) Tj
0 -18 Td
(Website: www.aktonz.com) Tj
0 -24 Td
/F2 16 Tf
(Office hours) Tj
0 -20 Td
/F1 12 Tf
(Mon-Fri 9am-7pm | Sat 10am-4pm | Sun by appointment) Tj
0 -28 Td
/F2 16 Tf
(Call to action) Tj
0 -20 Td
/F1 12 Tf
(Book a consultation for a complimentary rental valuation and marketing blueprint within 48 hours.) Tj
0 -18 Td
(Visit aktonz.com/landlords or scan the QR in our email to schedule instantly.) Tj
ET
{gold} rg
70 340 455 2 re
f
0 0 0 rg
BT
/F1 12 Tf
70 310 Td
(Follow us on LinkedIn and Instagram @Aktonz for market updates, landlord tips, and portfolio inspiration.) Tj
ET
"""
    )

    page_streams: List[int] = []
    page_objects: List[int] = []

    for content in page_contents:
        stream_obj = builder.add_object(make_stream(content))
        page_streams.append(stream_obj)
        page_objects.append(builder.reserve_object())

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
