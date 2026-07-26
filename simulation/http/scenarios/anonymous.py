from .base import JourneyResult, assert_payload_object
from simulation.http.assertions import paginated


def run(client, context):
    result = JourneyResult("anonymous_browsing", "anonymous")
    stores = result.step(
        "list_active_stores",
        client.request("GET", "/api/stores/", expected=200),
        200,
        predicate=paginated,
    )
    store_id = context.get("active_store_id")
    variant_id = context.get("variant_id")
    offer_id = context.get("offer_id")
    if store_id:
        result.step("read_active_store", client.request("GET", f"/api/stores/{store_id}/", expected=200), 200, predicate=assert_payload_object)
        result.step(
            "list_store_offers",
            client.request("GET", f"/api/stores/{store_id}/offers/?page_size=5", expected=200),
            200,
            predicate=paginated,
        )
    if variant_id:
        result.step(
            "read_variant",
            client.request("GET", f"/api/catalog/device-variants/{variant_id}/", expected=200),
            200,
            predicate=assert_payload_object,
        )
        result.step(
            "list_variant_offers",
            client.request("GET", f"/api/catalog/device-variants/{variant_id}/offers/", expected=200),
            200,
            predicate=paginated,
        )
    if offer_id:
        result.step(
            "read_offer",
            client.request("GET", f"/api/offers/{offer_id}/", expected=200),
            200,
            predicate=assert_payload_object,
        )
    result.step(
        "protected_basket_denied",
        client.request("GET", "/api/basket/", expected=401),
        401,
        expected_failure=True,
    )
    return result
