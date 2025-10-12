from __future__ import annotations

import base64
import struct
import sys
import textwrap
import zlib
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.aktonz_logo_modern_transparent import LOGO_PNG_BASE64


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


def make_binary_stream(dict_entries: str, data: bytes) -> bytes:
    prefix = f"<< {dict_entries} /Length {len(data)} >>\nstream\n".encode("ascii")
    return prefix + data + b"\nendstream\n"


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


def tidy_text(text: str) -> str:
    """Normalise whitespace within marketing copy for cleaner wrapping."""

    return " ".join(text.strip().split())


def tidy_paragraphs(paragraphs: Sequence[str]) -> List[str]:
    """Prepare paragraphs while preserving intentional blank lines."""

    cleaned: List[str] = []
    for paragraph in paragraphs:
        if paragraph.strip():
            cleaned.append(tidy_text(paragraph))
        else:
            cleaned.append("")
    return cleaned


def tidy_items(items: Sequence[str]) -> List[str]:
    """Clean bullet point content without removing deliberately empty rows."""

    cleaned: List[str] = []
    for item in items:
        if item.strip():
            cleaned.append(tidy_text(item))
        else:
            cleaned.append("")
    return cleaned


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


CHAR_WIDTH_ESTIMATE = {"F1": 0.5, "F2": 0.52, "F3": 0.5}


def filled_rect(x: float, y: float, width: float, height: float, color: str) -> str:
    return "\n".join(
        [
            f"{color} rg",
            f"{x:.2f} {y:.2f} {width:.2f} {height:.2f} re",
            "f",
        ]
    )


def _resolved_leading(size: float, leading: Optional[float]) -> float:
    return leading if leading is not None else size + 4


def _estimate_text_height(line_count: int, size: float, leading: float) -> float:
    if line_count <= 0:
        return 0.0
    # Allow breathing room above characters by slightly expanding the first line height.
    return size * 1.2 + (line_count - 1) * leading


def text_panel_background(
    x: float,
    baseline_y: float,
    width: float,
    lines: Sequence[str],
    *,
    size: float,
    leading: Optional[float] = None,
    padding_top: float = 14.0,
    padding_bottom: float = 18.0,
    fill_color: str = SOFT_BLUE,
) -> str:
    resolved_leading = _resolved_leading(size, leading)
    text_height = _estimate_text_height(len(lines), size, resolved_leading)
    if text_height == 0:
        return ""
    bottom = baseline_y - text_height - padding_bottom
    height = text_height + padding_top + padding_bottom
    return filled_rect(x, bottom, width, height, fill_color)


def contact_card(
    x: float,
    top: float,
    width: float,
    title: str,
    sections: Sequence[Tuple[str, str]],
    *,
    fill_color: str = SOFT_BLUE,
) -> Tuple[List[str], float]:
    padding_side = 16.0
    padding_top = 20.0
    padding_bottom = 20.0
    section_gap = 10.0
    commands: List[str] = []
    text_width = width - 2 * padding_side
    y = top - padding_top

    title_lines = wrapped_lines([title], width=text_width, font="F2", size=13)
    if title_lines:
        commands.append(
            text_block(
                x + padding_side,
                y,
                title_lines,
                font="F2",
                size=13,
                color=DEEP_BLUE,
                leading=16,
            )
        )
        y -= _estimate_text_height(len(title_lines), 13, 16) + section_gap

    for label, value in sections:
        label_lines = [label]
        commands.append(
            text_block(
                x + padding_side,
                y,
                label_lines,
                font="F2",
                size=11,
                color=DEEP_BLUE,
                leading=14,
            )
        )
        y -= _estimate_text_height(len(label_lines), 11, 14) + 4

        value_lines = wrapped_lines([value], width=text_width, font="F1", size=11)
        if value_lines:
            commands.append(
                text_block(
                    x + padding_side,
                    y,
                    value_lines,
                    font="F1",
                    size=11,
                    color=BLACK,
                    leading=14,
                )
            )
            y -= _estimate_text_height(len(value_lines), 11, 14)
        y -= section_gap

    if sections:
        y += section_gap

    bottom = y - padding_bottom
    height = top - bottom
    panel = filled_rect(x, bottom, width, height, fill_color)
    return [panel, *commands], bottom


def _wrap_text(
    paragraphs: Sequence[str],
    *,
    width: float,
    font: str,
    size: float,
    bullet: Optional[str] = None,
) -> List[str]:
    char_width = CHAR_WIDTH_ESTIMATE.get(font, 0.5)
    max_chars = max(int(width / (size * char_width)), 1)
    lines: List[str] = []
    wrapper = textwrap.TextWrapper(
        width=max_chars,
        break_long_words=False,
        break_on_hyphens=False,
        subsequent_indent="    " if bullet else "",
    )

    for paragraph in paragraphs:
        if paragraph == "":
            lines.append("")
            continue
        if bullet is not None:
            wrapper.initial_indent = f"{bullet} "
        else:
            wrapper.initial_indent = ""
        wrapped = wrapper.wrap(paragraph)
        if not wrapped:
            lines.append(wrapper.initial_indent.rstrip())
        else:
            lines.extend(wrapped)
    return lines


