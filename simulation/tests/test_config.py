from django.test import SimpleTestCase

from simulation.config import PRESETS, preset
from simulation.safety import SimulationSafetyError


class SimulationConfigTests(SimpleTestCase):
    def test_presets_are_deterministic_and_nonempty(self):
        self.assertEqual(set(PRESETS), {"small", "medium", "large"})
        self.assertLess(preset("small").offers, preset("medium").offers)
        self.assertLess(preset("medium").customers, preset("large").customers)

    def test_unknown_preset_is_rejected(self):
        with self.assertRaises(ValueError):
            preset("unknown")

    def test_safety_error_is_runtime_error(self):
        self.assertTrue(issubclass(SimulationSafetyError, RuntimeError))
