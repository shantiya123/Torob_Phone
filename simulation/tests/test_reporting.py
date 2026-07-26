from django.test import SimpleTestCase

from simulation.http.scenarios.base import JourneyResult
from simulation.http.client import HttpResponse
from simulation.reporting import journey_report


class HttpReportingTests(SimpleTestCase):
    def test_report_contains_endpoint_failures_and_latency(self):
        journey = JourneyResult("test", "customer")
        journey.step(
            "ok",
            HttpResponse("GET", "/api/stores/", 200, {}, 3.2),
            200,
        )
        journey.step(
            "bad",
            HttpResponse("GET", "/api/basket/", 500, {}, 4.1),
            200,
        )
        report = journey_report("run-1", "http://localhost:8000", [journey])
        self.assertEqual(report["failure_count"], 1)
        self.assertEqual(report["failures_by_endpoint"], {"/api/basket/": 1})
        self.assertEqual(report["response_time_ms"]["max"], 4.1)
