from __future__ import annotations

import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.aktonz_logo_modern_transparent import LOGO_PNG_BASE64


def main() -> None:
    output_path = Path(__file__).resolve().parent.parent / "public" / "aktonz-logo-modern-transparent.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(LOGO_PNG_BASE64))
    print(f"Restored logo to {output_path}")


if __name__ == "__main__":
    main()
