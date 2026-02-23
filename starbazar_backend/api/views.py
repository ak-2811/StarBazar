import requests
from rest_framework.response import Response
from rest_framework.decorators import api_view
import json
from datetime import date

FRAPPE_URL = "http://172.28.180.147:8001"
API_KEY = "823008797018d0a"
API_SECRET = "c3977b78a0e37d6"

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Host": "groceryv15.localhost"
}

@api_view(['GET'])
def best_sellers(request):

    # 1️⃣ Get Best Seller item codes
    bs_url = f"{FRAPPE_URL}/api/resource/Best%20Seller?fields=[\"item\"]"
    bs_response = requests.get(bs_url, headers=HEADERS).json()

    item_codes = [entry["item"] for entry in bs_response.get("data", [])]

    if not item_codes:
        return Response([])

    # Convert list to JSON string for filter
    item_codes_json = json.dumps(item_codes)

    # 2️⃣ Get Item basic info
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'filters=[["Item","name","in",{item_codes_json}]]'
        f'&fields=["name","item_name","image","stock_uom"]'
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    # 3️⃣ Get latest price from Item Price
    price_url = (
        f"{FRAPPE_URL}/api/resource/Item%20Price?"
        f'filters=[["Item Price","item_code","in",{item_codes_json}],'
        f'["Item Price","price_list","=","Standard Selling"]]'
        f'&fields=["item_code","price_list_rate","creation"]'
        f'&order_by=creation desc'
    )

    price_response = requests.get(price_url, headers=HEADERS).json()
    price_data = price_response.get("data", [])

    # Create price map (latest first because of order_by desc)
    price_map = {}
    for price in price_data:
        if price["item_code"] not in price_map:
            price_map[price["item_code"]] = price["price_list_rate"]

    # Merge item + price
    final_data = []
    for item in items_data:
        final_data.append({
            "item_code": item["name"],
            "item_name": item["item_name"],
            "image": item["image"],
            "unit": item["stock_uom"],
            "price": price_map.get(item["name"], 0)
        })

    return Response(final_data)

@api_view(['GET'])
def shop_all_product(request):

    # 1️⃣ Get Best Seller item codes
    bs_url = f"{FRAPPE_URL}/api/resource/Shop%20All%20Products?fields=[\"item\"]"
    bs_response = requests.get(bs_url, headers=HEADERS).json()

    item_codes = [entry["item"] for entry in bs_response.get("data", [])]

    if not item_codes:
        return Response([])

    # Convert list to JSON string for filter
    item_codes_json = json.dumps(item_codes)

    # 2️⃣ Get Item basic info
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'filters=[["Item","name","in",{item_codes_json}]]'
        f'&fields=["name","item_name","image","stock_uom"]'
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    # 3️⃣ Get latest price from Item Price
    price_url = (
        f"{FRAPPE_URL}/api/resource/Item%20Price?"
        f'filters=[["Item Price","item_code","in",{item_codes_json}],'
        f'["Item Price","price_list","=","Standard Selling"]]'
        f'&fields=["item_code","price_list_rate","creation"]'
        f'&order_by=creation desc'
    )

    price_response = requests.get(price_url, headers=HEADERS).json()
    price_data = price_response.get("data", [])

    # Create price map (latest first because of order_by desc)
    price_map = {}
    for price in price_data:
        if price["item_code"] not in price_map:
            price_map[price["item_code"]] = price["price_list_rate"]

    # Merge item + price
    final_data = []
    for item in items_data:
        final_data.append({
            "item_code": item["name"],
            "item_name": item["item_name"],
            "image": item["image"],
            "unit": item["stock_uom"],
            "price": price_map.get(item["name"], 0)
        })

    return Response(final_data)

# @api_view(['GET'])
# def pricing_offers(request):

#     today = str(date.today())

#     # 1️⃣ Get active Pricing Rules
#     rule_url = (
#         f"{FRAPPE_URL}/api/resource/Pricing%20Rule?"
#         f'filters=[["Pricing Rule","selling","=",1],'
#         f'["Pricing Rule","valid_from","<=","{today}"],'
#         f'["Pricing Rule","valid_upto",">=","{today}"]]'
#         f'&fields=["naming_series","title","min_qty","valid_from","valid_upto","rate"]'
#     )

#     rules = requests.get(rule_url, headers=HEADERS).json().get("data", [])

#     final_data = []

#     for rule in rules:

