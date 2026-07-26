from django.test import SimpleTestCase

from simulation.validation.database import audit_public_payload, contains_private_keys


class SimulationPrivacyTests(SimpleTestCase):
    def test_private_fields_are_detected_recursively(self):
        payload = {"results": [{"store": {"name": "Safe", "legal_profile": {"tax_identifier": "x"}}}]}
        self.assertTrue(contains_private_keys(payload))
        self.assertFalse(contains_private_keys({"store": {"id": 1, "name": "Safe"}}))

    def test_clean_payload_passes(self):
        result = audit_public_payload({"results": [{"store": {"id": 1, "name": "Safe"}}]})
        self.assertTrue(result["passed"])
