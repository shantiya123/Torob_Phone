from unittest.mock import patch

from django.test import SimpleTestCase

from simulation.concurrency.scenarios import run_concurrency_suite


class ConcurrencySafetyTests(SimpleTestCase):
    @patch("simulation.concurrency.scenarios.connection.vendor", "sqlite")
    def test_sqlite_is_explicitly_non_authoritative(self):
        result = run_concurrency_suite(object())
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["status"], "skipped")
        self.assertFalse(result[0]["authoritative"])
        self.assertFalse(result[0]["passed"])
