"""
scrape_gsmarena_v3.py
----------------------
Same as v2, with ONE change: fair per-brand allocation for --limit.

WHY: v2's main() walked BRANDS in dict order and kept filling from
`remaining = limit - len(all_phones)`. Since PAGES_PER_BRAND=3 caps each
brand at roughly 150 items, a `--limit 250` run would drain almost its
entire quota on the first 2-3 brands (Samsung, Apple, Xiaomi) in the dict
and never reach Google, Nokia, OnePlus, Motorola, Huawei, Oppo, vivo,
Honor, or Realme at all.

FIX: give every brand an equal target slice of the limit first
(`limit // len(BRANDS)`). If a brand's list page runs out early (e.g.
Google/OnePlus simply don't have that many current models), the leftover
quota is redistributed in a second top-up pass to brands that hit their
cap on round 1 (a sign they likely have more available).

Everything else (Stage 1 quick-spec crawl, Stage 2 full spec pages,
output format) is unchanged from v2.

USAGE:
    pip install requests beautifulsoup4 lxml
    python scrape_gsmarena_v3.py                       # stage 1 only (fast)
    python scrape_gsmarena_v3.py --full                 # stage 1 + stage 2
    python scrape_gsmarena_v3.py --full --limit 250      # fair spread across all brands
    python scrape_gsmarena_v3.py --full --limit 250 --brands Samsung,Apple,Xiaomi
"""

import argparse
import csv
import json
import random
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}
DELAY_RANGE = (2.0, 4.0)  # polite delay between requests

# Brand -> GSMArena numeric maker ID (verified from the site's own nav menu)
BRANDS = {
    "Samsung": 9,
    "Apple": 48,
    "Xiaomi": 80,
    "Google": 107,
    "Nokia": 1,       # HMD-era Nokia phones
    "OnePlus": 95,
    "Motorola": 4,
    "Huawei": 58,
    "Oppo": 82,
    "vivo": 98,
    "Honor": 121,
    "Realme": 118,
}

# How many list-pages to crawl per brand (each page ~ 50 devices, newest first).
PAGES_PER_BRAND = 3

SKIP_KEYWORDS = ("Tab", "Watch", "Book", "Buds", "Band", "Ring", "TWS")


def polite_get(session, url):
    time.sleep(random.uniform(*DELAY_RANGE))
    resp = session.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return resp


# ---------------------------------------------------------------------------
# STAGE 1: crawl brand list pages for quick specs
# ---------------------------------------------------------------------------
def crawl_brand(session, brand_name, brand_id, pages=PAGES_PER_BRAND, max_items=None,
                 skip_urls=None):
    """
    Crawl a brand's list pages. `skip_urls` (a set) lets a top-up pass
    avoid re-adding phones already collected in an earlier pass for the
    same brand.
    """
    skip_urls = skip_urls or set()
    results = []
    for page in range(1, pages + 1):
        if page == 1:
            url = f"https://www.gsmarena.com/{brand_name.lower()}-phones-{brand_id}.php"
        else:
            url = f"https://www.gsmarena.com/{brand_name.lower()}-phones-f-{brand_id}-0-p{page}.php"

        try:
            resp = polite_get(session, url)
        except Exception as e:
            print(f"  [{brand_name} p{page}] fetch failed: {e}")
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        items = soup.select("div.makers ul li a")
        if not items:
            print(f"  [{brand_name} p{page}] no items found (probably last page)")
            break

        for a in items:
            name = a.select_one("strong span")
            name = name.get_text(strip=True) if name else a.get_text(strip=True)
            if any(kw.lower() in name.lower() for kw in SKIP_KEYWORDS):
                continue
            href = a.get("href")
            url_full = href if href.startswith("http") else "https://www.gsmarena.com/" + href
            if url_full in skip_urls:
                continue
            img = a.select_one("img")
            quick_spec_text = img.get("title") if img else None
            results.append({
                "brand": brand_name,
                "model": name,
                "source_url": url_full,
                "quick_spec_raw": quick_spec_text,
            })
            if max_items and len(results) >= max_items:
                print(f"  [{brand_name} p{page}] hit target ({max_items}), stopping early")
                return results
        print(f"  [{brand_name} p{page}] {len(items)} items (running total {len(results)})")
    return results


def parse_quick_spec(text):
    if not text:
        return {}
    out = {}
    m = re.search(r"Announced (\w+ \d{4})", text)
    if m:
        out["announced"] = m.group(1)
    m = re.search(r"([\d.]+)[\u2033\"] display", text)
    if m:
        out["display_size_in"] = float(m.group(1))
    m = re.search(r"display,\s*(.+?)\s*chipset", text)
    if m:
        out["chipset"] = m.group(1)
    m = re.search(r"(\d+)\s*mAh battery", text)
    if m:
        out["battery_mah"] = int(m.group(1))
    m = re.search(r"(\d+)\s*GB storage", text)
    if m:
        out["storage_gb"] = int(m.group(1))
    m = re.search(r"(\d+)\s*GB RAM", text)
    if m:
        out["ram_gb"] = int(m.group(1))
    m = re.search(r"GB RAM,\s*(.+?)\.?$", text)
    if m:
        out["build_protection"] = m.group(1).rstrip(".")
    return out