def wrapped_lines(
    paragraphs: Sequence[str],
    *,
    width: float,
    font: str = "F1",
    size: float = 12,
) -> List[str]:
    return _wrap_text(paragraphs, width=width, font=font, size=size)


def wrapped_bullets(
    items: Sequence[str],
    *,
    width: float,
    font: str = "F1",
    size: float = 12,
    bullet: str = "•",
) -> List[str]:
    return _wrap_text(items, width=width, font=font, size=size, bullet=bullet)


def wrapped_text_block(
    x: float,
    y: float,
    paragraphs: Sequence[str],
    *,
    width: float,
    font: str = "F1",
    size: float = 12,
    color: str = BLACK,
    leading: Optional[float] = None,
) -> str:
    lines = wrapped_lines(paragraphs, width=width, font=font, size=size)
    return text_block(x, y, lines, font=font, size=size, color=color, leading=leading)


def wrapped_bullet_block(
    x: float,
    y: float,
    items: Sequence[str],
    *,
    width: float,
    font: str = "F1",
    size: float = 12,
    color: str = BLACK,
    leading: Optional[float] = None,
    bullet: str = "•",
) -> str:
    lines = wrapped_bullets(items, width=width, font=font, size=size, bullet=bullet)
    return text_block(x, y, lines, font=font, size=size, color=color, leading=leading)


def measured_bullet_block(
    x: float,
    y: float,
    items: Sequence[str],
    *,
    width: float,
    font: str = "F1",
    size: float = 12,
    color: str = BLACK,
    leading: Optional[float] = None,
    bullet: str = "•",
) -> Tuple[str, float]:
    lines = wrapped_bullets(items, width=width, font=font, size=size, bullet=bullet)
    if not lines:
        return "", y
    if leading is None:
        leading = size + 4
    lowest_y = y - (len(lines) - 1) * leading if len(lines) > 1 else y
    return text_block(x, y, lines, font=font, size=size, color=color, leading=leading), lowest_y


def stacked_panel(
    x: float,
    top: float,
    width: float,
    sections: Sequence[dict],
    *,
    fill_color: str = SOFT_BLUE,
    padding_side: float = 18.0,
    padding_top: float = 20.0,
    padding_bottom: float = 24.0,
    default_gap: float = 16.0,
) -> Tuple[List[str], float]:
    """Render a vertical stack of text sections within a filled background panel."""

    y = top - padding_top
    text_commands: List[str] = []
    content_present = False

    for section in sections:
        lines = section.get("lines")
        if not lines:
            continue
        if content_present:
            y -= section.get("gap_before", default_gap)

        font = section.get("font", "F1")
        size = section.get("size", 12.0)
        color = section.get("color", BLACK)
        leading = section.get("leading")
        x_offset = section.get("x_offset", padding_side)

        text_commands.append(
            text_block(
                x + x_offset,
                y,
                lines,
                font=font,
                size=size,
                color=color,
                leading=leading,
            )
        )

        section_height = _estimate_text_height(len(lines), size, _resolved_leading(size, leading))
        y -= section_height
        content_present = True

    if not content_present:
        return [], top

    bottom = y - padding_bottom
    panel_height = top - bottom
    background = filled_rect(x, bottom, width, panel_height, fill_color)
    return [background, *text_commands], bottom


def pricing_card(
    x: float,
    top: float,
    width: float,
    title: str,
    price: str,
    bullets: Sequence[str],
    *,
    fill_color: str = PALE_BLUE,
    accent_color: str = GOLD,
) -> Tuple[List[str], float]:
    padding_side = 16.0
    padding_top = 40.0
    padding_bottom = 28.0
    accent_height = 8.0
    accent_offset = 18.0
    section_gap = 18.0

    inner_width = width - 2 * padding_side
    title_lines = wrapped_lines([title], width=inner_width, font="F2", size=16)
    price_lines = wrapped_lines([price, "VAT-free"], width=inner_width, font="F1", size=12)
    bullet_lines = wrapped_bullets(tidy_items(bullets), width=inner_width, font="F1", size=11, bullet="•")

    sections = [
        {
            "lines": title_lines,
            "font": "F2",
            "size": 16,
            "color": DEEP_BLUE,
            "leading": 18,
        },
        {
            "lines": price_lines,
            "font": "F1",
            "size": 12,
            "color": BLACK,
            "leading": 16,
            "gap_before": section_gap,
        },
        {
            "lines": bullet_lines,
            "font": "F1",
            "size": 11,
            "color": BLACK,
            "leading": 14,
            "gap_before": section_gap,
        },
    ]

    panel_commands, bottom = stacked_panel(
        x,
        top,
        width,
        sections,
        fill_color=fill_color,
        padding_side=padding_side,
        padding_top=padding_top,
        padding_bottom=padding_bottom,
        default_gap=section_gap,
    )

    if not panel_commands:
        return [], top

    accent_y = top - accent_offset
    accent = filled_rect(x, accent_y, width, accent_height, accent_color)
    background, *text_blocks = panel_commands
    return [background, accent, *text_blocks], bottom


