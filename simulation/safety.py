import os

from django.conf import settings
from django.db import connection


class SimulationSafetyError(RuntimeError):
    pass


def database_name():
    return str(connection.settings_dict.get("NAME") or "")


def database_engine():
    return connection.vendor


def is_destructive_allowed():
    return os.getenv("SIMULATION_ALLOW_DESTRUCTIVE", "false").strip().lower() in {
        "1", "true", "yes", "on",
    }


def assert_safe_database(*, confirm_database=None, destructive=False):
    environment = getattr(settings, "DJANGO_ENV", os.getenv("DJANGO_ENV", "development")).lower()
    name = database_name()
    if not destructive:
        return
    if environment in {"production", "staging"}:
        raise SimulationSafetyError(
            f"Destructive simulation actions are disabled in DJANGO_ENV={environment}."
        )
    if not is_destructive_allowed():
        raise SimulationSafetyError("Set SIMULATION_ALLOW_DESTRUCTIVE=true to continue.")
    if not confirm_database or confirm_database != name:
        raise SimulationSafetyError(
            "The exact current database name must be supplied with --confirm-database."
        )
    lowered = name.lower()
    if not any(token in lowered for token in ("test", "simulation", "sim")):
        raise SimulationSafetyError(
            "The database name must contain 'test', 'simulation', or 'sim'."
        )


def assert_live_external_allowed():
    allowed = os.getenv("SIMULATION_ALLOW_LIVE_EXTERNAL", "false").lower()
    if allowed not in {"1", "true", "yes", "on"}:
        raise SimulationSafetyError("Live external services are disabled by default.")
