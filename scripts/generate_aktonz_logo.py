"""Utility to regenerate the Aktonz logo asset used in the header.

The generator writes a 400x160 SVG featuring the AKTONZ wordmark in
brand yellow on a blue gradient background with a soft radial highlight.
"""
from __future__ import annotations

from pathlib import Path

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "aktonz-logo-modern.svg"

BG_TOP = "#0082ff"
BG_BOTTOM = "#005ad2"
TEXT_COLOR = "#ffe500"

FONT = {
    "A": ["00100", "01010", "10001", "11111", "10001", "10001", "10001"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
}

WIDTH, HEIGHT = 400, 160
SCALE = 12
SPACING = 6
WORD = "AKTONZ"


def _build_svg() -> str:
    char_w = len(next(iter(FONT.values()))[0])
    char_h = len(next(iter(FONT.values())))
    text_width = len(WORD) * char_w * SCALE + (len(WORD) - 1) * SPACING
    start_x = (WIDTH - text_width) // 2
    start_y = (HEIGHT - char_h * SCALE) // 2

    radius = 36
    highlight_cx = WIDTH // 2
    highlight_cy = start_y - 10

    pieces: list[str] = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"160\" viewBox=\"0 0 400 160\" role=\"img\" aria-labelledby=\"logo-title logo-desc\">",
        "  <title id=\"logo-title\">Aktonz</title>",
        "  <desc id=\"logo-desc\">Aktonz wordmark in yellow on a blue gradient background</desc>",
        "  <defs>",
        "    <linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">",
        f"      <stop offset=\"0%\" stop-color=\"{BG_TOP}\" />",
        f"      <stop offset=\"100%\" stop-color=\"{BG_BOTTOM}\" />",
        "    </linearGradient>",
        "    <radialGradient id=\"highlight\" cx=\"50%\" cy=\"50%\" r=\"50%\">",
        "      <stop offset=\"0%\" stop-color=\"#ffffff\" stop-opacity=\"0.7\" />",
        "      <stop offset=\"100%\" stop-color=\"#ffffff\" stop-opacity=\"0\" />",
        "    </radialGradient>",
        "  </defs>",
        "  <rect width=\"100%\" height=\"100%\" fill=\"url(#bg)\" rx=\"24\" />",
        f"  <circle cx=\"{highlight_cx}\" cy=\"{highlight_cy}\" r=\"{radius}\" fill=\"url(#highlight)\" opacity=\"0.45\" />",
    ]

    corner_radius = SCALE * 0.18

    for index, char in enumerate(WORD):
        glyph = FONT[char]
        origin_x = start_x + index * (char_w * SCALE + SPACING)
        for gy, glyph_row in enumerate(glyph):
            for gx, bit in enumerate(glyph_row):
                if bit != "1":
                    continue
                x = origin_x + gx * SCALE
                y = start_y + gy * SCALE
                pieces.append(
                    f"  <rect x=\"{x}\" y=\"{y}\" width=\"{SCALE}\" height=\"{SCALE}\" rx=\"{corner_radius:.2f}\" ry=\"{corner_radius:.2f}\" fill=\"{TEXT_COLOR}\" />"
                )

    pieces.append("</svg>")
    return "\n".join(pieces) + "\n"


def generate_logo() -> None:
    """Write the logo SVG to ``OUTPUT_PATH``."""

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(_build_svg(), encoding="utf-8")


if __name__ == "__main__":
    generate_logo()
