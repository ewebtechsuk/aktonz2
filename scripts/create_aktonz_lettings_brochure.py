from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional
import xml.etree.ElementTree as ET


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
        offsets: List[int] = []
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
        for offset in offsets:
            pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

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


# --- Layout helpers -------------------------------------------------------

DEEP_BLUE = "0 0.294 0.553"
DUSK_BLUE = "0.133 0.278 0.459"
SOFT_BLUE = "0.925 0.953 0.976"
PALE_BLUE = "0.878 0.933 0.972"
GOLD = "0.812 0.682 0.396"
WARM_GREY = "0.341 0.341 0.357"
BLACK = "0 0 0"
WHITE = "1 1 1"
LOGO_GOLD = "1 0.898 0"


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_block(
    x: float,
    y: float,
    lines: Iterable[str],
    *,
    font: str = "F1",
    size: float = 12,
    color: str = BLACK,
    leading: Optional[float] = None,
) -> str:
    lines_list = list(lines)
    if not lines_list:
        return ""
    if leading is None:
        leading = size + 4

    escaped = [escape_pdf_text(line) for line in lines_list]
    commands = [f"{color} rg", "BT", f"/{font} {size} Tf", f"{x:.2f} {y:.2f} Td", f"({escaped[0]}) Tj"]
    for line in escaped[1:]:
        commands.append(f"0 {-leading:.2f} Td")
        commands.append(f"({line}) Tj")
    commands.append("ET")
    return "\n".join(commands)


def bullet_lines(items: Iterable[str]) -> List[str]:
    return [f"- {item}" for item in items]


def page_background() -> str:
    return f"{WHITE} rg\n0 0 595 842 re\nf"


def header(title: str, subtitle: Optional[str] = None, *, include_logo: bool = True) -> str:
    commands: List[str] = [
        f"{DEEP_BLUE} rg",
        "0 722 595 120 re",
        "f",
        f"{GOLD} rg",
        "0 722 595 6 re",
        "f",
        text_block(70, 806, [title], font="F2", size=28, color=WHITE, leading=30),
    ]
    if subtitle:
        commands.append(text_block(70, 780, [subtitle], font="F1", size=13, color=WHITE, leading=16))
    if include_logo:
        commands.append(draw_logo(430, 740, 130))
    return "\n".join(commands)


def footer(page_number: int) -> str:
    commands = [
        f"{PALE_BLUE} rg",
        "0 70 595 2 re",
        "f",
        text_block(
            70,
            48,
            ["Aktonz Lettings | Premium Lettings & Management"],
            font="F1",
            size=10,
            color=WARM_GREY,
            leading=12,
        ),
        text_block(520, 48, [f"{page_number:02d}"], font="F2", size=10, color=GOLD, leading=12),
    ]
    return "\n".join(commands)


# --- Logo rendering -------------------------------------------------------

LOGO_BASE_WIDTH = 400.0
LOGO_BASE_HEIGHT = 160.0


def _load_logo_rectangles() -> List[tuple[float, float, float, float]]:
    svg_path = Path(__file__).resolve().parent.parent / "public" / "aktonz-logo-modern.svg"
    tree = ET.parse(svg_path)
    ns = {"svg": "http://www.w3.org/2000/svg"}
    rectangles: List[tuple[float, float, float, float]] = []
    for rect in tree.findall(".//svg:rect", ns):
        fill = rect.get("fill")
        if fill is None or fill.lower() != "#ffe500":
            continue
        x_attr = rect.get("x")
        y_attr = rect.get("y")
        width_attr = rect.get("width")
        height_attr = rect.get("height")
        if not all((x_attr, y_attr, width_attr, height_attr)):
            continue
        if "%" in width_attr or "%" in height_attr:
            continue
        rectangles.append((float(x_attr), float(y_attr), float(width_attr), float(height_attr)))
    return rectangles


LOGO_RECTANGLES = _load_logo_rectangles()


