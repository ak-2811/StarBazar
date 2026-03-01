import requests
from rest_framework.response import Response
from rest_framework.decorators import api_view
import json
from datetime import date, datetime
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer, LoginSerializer


@api_view(['POST'])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response({
            "token": str(refresh.access_token),
            "email": user.email
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data
        refresh = RefreshToken.for_user(user)

        return Response({
            "token": str(refresh.access_token),
            "email": user.email
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


FRAPPE_URL = "http://172.28.180.147:8001"
API_KEY = "823008797018d0a"
API_SECRET = "c3977b78a0e37d6"

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Host": "groceryv15.localhost"
}


@api_view(['GET'])
def all_products(request):

    page = int(request.GET.get("page", 1))
    page_size = 12

    category = request.GET.get("category")
    search = request.GET.get("search")
    availability = request.GET.get("availability")
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    sort_by = request.GET.get("sort_by")

    try:
        min_price = float(min_price) if min_price not in [None, ""] else None
    except:
        min_price = None

    try:
        max_price = float(max_price) if max_price not in [None, ""] else None
    except:
        max_price = None

    filters = []

    if category and category != "all":
        filters.append(["item_group", "=", category])

    if search:
        filters.append(["item_name", "like", f"%{search}%"])

    # 🔥 1️⃣ Fetch RANDOM 24 items
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'fields=["name","item_name","image","stock_uom","item_group"]'
        f"&limit_page_length=100"
        f"&order_by=RAND()"
    )

    if filters:
        items_url += f"&filters={json.dumps(filters)}"

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    if not items_data:
        return Response({
            "products": [],
            "total_count": 0
        })

    # Extract item codes
    item_codes = [item["name"] for item in items_data]
    item_codes_json = json.dumps(item_codes)

    # 🔥 2️⃣ Batch fetch prices
    price_url = (
        f"{FRAPPE_URL}/api/resource/Item%20Price?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["price_list","=","Standard Selling"]]'
        f'&fields=["item_code","price_list_rate","creation"]'
        f'&order_by=creation desc'
    )

    price_response = requests.get(price_url, headers=HEADERS).json()
    price_data = price_response.get("data", [])

    price_map = {}
    for price in price_data:
        if price["item_code"] not in price_map:
            price_map[price["item_code"]] = price["price_list_rate"]
    
    # 🔥 Apply Sorting
        if sort_by == "low_to_high":
            items_data = sorted(
                items_data,
                key=lambda item: float(price_map.get(item["name"], 0) or 0)
            )

        elif sort_by == "high_to_low":
            items_data = sorted(
                items_data,
                key=lambda item: float(price_map.get(item["name"], 0) or 0),
                reverse=True
            )

    # 🔥 3️⃣ Batch fetch REAL stock (Bin - Pending POS)

    # 1️⃣ Get base stock from Bin
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - A"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"
    print("ITEM CODES SENT:", item_codes)

    pending_response = requests.post(
        pending_url,
        headers=HEADERS,
        json={"item_codes": item_codes}
    ).json()
    print(pending_response)

    pending_rows = pending_response.get("message", [])

    pending_map = {}
    for row in pending_rows:
        item_code = row.get("item_code")
        sold_qty = float(row.get("sold_qty") or 0)
        pending_map[item_code] = sold_qty


    # 3️⃣ Final stock calculation
    stock_map = {}

    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        available = base - sold
        stock_map[code] = max(available, 0)

    # 🔥 4️⃣ Apply availability filter
    if availability == "in-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["name"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["name"], 0) <= 0
        ]
    
    # 🔥 Apply price range filter
    if min_price is not None or max_price is not None:
        filtered_items = []

        for item in items_data:
            price = float(price_map.get(item["name"], 0))

            if min_price is not None and price < min_price:
                continue

            if max_price is not None and price > max_price:
                continue

            filtered_items.append(item)

        items_data = filtered_items

    # 🔥 Ensure max 24 (never exceed)
    items_data = items_data[:40]

    total_count = len(items_data)

    # 🔥 5️⃣ Pagination (12 per page)
    start = (page - 1) * page_size
    end = start + page_size
    items_page = items_data[start:end]

    # 4️⃣ Get back-side image from File doctype
    file_url = (
        f"{FRAPPE_URL}/api/resource/File?"
        f'filters=[["File","attached_to_doctype","=","Item"],'
        f'["File","attached_to_name","in",{item_codes_json}]]'
        f'&fields=["attached_to_name","file_url"]'
    )

    file_response = requests.get(file_url, headers=HEADERS).json()
    file_data = file_response.get("data", [])

    # Map item_code -> back image
    back_image_map = {}

    for f in file_data:
        item_code = f["attached_to_name"]
        file_url = f["file_url"]

        # Ignore DP image if needed (optional filtering logic)
        if item_code not in back_image_map:
            back_image_map[item_code] = file_url

    # 🔥 6️⃣ Merge everything
    final_data = []

    print("DEBUG STOCK MAP:", stock_map.get("MILK"))

    for item in items_page:
        item_code = item["name"]
        main_image = item.get("image")

        back_image = None

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break
        final_data.append({
            "item_code": item["name"],
            "item_name": item["item_name"],
            "image": item["image"],
            "back_image":back_image,
            "unit": item["stock_uom"],
            "price": price_map.get(item["name"], 0),
            "category": item["item_group"],
            "brand": None,
            "stock": stock_map.get(item["name"], 0)
        })

    return Response({
        "products": final_data,
        "total_count": total_count,
        "page": page,
        "page_size": page_size
    })


@api_view(['POST'])
def wishlist_products(request):

    item_codes = request.data.get("item_codes", [])
    availability = request.data.get("availability", "all")

    if not item_codes:
        return Response([])

    item_codes_json = json.dumps(item_codes)

    # 1️⃣ Fetch Item basic info
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'filters=[["Item","name","in",{item_codes_json}]]'
        f'&fields=["name","item_name","image","stock_uom"]'
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    if not items_data:
        return Response([])

    # 2️⃣ Fetch latest price
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

    # 3️⃣ Get base stock from Bin (Stores - A)
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - A"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    # 4️⃣ Get pending POS sold qty
    pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"

    pending_response = requests.post(
        pending_url,
        headers=HEADERS,
        json={"item_codes": item_codes}
    ).json()

    pending_rows = pending_response.get("message", [])

    pending_map = {}
    for row in pending_rows:
        item_code = row.get("item_code")
        sold_qty = float(row.get("sold_qty") or 0)
        pending_map[item_code] = sold_qty

    # 5️⃣ Final stock calculation
    stock_map = {}

    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        available = base - sold
        stock_map[code] = max(available, 0)

    # 6️⃣ Apply availability filter
    if availability == "in-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["name"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["name"], 0) <= 0
        ]
    
    # 4️⃣ Get back-side image from File doctype
    file_url = (
        f"{FRAPPE_URL}/api/resource/File?"
        f'filters=[["File","attached_to_doctype","=","Item"],'
        f'["File","attached_to_name","in",{item_codes_json}]]'
        f'&fields=["attached_to_name","file_url"]'
    )

    file_response = requests.get(file_url, headers=HEADERS).json()
    file_data = file_response.get("data", [])

    # Map item_code -> back image
    back_image_map = {}

    for f in file_data:
        item_code = f["attached_to_name"]
        file_url = f["file_url"]

        # Ignore DP image if needed (optional filtering logic)
        if item_code not in back_image_map:
            back_image_map[item_code] = file_url

    # 7️⃣ Merge everything
    final_data = []

    for item in items_data:
        code = item["name"]
        stock_qty = stock_map.get(code, 0)
        item_code = item["name"]
        main_image = item.get("image")

        back_image = None

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break

        final_data.append({
            "item_code": code,
            "item_name": item["item_name"],
            "image": item["image"],
            "back_image": back_image,
            "unit": item["stock_uom"],
            "price": price_map.get(code, 0),
            "stock": stock_qty,
            "availability": "in-stock" if stock_qty > 0 else "out-of-stock"
        })

    return Response({"products": final_data})


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
    
    # 4️⃣ Get back-side image from File doctype
    file_url = (
        f"{FRAPPE_URL}/api/resource/File?"
        f'filters=[["File","attached_to_doctype","=","Item"],'
        f'["File","attached_to_name","in",{item_codes_json}]]'
        f'&fields=["attached_to_name","file_url"]'
    )

    file_response = requests.get(file_url, headers=HEADERS).json()
    file_data = file_response.get("data", [])

    # Map item_code -> back image
    back_image_map = {}

    for f in file_data:
        item_code = f["attached_to_name"]
        file_url = f["file_url"]

        # Ignore DP image if needed (optional filtering logic)
        if item_code not in back_image_map:
            back_image_map[item_code] = file_url

    # Merge item + price
    final_data = []
    for item in items_data:
        item_code = item["name"]
        main_image = item.get("image")

        back_image = None

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break
        final_data.append({
        "item_code": item["name"],
        "item_name": item["item_name"],
        "image": item["image"],
        "back_image": back_image,
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

    # Get back-side image from File doctype
    file_url = (
        f"{FRAPPE_URL}/api/resource/File?"
        f'filters=[["File","attached_to_doctype","=","Item"],'
        f'["File","attached_to_name","in",{item_codes_json}]]'
        f'&fields=["attached_to_name","file_url"]'
    )

    file_response = requests.get(file_url, headers=HEADERS).json()
    file_data = file_response.get("data", [])

    # Map item_code -> back image
    back_image_map = {}

    for f in file_data:
        item_code = f["attached_to_name"]
        file_url = f["file_url"]

        # Ignore DP image if needed (optional filtering logic)
        if item_code not in back_image_map:
            back_image_map[item_code] = file_url

    # Merge item + price
    final_data = []
    for item in items_data:
        item_code = item["name"]
        main_image = item.get("image")

        back_image = None

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break
        final_data.append({
            "item_code": item["name"],
            "item_name": item["item_name"],
            "image": item["image"],
            "back_image": back_image,
            "unit": item["stock_uom"],
            "price": price_map.get(item["name"], 0)
        })

    return Response(final_data)


@api_view(['GET'])
def pricing_offers(request):

    today = str(date.today())

    scheme_url = f"{FRAPPE_URL}/api/resource/Item%20Scheme"

    filters = [
        ["Item Scheme", "from_date", "<=", today],
        ["Item Scheme", "to_date", ">=", today],
        ["Item Scheme", "active", "=", 1]
    ]

    fields = [
        "name",
        "scheme_name",
        "from_date",
        "to_date",
        "item",
        "qty",
        "selling_price"
    ]

    response = requests.get(
        scheme_url,
        headers=HEADERS,
        params={
            "filters": json.dumps(filters),
            "fields": json.dumps(fields),
            "limit_page_length": 100
        }
    ).json()

    schemes = response.get("data", [])

    if not schemes:
        return Response([])

    final_data = []

    for scheme in schemes:

        item_code = scheme.get("item")
        qty = scheme.get("qty", 0)
        selling_price = scheme.get("selling_price", 0)

        if not item_code or qty == 0:
            continue

        offer_price = float(selling_price) / float(qty)
        print(offer_price)

        # Fetch item details
        item_response = requests.get(
            f"{FRAPPE_URL}/api/resource/Item/{item_code}",
            headers=HEADERS,
            params={
                "fields": json.dumps(["item_name", "image", "stock_uom"])
            }
        ).json()

        item_data = item_response.get("data", {})

        # Fetch original price
        price_response = requests.get(
            f"{FRAPPE_URL}/api/resource/Item%20Price",
            headers=HEADERS,
            params={
                "filters": json.dumps([
                    ["Item Price", "item_code", "=", item_code],
                    ["Item Price", "price_list", "=", "Standard Selling"]
                ]),
                "fields": json.dumps(["price_list_rate"]),
                "order_by": "creation desc",
                "limit_page_length": 1
            }
        ).json()

        price_data = price_response.get("data", [])
        original_price = price_data[0]["price_list_rate"] if price_data else 0

        final_data.append({
            "item_code": item_code,
            "item_name": item_data.get("item_name"),
            "image": item_data.get("image"),
            "unit": item_data.get("stock_uom"),
            "original_price": original_price,
            "price": offer_price,
            "min_qty": qty,
            "title": scheme.get("scheme_name"),
            "valid_from": scheme.get("from_date"),
            "valid_upto": scheme.get("to_date")
        })

    return Response(final_data)