def area_card(
    x: float,
    top: float,
    width: float,
    title: str,
    description: Sequence[str],
    *,
    fill_color: str = SOFT_BLUE,
    accent_color: str = GOLD,
) -> Tuple[List[str], float]:
    padding_side = 12.0
    padding_top = 28.0
    padding_bottom = 24.0
    section_gap = 14.0
    inner_width = width - 2 * padding_side

    title_lines = wrapped_lines([title], width=inner_width, font="F2", size=16)
    description_lines = wrapped_lines(tidy_paragraphs(description), width=inner_width, font="F1", size=11)

    sections = [
        {
            "lines": title_lines,
            "font": "F2",
            "size": 16,
            "color": DEEP_BLUE,
            "leading": 18,
        },
        {
            "lines": description_lines,
            "font": "F1",
            "size": 11,
            "color": BLACK,
            "leading": 16,
            "gap_before": section_gap,
        },
    ]

    panel_commands, bottom = stacked_panel(
        x,
        top,
        width,
        sections,
        fill_color=fill_color,
        padding_side=padding_side,
        padding_top=padding_top,
        padding_bottom=padding_bottom,
        default_gap=section_gap,
    )

    if not panel_commands:
        return [], top

    accent_height = 8.0
    accent_offset = 18.0
    accent_y = top - accent_offset
    accent = filled_rect(x, accent_y, width, accent_height, accent_color)
    background, *text_blocks = panel_commands
    return [background, accent, *text_blocks], bottom


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