def draw_logo(x: float, y: float, width: float) -> str:
    scale = width / LOGO_BASE_WIDTH
    height = LOGO_BASE_HEIGHT * scale
    commands = [
        f"{DEEP_BLUE} rg",
        f"{x:.2f} {y:.2f} {width:.2f} {height:.2f} re",
        "f",
        f"{DUSK_BLUE} rg",
        f"{x:.2f} {y + 0.7 * height:.2f} {width:.2f} {0.3 * height:.2f} re",
        "f",
        f"{GOLD} rg",
        f"{x:.2f} {y + 0.08 * height:.2f} {width:.2f} {0.02 * height:.2f} re",
        "f",
    ]
    for rect_x, rect_y, rect_w, rect_h in LOGO_RECTANGLES:
        draw_x = x + rect_x * scale
        draw_y = y + (LOGO_BASE_HEIGHT - rect_y - rect_h) * scale
        commands.append(f"{LOGO_GOLD} rg")
        commands.append(f"{draw_x:.2f} {draw_y:.2f} {rect_w * scale:.2f} {rect_h * scale:.2f} re")
        commands.append("f")
    return "\n".join(commands)


# --- Brochure content -----------------------------------------------------


def build_brochure(output_path: Path) -> None:
    builder = PDFBuilder()

    regular_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    bold_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n")
    italic_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\n")

    font_resources = (
        f"<< /Font << /F1 {regular_font_obj} 0 R /F2 {bold_font_obj} 0 R /F3 {italic_font_obj} 0 R >> >>"
    )

    media_box = "[0 0 595 842]"
    pages_obj = builder.reserve_object()

    page_contents: List[str] = []

    # Page 1 - Cover
    cover_commands: List[str] = [
        f"{DEEP_BLUE} rg",
        "0 0 595 842 re",
        "f",
        f"{SOFT_BLUE} rg",
        "0 0 595 260 re",
        "f",
        f"{GOLD} rg",
        "0 260 595 10 re",
        "f",
        draw_logo(187.5, 590, 220),
        text_block(
            120,
            520,
            [
                "Premium Lettings & Management",
                "Modern service. Local expertise. Trusted results.",
            ],
            font="F2",
            size=26,
            color=WHITE,
            leading=30,
        ),
        text_block(
            120,
            454,
            [
                "Move smarter with Aktonz as your London lettings partner.",
                "Data-led marketing, curated tenant journeys, and proactive asset care for confident landlords.",
            ],
            font="F1",
            size=14,
            color=WHITE,
            leading=20,
        ),
        f"{WHITE} rg",
        "70 90 455 140 re",
        "f",
        f"{GOLD} rg",
        "70 220 455 4 re",
        "f",
        text_block(
            90,
            210,
            [
                "Aktonz delivers concierge-level lettings with a technology core",
                "so every landlord enjoys real-time clarity and strategic advice.",
                "From Canary Wharf penthouses to Hackney townhouses, our team",
                "brings local intelligence, rigorous compliance and polished",
                "marketing that commands premium tenancies in record time.",
                "",
                "99% landlord retention | 14-day average time-to-let | 8.7% rental uplift vs. local averages",
            ],
            font="F1",
            size=12,
            color=DEEP_BLUE,
            leading=16,
        ),
    ]
    page_contents.append("\n".join(cover_commands))

    # Page 2 - Company introduction
    page2_commands: List[str] = [
        page_background(),
        header("Aktonz Lettings", "Modern letting agents with London roots"),
        f"{SOFT_BLUE} rg",
        "70 500 455 160 re",
        "f",
        text_block(
            70,
            660,
            [
                "Aktonz is a London-based lettings and property management agency built",
                "to give landlords total confidence. Our neighbourhood experts combine",
                "hyper-local insight with a digital portal that keeps instructions transparent",
                "and responsive every step of the tenancy lifecycle.",
                "",
                "We operate across the capital with teams dedicated to East London hubs",
                "including Hackney, Shoreditch and Canary Wharf while supporting",
                "landlords with single homes or multi-unit portfolios citywide.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            90,
            630,
            [
                "Why landlords choose Aktonz",
            ],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=20,
        ),
        text_block(
            90,
            600,
            bullet_lines(
                [
                    "Local London experts advising on pricing, positioning and legislation per neighbourhood.",
                    "Modern marketing with cinematic photography, video walk-throughs and relocation networks for reach.",
                    "24/7 portal providing viewing feedback, offers, payments and compliance tracking in real time.",
                    "Transparent fixed fees with no VAT, saving around 20% compared with traditional agency models.",
                ]
            ),
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        f"{GOLD} rg",
        "340 320 185 130 re",
        "f",
        text_block(
            355,
            430,
            [
                "Trust that converts",
                "72% of consumers trust",
                "businesses with clear value",
                "proof and testimonials. Aktonz",
                "leads with measurable results",
                "to secure instructions swiftly.",
            ],
            font="F2",
            size=12,
            color=WHITE,
            leading=16,
        ),
        text_block(
            70,
            440,
            [
                "Mission",
            ],
            font="F2",
            size=14,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            70,
            412,
            [
                "Maximise rental income while protecting your asset and time through proactive management.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            70,
            376,
            [
                "Scope",
            ],
            font="F2",
            size=14,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            70,
            348,
            [
                "From single-apartment landlords to portfolio investors, Aktonz handles marketing, compliance",
                "and tenant care with measured communication at every milestone.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        footer(2),
    ]
    page_contents.append("\n".join(page2_commands))

    # Page 3 - Landlord services overview
    services_commands: List[str] = [
        page_background(),
        header("Service pathways", "Flexible coverage that matches your involvement"),
        f"{PALE_BLUE} rg",
        "70 510 150 200 re",
        "f",
        f"{PALE_BLUE} rg",
        "222 510 150 200 re",
        "f",
        f"{PALE_BLUE} rg",
        "374 510 150 200 re",
        "f",
        f"{GOLD} rg",
        "70 670 150 6 re",
        "f",
        f"{GOLD} rg",
        "222 670 150 6 re",
        "f",
        f"{GOLD} rg",
        "374 670 150 6 re",
        "f",
        text_block(
            78,
            650,
            ["Let Only"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            78,
            620,
            bullet_lines(
                [
                    "Strategic marketing blast across major portals and social campaigns.",
                    "Accompanied viewings with expert negotiators.",
                    "Tenant referencing, right-to-rent checks and contract preparation.",
                    "Handover once rent and deposit clear, ready for self-management.",
                ]
            ),
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            230,
            650,
            ["Rent Collection"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            230,
            620,
            bullet_lines(
                [
                    "All Let Only services plus monthly rent administration.",
                    "Tenant payment monitoring with proactive arrears chasing.",
                    "Monthly statements delivered through the Aktonz landlord portal.",
                    "Cashflow oversight without the day-to-day chasing.",
                ]
            ),
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            382,
            650,
            ["Full Management"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            382,
            620,
            bullet_lines(
                [
                    "Complete tenant liaison with no direct landlord contact required.",
                    "Maintenance coordination via vetted contractors and approval workflows.",
                    "Periodic inspections, detailed reports and renewal strategy planning.",
                    "24/7 emergency support line and legal notice handling.",
                ]
            ),
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            70,
            470,
            [
                "Every service level includes access to our landlord success team, compliance tracking,",
                "and marketing refreshes at renewal to keep properties achieving optimal yields.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        footer(3),
    ]
    page_contents.append("\n".join(services_commands))

    # Page 4 - Comparison table
    comparison_commands: List[str] = [
        page_background(),
        header("Service comparison", "At-a-glance features across each pathway"),
        f"{PALE_BLUE} rg",
        "70 200 455 340 re",
        "f",
        f"{DEEP_BLUE} rg",
        "70 520 455 40 re",
        "f",
        text_block(
            90,
            540,
            ["Feature"],
            font="F2",
            size=12,
            color=WHITE,
            leading=16,
        ),
        text_block(
            260,
            540,
            ["Let Only"],
            font="F2",
            size=12,
            color=WHITE,
            leading=16,
        ),
        text_block(
            365,
            540,
            ["Rent Collection"],
            font="F2",
            size=12,
            color=WHITE,
            leading=16,
        ),
        text_block(
            470,
            540,
            ["Full Mgmt"],
            font="F2",
            size=12,
            color=WHITE,
            leading=16,
        ),
    ]

    rows = [
        ("Professional photography & marketing", "Included", "Included", "Included"),
        ("Accompanied viewings & tenant vetting", "Included", "Included", "Included"),
        ("Contract drafting & onboarding", "Included", "Included", "Included"),
        ("Rent collection & arrears support", "-", "Included", "Included"),
        ("Monthly landlord statements", "-", "Included", "Included"),
        ("Maintenance coordination", "-", "-", "Included"),
        ("24/7 tenant support line", "-", "-", "Included"),
        ("Periodic inspections & reporting", "-", "-", "Included"),
        ("Legal notices & renewals", "-", "-", "Included"),
        ("Ideal for", "Hands-on landlords", "Owners wanting cashflow support", "Portfolio & time-poor landlords"),
    ]

    start_y = 500.0
    row_height = 32.0
    for index, (feature, let_only, rent_collection, full_mgmt) in enumerate(rows):
        row_y = start_y - index * row_height
        if index % 2 == 0:
            comparison_commands.append(f"{SOFT_BLUE} rg")
            comparison_commands.append(f"70 {row_y - row_height + 2:.2f} 455 {row_height - 2:.2f} re")
            comparison_commands.append("f")
        comparison_commands.append(
            text_block(80, row_y, [feature], font="F1", size=11, color=BLACK, leading=16)
        )
        comparison_commands.append(
            text_block(260, row_y, [let_only], font="F1", size=11, color=BLACK, leading=16)
        )
        comparison_commands.append(
            text_block(365, row_y, [rent_collection], font="F1", size=11, color=BLACK, leading=16)
        )
        comparison_commands.append(
            text_block(470, row_y, [full_mgmt], font="F1", size=11, color=BLACK, leading=16)
        )

    comparison_commands.extend(
        [
            text_block(
                70,
                180,
                [
                    "Let Only is a one-off fee. Rent Collection and Full Management operate on monthly percentages",
                    "with no VAT and no renewal surprises. Upgrade pathways at any time as your needs evolve.",
                ],
                font="F1",
                size=11,
                color=BLACK,
                leading=16,
            ),
            footer(4),
        ]
    )
    page_contents.append("\n".join(comparison_commands))

    # Page 5 - Pricing & fees
    pricing_commands: List[str] = [
        page_background(),
        header("Transparent pricing", "Clear fees aligned with your objectives"),
        text_block(
            70,
            670,
            [
                "No VAT on Aktonz fees keeps more rental income in your pocket. Our pricing is simple,",
                "with inclusive onboarding and no renewal or hidden administration charges.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
    ]

    pricing_boxes = [
        ("Let Only", "7% of first year's rent", [
            "Tenant marketing blitz across portals and networks.",
            "Accompanied viewings and expert negotiation.",
            "Referencing, contracts and move-in onboarding included.",
        ]),
        ("Rent Collection", "6% of monthly rent", [
            "Everything in Let Only plus rent processing.",
            "Late payment monitoring and arrears support.",
            "Monthly statements and payout reconciliation.",
        ]),
        ("Full Management", "10% of monthly rent", [
            "Comprehensive tenant liaison and maintenance oversight.",
            "Planned inspections with photographic reports.",
            "24/7 emergency line and legal compliance support.",
        ]),
    ]

    box_x = [70.0, 218.0, 366.0]
    for (title, price, bullets), x in zip(pricing_boxes, box_x):
        pricing_commands.extend(
            [
                f"{PALE_BLUE} rg",
                f"{x:.2f} 430 {148:.2f} 200 re",
                "f",
                f"{GOLD} rg",
                f"{x:.2f} 610 {148:.2f} 6 re",
                "f",
                text_block(x + 10, 596, [title], font="F2", size=16, color=DEEP_BLUE, leading=18),
                text_block(x + 10, 566, [price, "VAT-free"], font="F1", size=12, color=BLACK, leading=16),
                text_block(x + 10, 520, bullet_lines(bullets), font="F1", size=11, color=BLACK, leading=16),
            ]
        )

    pricing_commands.extend(
        [
            text_block(
                70,
                380,
                [
                    "Fee advantages",
                ],
                font="F2",
                size=14,
                color=DEEP_BLUE,
                leading=18,
            ),
            text_block(
                70,
                352,
                [
                    "Traditional 6% + VAT structures equate to 7.2%. Aktonz charges a straight 6%, saving landlords around 20%.",
                    "We never mark-up contractor invoices and provide renewal strategy reviews without additional charges.",
                ],
                font="F1",
                size=11,
                color=BLACK,
                leading=16,
            ),
            footer(5),
        ]
    )
    page_contents.append("\n".join(pricing_commands))

    # Page 6 - Add-on services
    addons_commands: List[str] = [
        page_background(),
        header("Add-on services", "Optional extras that keep tenancies compliant"),
        f"{PALE_BLUE} rg",
        "70 450 455 210 re",
        "f",
        text_block(
            70,
            680,
            [
                "Aktonz provides a single point of instruction for statutory certificates and enhanced protection,",
                "so your property is always ready for move-in and future-proofed against regulation changes.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            90,
            630,
            bullet_lines(
                [
                    "Energy Performance Certificates arranged within 72 hours via accredited assessors.",
                    "Gas safety inspections, electrical reports (EICR) and smoke/CO compliance scheduling.",
                    "Professional inventory, check-in and check-out reports with photographic evidence.",
                    "Rent guarantee insurance covering arrears for up to 12 months plus legal eviction support.",
                    "Pre-tenancy and post-tenancy professional cleaning, staging and furnishing coordination.",
                ]
            ),
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            70,
            420,
            [
                "Bundle add-ons with Full Management for preferential rates and consolidated reporting across certificates",
                "and renewals. Our compliance dashboard tracks renewal dates and proactively books services on your behalf.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        footer(6),
    ]
    page_contents.append("\n".join(addons_commands))

    # Page 7 - Testimonials
    testimonials_commands: List[str] = [
        page_background(),
        header("Landlords rate Aktonz 4.9/5", "Social proof from across London"),
        f"{PALE_BLUE} rg",
        "70 460 455 200 re",
        "f",
        text_block(
            90,
            640,
            [
                "\"Aktonz found corporate tenants within a week and handled every detail",
                "while I was overseas. Communication was immediate and outcomes were",
                "excellent.\" – Sarah K., Canary Wharf landlord",
            ],
            font="F3",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            90,
            580,
            [
                "\"Their digital portal means I see viewings, offers and maintenance",
                "updates instantly. Transparency like this is rare and hugely reassuring.\"",
                "– John M., Shoreditch landlord",
            ],
            font="F3",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            90,
            520,
            [
                "\"Rent is always on time and the team pre-empts renewals months ahead.",
                "The foresight keeps my yields on track year after year.\" – Priya L., Hackney landlord",
            ],
            font="F3",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            90,
            460,
            [
                "\"From photography to check-in, every touchpoint was polished. Tenants",
                "comment on the service which protects my asset's reputation.\" – David R., Islington landlord",
            ],
            font="F3",
            size=12,
            color=BLACK,
            leading=18,
        ),
        text_block(
            70,
            380,
            [
                "72% of consumers trust businesses with strong testimonials. Ask for references",
                "and case studies aligned to your property profile to see how Aktonz elevates",
                "performance in comparable homes.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        footer(7),
    ]
    page_contents.append("\n".join(testimonials_commands))

    # Page 8 - FAQ
    faq_commands: List[str] = [
        page_background(),
        header("FAQs & guidance", "Answering common landlord questions"),
        text_block(
            70,
            680,
            [
                "We anticipate the questions landlords regularly ask so you can move forward",
                "with confidence. For anything bespoke, our specialists are on hand to provide",
                "clarity and next steps.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
    ]

    faqs = [
        (
            "What certificates do I need before letting?",
            "Gas safety, EICR electrical reports, Energy Performance Certificates and smoke/CO compliance. Aktonz arranges each",
        ),
        (
            "How are deposits handled?",
            "Deposits are registered with government-approved schemes. Full Management includes registration and dispute support",
        ),
        (
            "When will I receive rent?",
            "Rent Collection and Full Management clients receive transfers within two working days of tenant payment with monthly statements",
        ),
        (
            "Do you inspect the property during tenancy?",
            "Full Management includes inspections every six months with photographic reports and action plans",
        ),
        (
            "How long is the agreement?",
            "Services run per tenancy with flexible notice periods. Fees apply only while tenants remain in situ",
        ),
        (
            "Where do you operate?",
            "Aktonz covers all London zones with specialist teams across East London, the City fringe and North London",
        ),
    ]

    start_y = 620.0
    spacing = 60.0
    for index, (question, answer) in enumerate(faqs):
        y = start_y - index * spacing
        faq_commands.append(text_block(70, y, [question], font="F2", size=13, color=DEEP_BLUE, leading=16))
        faq_commands.append(text_block(70, y - 20, [answer + "."], font="F1", size=11, color=BLACK, leading=16))

    faq_commands.extend(
        [
            text_block(
                70,
                260,
                [
                    "Need more detail? Email info@aktonz.com for tailored guidance or to access the Aktonz landlord knowledge base.",
                ],
                font="F1",
                size=11,
                color=BLACK,
                leading=16,
            ),
            footer(8),
        ]
    )
    page_contents.append("\n".join(faq_commands))

    # Page 9 - London area showcase
    area_commands: List[str] = [
        page_background(),
        header("London area showcase", "On-the-ground expertise across prime districts"),
        f"{PALE_BLUE} rg",
        "70 540 140 160 re",
        "f",
        f"{GOLD} rg",
        "70 540 140 10 re",
        "f",
        f"{PALE_BLUE} rg",
        "232 540 140 160 re",
        "f",
        f"{GOLD} rg",
        "232 540 140 10 re",
        "f",
        f"{PALE_BLUE} rg",
        "394 540 140 160 re",
        "f",
        f"{GOLD} rg",
        "394 540 140 10 re",
        "f",
        text_block(
            80,
            670,
            ["Canary Wharf"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            80,
            640,
            [
                "Financial hub with riverside towers and concierge amenities.",
                "Corporate tenants seek premium finishes and flexible move-in dates.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            242,
            670,
            ["Shoreditch"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            242,
            640,
            [
                "Creative heartland with warehouse conversions and boutique new-builds.",
                "Ideal for tech professionals valuing lifestyle-led marketing.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            404,
            670,
            ["Hackney"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=18,
        ),
        text_block(
            404,
            640,
            [
                "Victorian streets and new developments with vibrant culture.",
                "Strong rental yields supported by community-driven amenities.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        text_block(
            70,
            520,
            [
                "Beyond the East, Aktonz covers the City fringe, Greenwich Riverside and North London villages.",
                "Marketing narratives are tailored to each micro-market to attract the ideal tenant profile quickly.",
            ],
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        ),
        footer(9),
    ]
    page_contents.append("\n".join(area_commands))

    # Page 10 - Contact
    contact_commands: List[str] = [
        page_background(),
        header("Let's move your lettings forward", "Book a consultation within 48 hours", include_logo=False),
        draw_logo(390, 730, 130),
        text_block(
            70,
            660,
            [
                "Ready to maximise rental returns with a proactive, tech-enabled partner?",
                "Speak with Aktonz to receive a bespoke marketing and compliance blueprint for your property.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
        f"{PALE_BLUE} rg",
        "70 460 455 160 re",
        "f",
        text_block(
            90,
            590,
            [
                "Office",
                "33 Abersham Road, Hackney, London E8 2LN",
                "",
                "Phone",
                "0203 389 8009",
                "",
                "Email",
                "info@aktonz.com",
                "",
                "Website",
                "www.aktonz.com",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=16,
        ),
        text_block(
            300,
            590,
            [
                "Office hours",
                "Mon-Fri 9am-7pm",
                "Sat 10am-4pm",
                "Sun by appointment",
                "",
                "Follow Aktonz",
                "LinkedIn & Instagram @Aktonz",
                "",
                "Call to action",
                "Book a consultation for a complimentary rental valuation",
                "and tailored marketing roadmap delivered within 48 hours.",
            ],
            font="F1",
            size=12,
            color=BLACK,
            leading=16,
        ),
        text_block(
            70,
            420,
            [
                "Visit aktonz.com/landlords to schedule instantly or speak to our team for portfolio planning support.",
            ],
            font="F2",
            size=12,
            color=DEEP_BLUE,
            leading=16,
        ),
        footer(10),
    ]
    page_contents.append("\n".join(contact_commands))

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
