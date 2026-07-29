from pathlib import Path
import sys

_overlay_root = Path(__file__).resolve().parent / "_codex_overlay"
if _overlay_root.is_dir():
    overlay = str(_overlay_root)
    if overlay not in sys.path:
        sys.path.insert(0, overlay)