#         # 2️⃣ Get child items for this rule
#         child_url = (
#             f"{FRAPPE_URL}/api/resource/Pricing%20Rule%20Item%20Code?"
#             f'filters=[["Pricing Rule Item Code","parent","=","{rule["naming_series"]}"]]'
#             f'&fields=["item_code"]'
#         )

#         children = requests.get(child_url, headers=HEADERS).json().get("data", [])

#         for child in children:

#             item_code = child["item_code"]

#             # 3️⃣ Get Item details
#             item_url = (
#                 f"{FRAPPE_URL}/api/resource/Item/{item_code}"
#             )

#             item_data = requests.get(item_url, headers=HEADERS).json().get("data", {})

#             # 4️⃣ Get original price
#             price_url = (
#                 f"{FRAPPE_URL}/api/resource/Item%20Price?"
#                 f'filters=[["Item Price","item_code","=","{item_code}"],'
#                 f'["Item Price","price_list","=","Standard Selling"]]'
#                 f'&fields=["price_list_rate"]'
#             )

#             price_data = requests.get(price_url, headers=HEADERS).json().get("data", [])

#             original_price = price_data[0]["price_list_rate"] if price_data else 0

#             final_data.append({
#                 "item_code": item_code,
#                 "title": rule["title"],
#                 "min_qty": rule["min_qty"],
#                 "valid_from": rule["valid_from"],
#                 "valid_upto": rule["valid_upto"],
#                 "offer_price": rule["rate"],
#                 "original_price": original_price,
#                 "uom": item_data.get("stock_uom"),
#                 "image": item_data.get("image")
#             })

#     return Response(final_data)

@api_view(['GET'])
def pricing_offers(request):

    today = str(date.today())

    # 1️⃣ Get active pricing rules
    rule_url = f"{FRAPPE_URL}/api/method/frappe.client.get_list"

    payload = {
        "doctype": "Pricing Rule",
        "fields": json.dumps([
        "name",
        "title",
        "min_qty",
        "valid_from",
        "valid_upto",
        "rate"
            ]),
        "limit_page_length": 100
    }

    rule_response = requests.get(rule_url, headers=HEADERS, params=payload).json()
    rules = rule_response.get("message", [])
    print(rules)
    if not rules:
        return Response([])

    # 2️⃣ Collect rule names
    # rule_names = [r["name"] for r in rules]
    # rule_names_json = json.dumps(rule_names)

    children = []

    for rule in rules:
        doc_url = f"{FRAPPE_URL}/api/method/frappe.client.get"
        doc_payload = {
            "doctype": "Pricing Rule",
            "name": rule["name"]
        }

        doc_response = requests.get(doc_url, headers=HEADERS, params=doc_payload).json()
        full_doc = doc_response.get("message", {})
        print("FULL DOC:", full_doc)

        for row in full_doc.get("items", []):
            children.append({
                "parent": rule["name"],
                "item_code": row["item_code"]
            })
    print(children)

    if not children:
        return Response([])

    # 4️⃣ Collect item codes
    item_codes = list(set([c["item_code"] for c in children]))
    item_codes_json = json.dumps(item_codes)

    # 5️⃣ Fetch Items
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'filters=[["Item","name","in",{item_codes_json}]]'
        f'&fields=["name","item_name","image","stock_uom"]'
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    item_map = {item["name"]: item for item in items_data}

    # 6️⃣ Fetch original prices
    price_url = (
        f"{FRAPPE_URL}/api/resource/Item%20Price?"
        f'filters=[["Item Price","item_code","in",{item_codes_json}],'
        f'["Item Price","price_list","=","Standard Selling"]]'
        f'&fields=["item_code","price_list_rate","creation"]'
        f'&order_by=creation desc'
    )

    price_response = requests.get(price_url, headers=HEADERS).json()
    price_data = price_response.get("data", [])

    price_map = {}
    for price in price_data:
        if price["item_code"] not in price_map:
            price_map[price["item_code"]] = price["price_list_rate"]

    # 7️⃣ Map rule name to rule data
    rule_map = {r["name"]: r for r in rules}

    final_data = []

    for child in children:

        rule = rule_map.get(child["parent"])
        item_code = child["item_code"]
        item = item_map.get(item_code)

        if not item:
            continue

        final_data.append({
            "item_code": item_code,
            "item_name": item["item_name"],
            "image": item["image"],
            "unit": item["stock_uom"],
            "original_price": price_map.get(item_code, 0),
            "offer_price": rule["rate"],
            "min_qty": rule["min_qty"],
            "title": rule["title"],
            "valid_from": rule["valid_from"],
            "valid_upto": rule["valid_upto"]
        })

    return Response(final_data)