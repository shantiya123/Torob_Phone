"""Small, offline-safe-on-request helpers for GSMArena image backfills."""

import ipaddress
import socket
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_HTML_BYTES = 1_000_000
USER_AGENT = "TorobPhoneImageBackfill/1.0"


class _NoRedirect(HTTPRedirectHandler):
    """A zero-redirect policy avoids following an unvalidated destination."""

    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


class _ImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.og_image = None
        self.main_image = None
        self._in_phone_photo = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "meta" and attributes.get("property", "").lower() == "og:image":
            self.og_image = self.og_image or attributes.get("content")
        if tag == "div" and attributes.get("id") == "specs-cp-pic":
            self._in_phone_photo = True
        if tag == "img" and self._in_phone_photo:
            self.main_image = self.main_image or attributes.get("src")

    def handle_endtag(self, tag):
        if tag == "div":
            self._in_phone_photo = False


def _is_safe_public_url(url):
    parsed = urlsplit(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        return False
    try:
        addresses = {entry[4][0] for entry in socket.getaddrinfo(parsed.hostname, None)}
        return bool(addresses) and all(ipaddress.ip_address(address).is_global for address in addresses)
    except (OSError, ValueError):
        return False


def extract_gsmarena_image(source_url, timeout=5):
    """Return a safe direct image URL or ``None``; callers decide persistence."""
    if not _is_safe_public_url(source_url):
        return None
    request = Request(source_url, headers={"User-Agent": USER_AGENT})
    try:
        with build_opener(_NoRedirect).open(request, timeout=timeout) as response:
            if getattr(response, "status", 200) != 200:
                return None
            length = response.headers.get("Content-Length")
            if length and int(length) > MAX_HTML_BYTES:
                return None
            content = response.read(MAX_HTML_BYTES + 1)
            if len(content) > MAX_HTML_BYTES:
                return None
    except (HTTPError, URLError, OSError, ValueError):
        return None
    parser = _ImageParser()
    try:
        parser.feed(content.decode("utf-8", errors="replace"))
    except ValueError:
        return None
    for candidate in (parser.og_image, parser.main_image):
        if not candidate:
            continue
        resolved = urljoin(source_url, candidate.strip())
        if _is_safe_public_url(resolved):
            return resolved
    return None
