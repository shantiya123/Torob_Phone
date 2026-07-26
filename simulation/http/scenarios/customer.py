from uuid import uuid4

from .base import JourneyResult, assert_payload_object
from simulation.http.assertions import paginated


def run(client, context):
    result = JourneyResult("customer_purchase", "customer")
    username = context["username"]
    password = context["password"]
    result.step("login", client.login(username, password), 200, predicate=lambda response: isinstance(response.payload, dict) and bool(response.payload.get("access")))
    result.step("current_user", client.request("GET", "/api/auth/me/", expected=200), 200, predicate=assert_payload_object)
    result.step("refresh", client.refresh(), 200, predicate=lambda response: isinstance(response.payload, dict) and bool(response.payload.get("access")))
    result.step("list_stores", client.request("GET", "/api/stores/", expected=200), 200, predicate=paginated)
    result.step("wallet", client.request("GET", "/api/wallet/", expected=200), 200, predicate=assert_payload_object)
    result.step("wallet_transactions", client.request("GET", "/api/wallet/transactions/", expected=200), 200, predicate=paginated)
    result.step(
        "search_without_external_provider",
        client.request("POST", "/api/search/", json={"query_set": context["empty_query_set"]}, expected=200),
        200,
        predicate=paginated,
    )
    offer_id = context.get("customer_offer_id")
    if offer_id:
        add = result.step(
            "add_offer_to_basket",
            client.request("POST", "/api/basket/items/", json={"offer": offer_id, "quantity": 1}, expected=201),
            201,
            predicate=assert_payload_object,
        )
        result.created_ids["basket_item_id"] = add.payload.get("id") if isinstance(add.payload, dict) else None
        result.step("read_basket", client.request("GET", "/api/basket/", expected=200), 200, predicate=assert_payload_object)
        result.step(
            "checkout",
            client.request(
                "POST",
                "/api/orders/",
                json={},
                headers={"Idempotency-Key": f"http-{context['run_id']}-{uuid4().hex}"},
                expected=201,
            ),
            201,
            predicate=assert_payload_object,
        )
        result.step("list_orders", client.request("GET", "/api/orders/", expected=200), 200, predicate=paginated)
    result.step("logout", client.logout(), 200, predicate=assert_payload_object)
    result.step(
        "refresh_replay_rejected",
        client.request(
            "POST",
            "/api/auth/token/refresh/",
            json={},
            expected=400,
        ),
        400,
        expected_failure=True,
    )
    return result