def _paeth_predictor(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def _defilter_png(data: bytes, width: int, height: int, bytes_per_pixel: int) -> bytes:
    stride = width * bytes_per_pixel
    expected = (stride + 1) * height
    if len(data) != expected:
        raise ValueError("Unexpected PNG data length")

    output = bytearray(height * stride)
    prev_row = bytearray(stride)
    offset = 0
    for row in range(height):
        filter_type = data[offset]
        offset += 1
        row_data = data[offset : offset + stride]
        offset += stride
        result_row = output[row * stride : (row + 1) * stride]
        if filter_type == 0:
            result_row[:] = row_data
        elif filter_type == 1:
            for i in range(stride):
                left = result_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                result_row[i] = (row_data[i] + left) & 0xFF
        elif filter_type == 2:
            for i in range(stride):
                up = prev_row[i]
                result_row[i] = (row_data[i] + up) & 0xFF
        elif filter_type == 3:
            for i in range(stride):
                left = result_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                up = prev_row[i]
                average = (left + up) // 2
                result_row[i] = (row_data[i] + average) & 0xFF
        elif filter_type == 4:
            for i in range(stride):
                left = result_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                up = prev_row[i]
                up_left = prev_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
                paeth = _paeth_predictor(left, up, up_left)
                result_row[i] = (row_data[i] + paeth) & 0xFF
        else:
            raise ValueError(f"Unsupported PNG filter: {filter_type}")
        prev_row[:] = result_row
    return bytes(output)


def _load_logo_image() -> tuple[int, int, bytes, Optional[bytes]]:
    png_path = Path(__file__).resolve().parent.parent / "public" / "aktonz-logo-modern-transparent.png"
    if png_path.exists():
        data = png_path.read_bytes()
    else:
        data = base64.b64decode(LOGO_PNG_BASE64)
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Logo file is not a PNG")

    offset = 8
    width = height = None
    bit_depth = color_type = None
    idat_chunks: List[bytes] = []
    interlace = None

    while offset < len(data):
        if offset + 8 > len(data):
            break
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        offset += 4
        chunk_type = data[offset : offset + 4]
        offset += 4
        chunk_data = data[offset : offset + length]
        offset += length
        offset += 4  # skip CRC

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
            if compression != 0 or filter_method != 0:
                raise ValueError("Unsupported PNG compression or filter method")
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None or bit_depth is None or color_type is None:
        raise ValueError("Incomplete PNG header for logo")
    if interlace not in (0, None):
        raise ValueError("Interlaced PNG logos are not supported")
    if bit_depth != 8:
        raise ValueError("Logo PNG must use 8-bit channels")
    if color_type not in (2, 6):
        raise ValueError("Logo PNG must be RGB or RGBA")

    raw = zlib.decompress(b"".join(idat_chunks))
    bytes_per_pixel = 3 if color_type == 2 else 4
    pixel_bytes = _defilter_png(raw, width, height, bytes_per_pixel)

    rgb_rows = bytearray()
    alpha_rows: Optional[bytearray] = bytearray() if color_type == 6 else None
    for row in range(height):
        start = row * width * bytes_per_pixel
        end = start + width * bytes_per_pixel
        row_bytes = pixel_bytes[start:end]
        rgb_rows.append(0)
        if alpha_rows is not None:
            alpha_rows.append(0)
        for pixel in range(width):
            base = pixel * bytes_per_pixel
            rgb_rows.extend(row_bytes[base : base + 3])
            if alpha_rows is not None:
                alpha_rows.append(row_bytes[base + 3])
        if alpha_rows is None:
            # RGB images without alpha include all bytes already
            pass

    rgb_stream = zlib.compress(bytes(rgb_rows))
    alpha_stream = None
    if alpha_rows is not None:
        alpha_stream = zlib.compress(bytes(alpha_rows))

    return width, height, rgb_stream, alpha_stream


LOGO_WIDTH_PX, LOGO_HEIGHT_PX, LOGO_RGB_STREAM, LOGO_ALPHA_STREAM = _load_logo_image()


def draw_logo(x: float, y: float, width: float) -> str:
    scale = width / LOGO_WIDTH_PX
    height = LOGO_HEIGHT_PX * scale
    return "\n".join(
        [
            "q",
            f"{width:.2f} 0 0 {height:.2f} {x:.2f} {y:.2f} cm",
            "/Im1 Do",
            "Q",
        ]
    )


# --- Brochure content -----------------------------------------------------


def build_brochure(output_path: Path) -> None:
    builder = PDFBuilder()

    regular_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    bold_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n")
    italic_font_obj = builder.add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\n")

    logo_smask_obj: Optional[int] = None
    if LOGO_ALPHA_STREAM is not None:
        smask_dict = (
            f"/Type /XObject /Subtype /Image /Width {LOGO_WIDTH_PX} /Height {LOGO_HEIGHT_PX} "
            "/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode "
            f"/DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns {LOGO_WIDTH_PX} >>"
        )
        logo_smask_obj = builder.add_object(make_binary_stream(smask_dict, LOGO_ALPHA_STREAM))

    logo_dict = (
        f"/Type /XObject /Subtype /Image /Width {LOGO_WIDTH_PX} /Height {LOGO_HEIGHT_PX} "
        "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode "
        f"/DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns {LOGO_WIDTH_PX} >>"
    )
    if logo_smask_obj is not None:
        logo_dict += f" /SMask {logo_smask_obj} 0 R"
    logo_image_obj = builder.add_object(make_binary_stream(logo_dict, LOGO_RGB_STREAM))

    resource_dict = (
        f"<< /Font << /F1 {regular_font_obj} 0 R /F2 {bold_font_obj} 0 R /F3 {italic_font_obj} 0 R >> "
        f"/XObject << /Im1 {logo_image_obj} 0 R >> >>"
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
        wrapped_text_block(
            120,
            454,
            [
                "Move smarter with Aktonz as your London lettings partner.",
                "Data-led marketing, curated tenant journeys, and proactive asset care for confident landlords.",
            ],
            width=360,
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
        wrapped_text_block(
            90,
            210,
            [
                "Aktonz delivers concierge-level lettings with a technology core so every landlord enjoys real-time clarity and strategic advice.",
                "From Canary Wharf penthouses to Hackney townhouses, our team brings local intelligence, rigorous compliance and polished marketing that commands premium tenancies in record time.",
                "",
                "99% landlord retention | 14-day average time-to-let | 8.7% rental uplift vs. local averages",
            ],
            width=410,
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
    ]

    intro_padding = 22.0
    intro_lines = wrapped_lines(
        tidy_paragraphs(
            [
                """
                Aktonz is a London-based lettings and property management agency built to give landlords total confidence.
                Our neighbourhood experts combine hyper-local insight with a digital portal that keeps instructions
                transparent and responsive every step of the tenancy lifecycle.
                """,
                "",
                """
                We operate across the capital with teams dedicated to East London hubs including Hackney, Shoreditch and
                Canary Wharf while supporting landlords with single homes or multi-unit portfolios citywide.
                """,
            ]
        ),
        width=455 - 2 * intro_padding,
        font="F1",
        size=12,
    )
    intro_panel, intro_bottom = stacked_panel(
        70,
        780,
        455,
        [
            {
                "lines": intro_lines,
                "font": "F1",
                "size": 12,
                "color": BLACK,
                "leading": 18,
            }
        ],
        fill_color=SOFT_BLUE,
        padding_side=intro_padding,
        padding_top=28.0,
        padding_bottom=32.0,
        default_gap=20.0,
    )
    page2_commands.extend(intro_panel)

    highlights_title_y = intro_bottom - 34
    page2_commands.append(
        text_block(
            90,
            highlights_title_y,
            ["Why landlords choose Aktonz"],
            font="F2",
            size=16,
            color=DEEP_BLUE,
            leading=20,
        )
    )

    bullet_block, bullet_lowest = measured_bullet_block(
        90,
        highlights_title_y - 26,
        tidy_items(
            [
                "Local London experts advising on pricing, positioning and legislation per neighbourhood.",
                "Modern marketing with cinematic photography, video walk-throughs and relocation networks for reach.",
                "24/7 portal providing viewing feedback, offers, payments and compliance tracking in real time.",
                "Transparent fixed fees with no VAT, saving around 20% compared with traditional agency models.",
            ]
        ),
        width=330,
        font="F1",
        size=11,
        color=BLACK,
        leading=16,
    )
    if bullet_block:
        page2_commands.append(bullet_block)

    page2_commands.append(filled_rect(340, 320, 185, 130, GOLD))
    page2_commands.append(
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
        )
    )

    mission_title_y = max(360, bullet_lowest - 36)
    mission_body_y = mission_title_y - 26
    mission_width = 250
    mission_lines = wrapped_lines(
        [
            "Maximise rental income while protecting your asset and time through proactive management.",
        ],
        width=mission_width,
        font="F1",
        size=11,
    )
    if mission_lines:
        page2_commands.append(
            text_block(
                70,
                mission_title_y,
                ["Mission"],
                font="F2",
                size=14,
                color=DEEP_BLUE,
                leading=18,
            )
        )
        page2_commands.append(
            text_block(
                70,
                mission_body_y,
                mission_lines,
                font="F1",
                size=11,
                color=BLACK,
                leading=16,
            )
        )
    else:
        page2_commands.append(
            text_block(
                70,
                mission_title_y,
                ["Mission"],
                font="F2",
                size=14,
                color=DEEP_BLUE,
                leading=18,
            )
        )

    mission_lowest = mission_body_y
    if mission_lines:
        mission_lowest = mission_body_y - (len(mission_lines) - 1) * 16

    scope_title_y = mission_lowest - 34
    scope_body_y = scope_title_y - 26
    scope_lines = wrapped_lines(
        tidy_paragraphs(
            [
                """
                From single-apartment landlords to portfolio investors, Aktonz handles marketing, compliance and tenant care
                with measured communication at every milestone.
                """
            ]
        ),
        width=420,
        font="F1",
        size=11,
    )
    page2_commands.append(
        text_block(
            70,
            scope_title_y,
            ["Scope"],
            font="F2",
            size=14,
            color=DEEP_BLUE,
            leading=18,
        )
    )
    if scope_lines:
        page2_commands.append(
            text_block(
                70,
                scope_body_y,
                scope_lines,
                font="F1",
                size=11,
                color=BLACK,
                leading=16,
            )
        )

    page2_commands.append(footer(2))
    page_contents.append("\n".join(page2_commands))

    # Page 3 - Landlord services overview
    services_commands: List[str] = [
        page_background(),
        header("Service pathways", "Flexible coverage that matches your involvement"),
        f"{PALE_BLUE} rg",
        "70 460 150 250 re",
        "f",
        f"{PALE_BLUE} rg",
        "222 460 150 250 re",
        "f",
        f"{PALE_BLUE} rg",
        "374 460 150 250 re",
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
    ]

    service_columns = [
        (
            78,
            "Let Only",
            tidy_items(
                [
                    "Strategic multi-portal marketing and social promotion for launch reach.",
                    "Expert-led accompanied viewings and tenant negotiations.",
                    "Comprehensive referencing, compliance checks and contract drafting.",
                    "Smooth handover once rent and deposit clear for your self-management.",
                ]
            ),
        ),
        (
            230,
            "Rent Collection",
            tidy_items(
                [
                    "Everything in Let Only plus ongoing rent collection and reconciliation.",
                    "Live monitoring with proactive arrears management and reminders.",
                    "Monthly income statements within the Aktonz landlord portal.",
                    "Cashflow oversight without day-to-day payment chasing.",
                ]
            ),
        ),
        (
            382,
            "Full Management",
            tidy_items(
                [
                    "Rent Collection features plus coordinated repairs and contractor management.",
                    "24/7 tenant helpdesk covering emergencies and essential updates.",
                    "Routine inspections with photo-led reporting for asset peace of mind.",
                    "Aktonz handles notices, renewals and compliant check-out process.",
                ]
            ),
        ),
    ]

    bullet_lowest_y = 842.0
    for x, title, bullets in service_columns:
        services_commands.append(
            text_block(x, 650, [title], font="F2", size=16, color=DEEP_BLUE, leading=18)
        )
        command, lowest = measured_bullet_block(
            x,
            632,
            bullets,
            width=132,
            font="F1",
            size=10,
            color=BLACK,
            leading=13,
        )
        if command:
            services_commands.append(command)
            bullet_lowest_y = min(bullet_lowest_y, lowest)

    summary_y = max(bullet_lowest_y - 28, 440)
    summary_text = tidy_paragraphs(
        [
            """
            Every service level includes access to our landlord success team, compliance tracking and marketing refreshes at
            renewal to keep properties achieving optimal yields.
            """
        ]
    )
    summary_panel_width = 455.0
    summary_padding = 18.0
    summary_leading = 16.0
    summary_lines = wrapped_lines(
        summary_text,
        width=summary_panel_width - 2 * summary_padding,
        font="F1",
        size=11,
    )
    summary_background = text_panel_background(
        70,
        summary_y,
        summary_panel_width,
        summary_lines,
        size=11,
        leading=summary_leading,
        padding_top=16,
        padding_bottom=20,
    )
    if summary_background:
        services_commands.append(summary_background)
    if summary_lines:
        services_commands.append(
            text_block(
                70 + summary_padding,
                summary_y,
                summary_lines,
                font="F1",
                size=11,
                color=BLACK,
                leading=summary_leading,
            )
        )
    services_commands.append(footer(3))
    page_contents.append("\n".join(services_commands))

    # Page 4 - Comparison table
    comparison_commands: List[str] = [
        page_background(),
        header("Service comparison", "At-a-glance features across each pathway"),
        f"{PALE_BLUE} rg",
        "70 60 455 480 re",
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

    column_specs = [
        (80.0, 160.0),
        (260.0, 90.0),
        (365.0, 90.0),
        (470.0, 90.0),
    ]
    current_y = 500.0
    for index, texts in enumerate(rows):
        wrapped_by_column = [
            wrapped_lines([value], width=col_width, font="F1", size=11)
            for (_, col_width), value in zip(column_specs, texts)
        ]
        max_lines = max((len(lines) if lines else 1) for lines in wrapped_by_column)
        row_height = max(max_lines * 14 + 12, 44)
        row_top = current_y
        row_bottom = row_top - row_height
        if index % 2 == 0:
            comparison_commands.append(f"{SOFT_BLUE} rg")
            comparison_commands.append(f"70 {row_bottom + 2:.2f} 455 {row_height - 4:.2f} re")
            comparison_commands.append("f")
        for (col_x, _), lines in zip(column_specs, wrapped_by_column):
            comparison_commands.append(
                text_block(col_x, row_top - 8, lines, font="F1", size=11, color=BLACK, leading=14)
            )
        current_y = row_bottom

    summary_y = max(current_y - 8, 24)
    comparison_summary = tidy_paragraphs(
        [
            """
            Let Only is a one-off fee. Rent Collection and Full Management operate on monthly percentages with no VAT and no
            renewal surprises.
            """,
            """
            Upgrade pathways at any time as your needs evolve.
            """,
        ]
    )
    summary_panel_width = 455.0
    summary_padding = 18.0
    summary_leading = 16.0
    comparison_lines = wrapped_lines(
        comparison_summary,
        width=summary_panel_width - 2 * summary_padding,
        font="F1",
        size=11,
    )
    comparison_background = text_panel_background(
        70,
        summary_y,
        summary_panel_width,
        comparison_lines,
        size=11,
        leading=summary_leading,
        padding_top=16,
        padding_bottom=20,
    )
    if comparison_background:
        comparison_commands.append(comparison_background)
    if comparison_lines:
        comparison_commands.append(
            text_block(
                70 + summary_padding,
                summary_y,
                comparison_lines,
                font="F1",
                size=11,
                color=BLACK,
                leading=summary_leading,
            )
        )
    comparison_commands.append(footer(4))
    page_contents.append("\n".join(comparison_commands))

    # Page 5 - Pricing & fees
    pricing_commands: List[str] = [
        page_background(),
        header("Transparent pricing", "Clear fees aligned with your objectives"),
        wrapped_text_block(
            70,
            670,
            tidy_paragraphs(
                [
                    """
                    No VAT on Aktonz fees keeps more rental income in your pocket. Our pricing is simple, with inclusive
                    onboarding and no renewal or hidden administration charges.
                    """
                ]
            ),
            width=430,
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
    box_top = 630.0
    box_width = 148.0
    for (title, price, bullets), x in zip(pricing_boxes, box_x):
        card_commands, _ = pricing_card(x, box_top, box_width, title, price, bullets)
        pricing_commands.extend(card_commands)

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
            wrapped_text_block(
                70,
                352,
                tidy_paragraphs(
                    [
                        """
                        Traditional 6% + VAT structures equate to 7.2%. Aktonz charges a straight 6%, saving landlords around
                        20%.
                        """,
                        """
                        We never mark-up contractor invoices and provide renewal strategy reviews without additional charges.
                        """,
                    ]
                ),
                width=430,
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
    ]

    addons_padding = 22.0
    addons_intro_lines = wrapped_lines(
        tidy_paragraphs(
            [
                """
                Aktonz provides a single point of instruction for statutory certificates and enhanced protection, so your
                property is always ready for move-in and future-proofed against regulation changes.
                """
            ]
        ),
        width=455 - 2 * addons_padding,
        font="F1",
        size=12,
    )
    addons_bullet_lines = wrapped_bullets(
        tidy_items(
            [
                "Energy Performance Certificates arranged within 72 hours via accredited assessors.",
                "Gas safety inspections, electrical reports (EICR) and smoke/CO compliance scheduling.",
                "Professional inventory, check-in and check-out reports with photographic evidence.",
                "Rent guarantee insurance covering arrears for up to 12 months plus legal eviction support.",
                "Pre-tenancy and post-tenancy professional cleaning, staging and furnishing coordination.",
            ]
        ),
        width=455 - 2 * addons_padding,
        font="F1",
        size=11,
        bullet="•",
    )
    addons_summary_lines = wrapped_lines(
        tidy_paragraphs(
            [
                """
                Bundle add-ons with Full Management for preferential rates and consolidated reporting across certificates and
                renewals. Our compliance dashboard tracks renewal dates and proactively books services on your behalf.
                """
            ]
        ),
        width=455 - 2 * addons_padding,
        font="F1",
        size=11,
    )

    addons_panel, _ = stacked_panel(
        70,
        700,
        455,
        [
            {
                "lines": addons_intro_lines,
                "font": "F1",
                "size": 12,
                "color": BLACK,
                "leading": 18,
            },
            {
                "lines": addons_bullet_lines,
                "font": "F1",
                "size": 11,
                "color": BLACK,
                "leading": 16,
                "gap_before": 22.0,
            },
            {
                "lines": addons_summary_lines,
                "font": "F1",
                "size": 11,
                "color": BLACK,
                "leading": 16,
                "gap_before": 22.0,
            },
        ],
        fill_color=PALE_BLUE,
        padding_side=addons_padding,
        padding_top=28.0,
        padding_bottom=32.0,
        default_gap=20.0,
    )
    addons_commands.extend(addons_panel)
    addons_commands.append(footer(6))
    page_contents.append("\n".join(addons_commands))

    # Page 7 - Testimonials
    testimonials_commands: List[str] = [
        page_background(),
        header("Landlords rate Aktonz 4.9/5", "Social proof from across London"),
    ]

    testimonial_padding = 22.0
    testimonial_width = 455 - 2 * testimonial_padding
    testimonial_quotes = [
        tidy_text(
            '"Aktonz found corporate tenants within a week and handled every detail while I was overseas. Communication was immediate and outcomes were excellent." – Sarah K., Canary Wharf landlord'
        ),
        tidy_text(
            '"Their digital portal means I see viewings, offers and maintenance updates instantly. Transparency like this is rare and hugely reassuring." – John M., Shoreditch landlord'
        ),
        tidy_text(
            '"Rent is always on time and the team pre-empts renewals months ahead. The foresight keeps my yields on track year after year." – Priya L., Hackney landlord'
        ),
        tidy_text(
            '"From photography to check-in, every touchpoint was polished. Tenants comment on the service which protects my asset\'s reputation." – David R., Islington landlord'
        ),
    ]

    testimonial_sections: List[dict] = []
    for index, quote in enumerate(testimonial_quotes):
        lines = wrapped_lines([quote], width=testimonial_width, font="F3", size=12)
        section: dict = {
            "lines": lines,
            "font": "F3",
            "size": 12,
            "color": BLACK,
            "leading": 18,
        }
        if index > 0:
            section["gap_before"] = 22.0
        testimonial_sections.append(section)

    testimonial_panel, testimonial_bottom = stacked_panel(
        70,
        700,
        455,
        testimonial_sections,
        fill_color=PALE_BLUE,
        padding_side=testimonial_padding,
        padding_top=28.0,
        padding_bottom=32.0,
        default_gap=20.0,
    )
    testimonials_commands.extend(testimonial_panel)

    closing_y = testimonial_bottom - 36
    testimonials_commands.append(
        wrapped_text_block(
            70,
            closing_y,
            tidy_paragraphs(
                [
                    """
                    72% of consumers trust businesses with strong testimonials. Ask for references and case studies aligned to
                    your property profile to see how Aktonz elevates performance in comparable homes.
                    """
                ]
            ),
            width=430,
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        )
    )
    testimonials_commands.append(footer(7))
    page_contents.append("\n".join(testimonials_commands))

    # Page 8 - FAQ
    faq_commands: List[str] = [
        page_background(),
        header("FAQs & guidance", "Answering common landlord questions"),
        wrapped_text_block(
            70,
            680,
            tidy_paragraphs(
                [
                    """
                    We anticipate the questions landlords regularly ask so you can move forward with confidence. For anything
                    bespoke, our specialists are on hand to provide clarity and next steps.
                    """
                ]
            ),
            width=430,
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
    ]

    faqs = [
        (
            "What certificates do I need before letting?",
            tidy_text(
                """
                Gas safety, EICR electrical reports, Energy Performance Certificates and smoke/CO compliance. Aktonz arranges
                each requirement with accredited engineers.
                """
            ),
        ),
        (
            "How are deposits handled?",
            tidy_text(
                """
                Deposits are registered with government-approved schemes. Full Management includes registration and dispute
                support for worry-free compliance.
                """
            ),
        ),
        (
            "When will I receive rent?",
            tidy_text(
                """
                Rent Collection and Full Management clients receive transfers within two working days of tenant payment
                alongside monthly statements.
                """
            ),
        ),
        (
            "Do you inspect the property during tenancy?",
            tidy_text(
                """
                Full Management includes inspections every six months with photographic reports and agreed action plans.
                """
            ),
        ),
        (
            "How long is the agreement?",
            tidy_text(
                """
                Services run per tenancy with flexible notice periods. Fees apply only while tenants remain in situ and there
                are no renewal surprises.
                """
            ),
        ),
        (
            "Where do you operate?",
            tidy_text(
                """
                Aktonz covers all London zones with specialist teams across East London, the City fringe and North London
                neighbourhoods.
                """
            ),
        ),
    ]

    question_leading = 16.0
    answer_leading = 16.0
    current_y = 620.0
    for question, answer in faqs:
        question_lines = wrapped_lines([question], width=430, font="F2", size=13)
        if question_lines:
            faq_commands.append(
                text_block(
                    70,
                    current_y,
                    question_lines,
                    font="F2",
                    size=13,
                    color=DEEP_BLUE,
                    leading=question_leading,
                )
            )
            current_y -= _estimate_text_height(len(question_lines), 13, question_leading) + 6

        answer_lines = wrapped_lines([answer], width=430, font="F1", size=11)
        if answer_lines:
            faq_commands.append(
                text_block(
                    70,
                    current_y,
                    answer_lines,
                    font="F1",
                    size=11,
                    color=BLACK,
                    leading=answer_leading,
                )
            )
            current_y -= _estimate_text_height(len(answer_lines), 11, answer_leading) + 18

    cta_panel_width = 455.0
    cta_padding = 18.0
    cta_leading = 16.0
    faq_cta_text = tidy_paragraphs(
        [
            """
            Need more detail? Email info@aktonz.com for tailored guidance or to access the Aktonz landlord knowledge base.
            """
        ]
    )
    faq_cta_lines = wrapped_lines(
        faq_cta_text,
        width=cta_panel_width - 2 * cta_padding,
        font="F1",
        size=11,
    )
    cta_start = max(current_y, 240.0)
    faq_cta_background = text_panel_background(
        70,
        cta_start,
        cta_panel_width,
        faq_cta_lines,
        size=11,
        leading=cta_leading,
        padding_top=16,
        padding_bottom=20,
        fill_color=PALE_BLUE,
    )
    if faq_cta_background:
        faq_commands.append(faq_cta_background)
    if faq_cta_lines:
        faq_commands.append(
            text_block(
                70 + cta_padding,
                cta_start,
                faq_cta_lines,
                font="F1",
                size=11,
                color=BLACK,
                leading=cta_leading,
            )
        )
    faq_commands.append(footer(8))
    page_contents.append("\n".join(faq_commands))

    # Page 9 - London area showcase
    area_commands: List[str] = [
        page_background(),
        header("London area showcase", "On-the-ground expertise across prime districts"),
    ]

    area_specs = [
        (
            70.0,
            "Canary Wharf",
            [
                """
                Financial hub with riverside towers and concierge amenities. Corporate tenants seek premium finishes and
                flexible move-in dates.
                """,
            ],
        ),
        (
            232.0,
            "Shoreditch",
            [
                """
                Creative heartland with warehouse conversions and boutique new-builds. Ideal for tech professionals valuing
                lifestyle-led marketing.
                """,
            ],
        ),
        (
            394.0,
            "Hackney",
            [
                """
                Victorian streets and new developments with vibrant culture. Strong rental yields supported by community-driven
                amenities.
                """,
            ],
        ),
    ]

    card_top = 700.0
    card_width = 140.0
    for x, title, description in area_specs:
        card_commands, _ = area_card(x, card_top, card_width, title, description, fill_color=PALE_BLUE)
        area_commands.extend(card_commands)

    area_commands.append(
        wrapped_text_block(
            70,
            520,
            tidy_paragraphs(
                [
                    """
                    Beyond the East, Aktonz covers the City fringe, Greenwich Riverside and North London villages. Marketing
                    narratives are tailored to each micro-market to attract the ideal tenant profile quickly.
                    """
                ]
            ),
            width=430,
            font="F1",
            size=11,
            color=BLACK,
            leading=16,
        )
    )
    area_commands.append(footer(9))
    page_contents.append("\n".join(area_commands))

    # Page 10 - Contact
    contact_commands: List[str] = [
        page_background(),
        header("Let's move your lettings forward", "Book a consultation within 48 hours", include_logo=False),
        draw_logo(390, 730, 130),
        wrapped_text_block(
            70,
            660,
            tidy_paragraphs(
                [
                    """
                    Ready to maximise rental returns with a proactive, tech-enabled partner? Speak with Aktonz to receive a
                    bespoke marketing and compliance blueprint for your property.
                    """
                ]
            ),
            width=430,
            font="F1",
            size=12,
            color=BLACK,
            leading=18,
        ),
    ]
    card_specs = [
        (
            70.0,
            600.0,
            212.0,
            "Speak to the lettings team",
            [
                ("Phone", "0203 389 8009"),
                ("Email", "info@aktonz.com"),
                ("Website", "www.aktonz.com"),
            ],
        ),
        (
            313.0,
            600.0,
            212.0,
            "Stay connected",
            [
                ("Office hours", "Mon-Fri 9am-7pm | Sat 10am-4pm | Sun by appointment"),
                ("Social", "LinkedIn & Instagram @Aktonz"),
                ("Meetings", "In-person consultations available across London zones 1-3"),
            ],
        ),
    ]
    card_bottoms: List[float] = []
    for x, top, width, title, sections in card_specs:
        card_cmds, bottom = contact_card(x, top, width, title, sections)
        contact_commands.extend(card_cmds)
        card_bottoms.append(bottom)

    cta_panel_width = 455.0
    cta_padding = 18.0
    cta_leading = 16.0
    cta_text = tidy_paragraphs(
        [
            """
            Visit aktonz.com/landlords to schedule instantly or speak to our team for portfolio planning support.
            """
        ]
    )
    cta_lines = wrapped_lines(
        cta_text,
        width=cta_panel_width - 2 * cta_padding,
        font="F2",
        size=12,
    )
    cta_start = min(card_bottoms) - 28 if card_bottoms else 420
    cta_background = text_panel_background(
        70,
        cta_start,
        cta_panel_width,
        cta_lines,
        size=12,
        leading=cta_leading,
        padding_top=16,
        padding_bottom=20,
        fill_color=PALE_BLUE,
    )
    if cta_background:
        contact_commands.append(cta_background)
    if cta_lines:
        contact_commands.append(
            text_block(
                70 + cta_padding,
                cta_start,
                cta_lines,
                font="F2",
                size=12,
                color=DEEP_BLUE,
                leading=cta_leading,
            )
        )
    contact_commands.append(footer(10))
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
            f"<< /Type /Page /Parent {pages_obj} 0 R /MediaBox {media_box} /Resources {resource_dict} /Contents {content_obj} 0 R >>\n".encode(
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
