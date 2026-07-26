import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Preset:
    customers: int
    stores: int
    staff: int
    offers: int
    orders: int


PRESETS = {
    "small": Preset(10, 4, 2, 30, 20),
    "medium": Preset(100, 20, 4, 500, 300),
    "large": Preset(1000, 100, 10, 3000, 2000),
}


def preset(name):
    try:
        return PRESETS[name]
    except KeyError as exc:
        raise ValueError(f"Unknown simulation preset: {name}") from exc


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}
