def is_json_object(response):
    return isinstance(response.payload, dict)


def has_keys(response, keys):
    return is_json_object(response) and set(keys).issubset(response.payload)


def paginated(response):
    return has_keys(response, {"count", "next", "previous", "results"})


def status_in(response, statuses):
    return response.status_code in set(statuses)
