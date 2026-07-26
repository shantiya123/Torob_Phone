import os
from unittest.mock import patch

from django.test import SimpleTestCase

from simulation.safety import SimulationSafetyError, assert_safe_database


class SimulationSafetyTests(SimpleTestCase):
    @patch("simulation.safety.database_name", return_value="torob_phone_simulation")
    @patch("simulation.safety.settings.DJANGO_ENV", "development")
    @patch.dict(os.environ, {"SIMULATION_ALLOW_DESTRUCTIVE": "true"})
    def test_exact_database_confirmation_is_required(self, _database_name):
        assert_safe_database(confirm_database="torob_phone_simulation", destructive=True)

    @patch("simulation.safety.database_name", return_value="torob_phone_simulation")
    @patch("simulation.safety.settings.DJANGO_ENV", "production")
    @patch.dict(os.environ, {"SIMULATION_ALLOW_DESTRUCTIVE": "true"})
    def test_production_is_always_rejected(self, _database_name):
        with self.assertRaises(SimulationSafetyError):
            assert_safe_database(confirm_database="torob_phone_simulation", destructive=True)

    @patch("simulation.safety.database_name", return_value="torob_phone")
    @patch("simulation.safety.settings.DJANGO_ENV", "development")
    @patch.dict(os.environ, {"SIMULATION_ALLOW_DESTRUCTIVE": "true"})
    def test_unmarked_database_is_rejected(self, _database_name):
        with self.assertRaises(SimulationSafetyError):
            assert_safe_database(confirm_database="torob_phone", destructive=True)