# ---------------------------------------------------------------------------
# STAGE 2: full spec page (only run for phones you want full detail on)
# ---------------------------------------------------------------------------
def parse_full_spec_page(session, url):
    resp = polite_get(session, url)
    soup = BeautifulSoup(resp.text, "lxml")
    title = soup.select_one("h1.specs-phone-name-title")
    title = title.get_text(strip=True) if title else None

    specs = {}
    for table in soup.select("#specs-list table"):
        cat_tag = table.select_one("th")
        category = cat_tag.get_text(strip=True) if cat_tag else "misc"
        for row in table.select("tr"):
            label_tag = row.select_one("td.ttl")
            value_tag = row.select_one("td.nfo")
            if not label_tag or not value_tag:
                continue
            label = label_tag.get_text(" ", strip=True)
            value = value_tag.get_text(" | ", strip=True)
            specs[f"{category}.{label}"] = value
    return {"model_title": title, "raw_specs": specs}


# ---------------------------------------------------------------------------
# Fair allocation across brands
# ---------------------------------------------------------------------------
def collect_with_fair_allocation(session, brands_dict, limit):
    """
    Round 1: give every brand an equal target (limit // num_brands).
    Round 2 (top-up): if some brands came up short of their target
    (their list simply doesn't have that many current models), redistribute
    the leftover quota to brands that hit their round-1 cap exactly --
    those are the ones likely to have more phones available.
    """
    all_phones = []
    seen_urls_by_brand = {b: set() for b in brands_dict}
    num_brands = len(brands_dict)
    per_brand_target = max(1, limit // num_brands)

    print(f"Round 1: targeting ~{per_brand_target} phones/brand across {num_brands} brands "
          f"(limit={limit})")
    hit_cap_brands = []
    for brand_name, brand_id in brands_dict.items():
        if len(all_phones) >= limit:
            break
        print(f"Crawling {brand_name} (target {per_brand_target})...")
        phones = crawl_brand(session, brand_name, brand_id, max_items=per_brand_target)
        for p in phones:
            p.update(parse_quick_spec(p["quick_spec_raw"]))
            seen_urls_by_brand[brand_name].add(p["source_url"])
        all_phones.extend(phones)
        if len(phones) >= per_brand_target:
            hit_cap_brands.append(brand_name)

    remaining = limit - len(all_phones)
    if remaining > 0 and hit_cap_brands:
        print(f"\nRound 2 (top-up): {remaining} slots left over, redistributing across "
              f"{len(hit_cap_brands)} brand(s) that had more available: {hit_cap_brands}")
        per_topup = max(1, -(-remaining // len(hit_cap_brands)))  # ceil division
        for brand_name in hit_cap_brands:
            if remaining <= 0:
                break
            brand_id = brands_dict[brand_name]
            take = min(per_topup, remaining)
            print(f"Top-up crawling {brand_name} (+{take})...")
            # crawl a larger window and skip URLs we already collected for this brand
            more = crawl_brand(
                session, brand_name, brand_id,
                max_items=per_brand_target + take,
                skip_urls=seen_urls_by_brand[brand_name],
            )
            more = more[:take]
            for p in more:
                p.update(parse_quick_spec(p["quick_spec_raw"]))
                seen_urls_by_brand[brand_name].add(p["source_url"])
            all_phones.extend(more)
            remaining = limit - len(all_phones)

    return all_phones[:limit]


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="also fetch full per-phone spec pages (slow)")
    ap.add_argument("--limit", type=int, default=300, help="max phones to keep overall")
    ap.add_argument("--brands", type=str, default=None,
                     help="comma-separated subset of brand names to scrape, e.g. "
                          "'Samsung,Apple,Xiaomi'. Defaults to all brands in BRANDS.")
    args = ap.parse_args()

    if args.brands:
        wanted = {b.strip() for b in args.brands.split(",")}
        brands_dict = {k: v for k, v in BRANDS.items() if k in wanted}
        unknown = wanted - set(brands_dict)
        if unknown:
            print(f"WARNING: unknown brand name(s) ignored: {sorted(unknown)}. "
                  f"Known brands: {sorted(BRANDS)}")
    else:
        brands_dict = BRANDS

    session = requests.Session()
    all_phones = collect_with_fair_allocation(session, brands_dict, args.limit)

    print(f"\nStage 1 done: {len(all_phones)} phones collected.")
    counts = {}
    for p in all_phones:
        counts[p["brand"]] = counts.get(p["brand"], 0) + 1
    print("Per-brand counts:", counts)

    Path("../phones_quickspec.json").write_text(json.dumps(all_phones, indent=2))
    if all_phones:
        keys = sorted({k for p in all_phones for k in p.keys()})
        with open("../phones_quickspec.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=keys)
            w.writeheader()
            w.writerows(all_phones)
    print("Saved phones_quickspec.json / .csv")

    if args.full:
        print("\nStage 2: fetching full spec pages (this takes a while)...")
        full_records = []
        for i, p in enumerate(all_phones, 1):
            print(f"[{i}/{len(all_phones)}] {p['brand']} {p['model']}")
            try:
                rec = parse_full_spec_page(session, p["source_url"])
                rec["brand"] = p["brand"]
                rec["source_url"] = p["source_url"]
                full_records.append(rec)
            except Exception as e:
                print(f"  ERROR: {e}")
            if i % 10 == 0:
                Path("../data/phones_full.json").write_text(json.dumps(full_records, indent=2))
        Path("../data/phones_full.json").write_text(json.dumps(full_records, indent=2))
        print(f"Saved phones_full.json with {len(full_records)} full records.")


if __name__ == "__main__":
    main()