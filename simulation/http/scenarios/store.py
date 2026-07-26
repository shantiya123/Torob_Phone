from .base import JourneyResult, assert_payload_object
from simulation.http.assertions import paginated


def run(client, context):
    result = JourneyResult("store_operations", "store")
    result.step("login", client.login(context["store_username"], context["store_password"]), 200, predicate=lambda response: isinstance(response.payload, dict) and bool(response.payload.get("access")))
    result.step("current_user", client.request("GET", "/api/auth/me/", expected=200), 200, predicate=assert_payload_object)
    result.step("my_store", client.request("GET", "/api/stores/me/", expected=200), 200, predicate=assert_payload_object)
    result.step("dashboard", client.request("GET", "/api/stores/me/dashboard/", expected=200), 200, predicate=assert_payload_object)
    result.step("catalog", client.request("GET", "/api/catalog/phones/?page_size=5", expected=200), 200, predicate=paginated)
    detail_id = context.get("catalog_phone_id")
    if detail_id:
        result.step("catalog_detail", client.request("GET", f"/api/catalog/phones/{detail_id}/", expected=200), 200, predicate=assert_payload_object)
    result.step("my_offers", client.request("GET", "/api/stores/me/offers/", expected=200), 200, predicate=paginated)
    result.step("my_orders", client.request("GET", "/api/stores/me/orders/", expected=200), 200, predicate=paginated)
    result.step("logout", client.logout(), 200, predicate=assert_payload_object)
    return result
