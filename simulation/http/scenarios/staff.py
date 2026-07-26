from .base import JourneyResult, assert_payload_object
from simulation.http.assertions import paginated


def run(client, context):
    result = JourneyResult("staff_store_review", "staff")
    result.step("login", client.login(context["staff_username"], context["staff_password"]), 200, predicate=lambda response: isinstance(response.payload, dict) and bool(response.payload.get("access")))
    result.step("current_user", client.request("GET", "/api/auth/me/", expected=200), 200, predicate=assert_payload_object)
    result.step("review_queue", client.request("GET", "/api/staff/store-reviews/?status=pending", expected=200), 200, predicate=paginated)
    pending_id = context.get("pending_store_id")
    if pending_id:
        result.step("review_detail", client.request("GET", f"/api/staff/store-reviews/{pending_id}/", expected=200), 200, predicate=assert_payload_object)
        result.step("approve_pending_store", client.request("POST", f"/api/staff/store-reviews/{pending_id}/approve/", json={}, expected=200), 200, predicate=assert_payload_object)
    rejected_id = context.get("rejected_store_id")
    if rejected_id:
        result.step(
            "reject_pending_store",
            client.request(
                "POST",
                f"/api/staff/store-reviews/{rejected_id}/reject/",
                json={"rejection_reason": "Synthetic scenario rejection."},
                expected=200,
            ),
            200,
            predicate=assert_payload_object,
        )
    result.step("logout", client.logout(), 200, predicate=assert_payload_object)
    return result
