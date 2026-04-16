import requests
from rest_framework.response import Response
from rest_framework.decorators import api_view
import json
from datetime import date, datetime
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer, LoginSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from django.contrib.auth.models import User
from .models import Wishlist,Order,OrderItem
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os
from dotenv import load_dotenv
load_dotenv()
from django.views.decorators.http import require_POST
from urllib.parse import urlparse
from urllib.parse import urlparse, unquote, quote




@csrf_exempt
@require_POST
def start_clover_payment_view(request):
    try:
        body = json.loads(request.body)

        order_number = body.get("order_number")
        register_code = body.get("register_code")
        amount = body.get("amount")
        payment_mode = body.get("payment_mode")
        customer = body.get("customer")
        items = body.get("items", [])

        if not order_number:
            return JsonResponse({"success": False, "error": "order_number is required"}, status=400)

        if not register_code:
            return JsonResponse({"success": False, "error": "register_code is required"}, status=400)

        if amount is None:
            return JsonResponse({"success": False, "error": "amount is required"}, status=400)

        try:
            amount = int(amount)
        except Exception:
            return JsonResponse({"success": False, "error": "amount must be integer cents"}, status=400)

        if payment_mode not in ["Credit Card", "EBT"]:
            return JsonResponse({"success": False, "error": "payment_mode must be Credit Card or EBT"}, status=400)

        result = start_clover_payment(
            order_number=order_number,
            register_code=register_code,
            amount=amount,
            payment_mode=payment_mode,
            customer=customer,
            items=items
        )

        return JsonResponse(result, status=200 if result.get("success") else 400)

    except CloverServiceError as exc:
        return JsonResponse({"success": False, "error": str(exc)}, status=500)

    except Exception as exc:
        return JsonResponse({"success": False, "error": f"Unexpected error: {str(exc)}"}, status=500)

CLOVER_MERCHANT_ID = "BY609J523MA91"
CLOVER_PRIVATE_TOKEN = "75c13f1c-aaa0-3c13-0b22-c9e938c29c3d"

@csrf_exempt
def create_clover_checkout(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)

        order_id = data["order_id"]
        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        email = data.get("email", "")
        items = data.get("items", [])
        tax = float(data.get("tax", 0))
        total = float(data.get("total", 0))

        # 1. Save pending order in your DB here
        # Example:
        # order = Order.objects.create(
        #     order_id=order_id,
        #     customer_name=data.get("customer_name"),
        #     email=email,
        #     total=total,
        #     tax=tax,
        #     payment_status="PENDING"
        # )

        line_items = []
        for item in items:
            qty = int(item["qty"])
            unit_price = round(float(item["amount"]) / qty, 2) if qty else 0
            line_items.append({
                "name": item["name"],
                "price": int(round(unit_price * 100)),
                "unitQty": qty
            })

        if tax > 0:
            line_items.append({
                "name": "Tax",
                "price": int(round(tax * 100)),
                "unitQty": 1
            })

        success_url = f"https://shop-star-bazar.com/checkout?payment=success&order_id={order_id}"
        failure_url = f"https://shop-star-bazar.com/checkout?payment=failed&order_id={order_id}"

        payload = {
                "customer": {
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": email,
                    "phoneNumber": "9999999999",  # 🔥 important (don’t leave empty)

                    # ✅ address MUST be inside customer
                    "address": {
                        "address1": "Default Address",
                        "city": "New York",
                        "state": "NY",
                        "zip": "10001",
                        "country": "US"
                    }
                },

                "redirectUrls": {
                    "success": success_url,
                    "failure": failure_url
                },

                "shoppingCart": {
                    "lineItems": line_items
                },

                # ✅ REQUIRED
                "paymentSources": ["CARD"]
            }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "X-Clover-Merchant-Id": CLOVER_MERCHANT_ID,
            "authorization": f"Bearer {CLOVER_PRIVATE_TOKEN}"
        }

        response = requests.post(
            # "https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts",
                "https://api.clover.com/invoicingcheckoutservice/v1/checkouts",
            headers=headers,
            json=payload,
            timeout=30
        )
        print("CLOVER STATUS:", response.status_code)
        print("CLOVER RESPONSE:", response.text)
        if response.status_code not in [200, 201]:
            return JsonResponse({
                "error": "Clover checkout creation failed",
                "details": response.text
            }, status=400)
        
        print("CLOVER STATUS:", response.status_code)
        print("CLOVER RESPONSE:", response.text)

        clover_data = response.json()

        # 2. Save Clover session details on your order here
        # order.clover_checkout_url = clover_data.get("href")
        # order.clover_checkout_id = clover_data.get("id")
        # order.save()

        return JsonResponse({
            "order_id": order_id,
            "href": clover_data.get("href"),
            "clover_response": clover_data
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_wishlist(request):

    items = Wishlist.objects.filter(user=request.user)
    item_codes = [w.item_code for w in items]

    return Response({"item_codes": item_codes})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_wishlist(request):

    item_code = request.data.get("item_code")

    if not item_code:
        return Response({"error": "Item code required"}, status=400)

    wishlist_item = Wishlist.objects.filter(
        user=request.user,
        item_code=item_code
    ).first()

    if wishlist_item:
        wishlist_item.delete()
        return Response({"status": "removed"})
    else:
        Wishlist.objects.create(
            user=request.user,
            item_code=item_code
        )
        return Response({"status": "added"})

@api_view(['POST'])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response({
            "token": str(refresh.access_token),
            "refresh": str(refresh),
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
            "refresh": str(refresh),
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}".strip()
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user

    return Response({
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email
    })


FRAPPE_URL = os.environ.get("FRAPPE_URL", "http://localhost:8000")
API_KEY = os.environ.get("FRAPPE_API_KEY", "")
API_SECRET = os.environ.get("FRAPPE_API_SECRET", "")
FRAPPE_HOST = os.environ.get("FRAPPE_HOST", "localhost")

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Host": FRAPPE_HOST
}


def frappe_get_invoice_by_order(order_id):

    url = f"{FRAPPE_URL}/api/resource/Sales Invoice"
    
    params = {
        "filters": f'[["Sales Invoice","custom_order_id","=","{order_id}"]]',
        "fields": '["name"]'
    }

    r = requests.get(url, headers=HEADERS, params=params).json()

    data = r.get("data", [])
    return data[0]["name"] if data else None

# Creating Sales Invoice from the order.
@api_view(['POST'])
def create_sales_invoice(request):

    items = request.data.get("items", [])
    # customer_name = "Online Order"
    customer_name = request.data.get("customer_name", "Online Order")

    # -----------------------------------
    # CHECK / CREATE CUSTOMER IN FRAPPE
    # -----------------------------------

    customer_check_url = f"{FRAPPE_URL}/api/resource/Customer/{customer_name}"

    check_response = requests.get(
        customer_check_url,
        headers=HEADERS
    )

    if check_response.status_code == 404:
        # Customer does not exist → create it
        customer_payload = {
            "doctype": "Customer",
            "customer_name": customer_name,
            "customer_type": "Individual",
            "customer_group": "All Customer Groups",
            "territory": "All Territories"
        }

        create_customer_url = f"{FRAPPE_URL}/api/resource/Customer"

        requests.post(
            create_customer_url,
            headers=HEADERS,
            json=customer_payload
        )

    if not items:
        return Response({"error": "No items provided"}, status=400)

    invoice_items = []
    tax = float(request.data.get("tax", 0))
    total_amount = tax

    for i in items:
        qty = int(i["qty"])
        amount = float(i["amount"])
        item_code = i["item_code"]

        # calculate base rounded rate
        base_rate = round(amount / qty, 2)

        # compute correction so total matches amount
        running_total = base_rate * qty
        diff = round(running_total - amount, 2)

        if abs(diff) > 0 and qty > 1:
            # first (qty-1) items at base_rate
            invoice_items.append({
                "item_code": item_code,
                "qty": qty - 1,
                "rate": base_rate,
                "warehouse": "Stores - SB"
            })

            # last item adjusted
            invoice_items.append({
                "item_code": item_code,
                "qty": 1,
                "rate": round(base_rate - diff, 2),
                "warehouse": "Stores - SB"
            })
        else:
            invoice_items.append({
                "item_code": item_code,
                "qty": qty,
                "rate": base_rate,
                "warehouse": "Stores - SB"
            })

        total_amount += amount
    
    order_id = request.data.get("order_id")

    existing_invoice = frappe_get_invoice_by_order(order_id)
    if existing_invoice:
        return Response({"invoice": existing_invoice})

    payload = {
        "doctype": "Sales Invoice",
        "customer": customer_name,
        "company": "Star Bazar",

        "currency": "USD",
        "selling_price_list": "Standard Selling",
        "price_list_currency": "USD",
        "plc_conversion_rate": 1,
        "conversion_rate": 1, 

        "is_pos": 1,
        "update_stock": 1,
        "ignore_pricing_rule": 1,
        "custom_order_id": order_id,

        "items": invoice_items,

        "payments": [
            {
                "mode_of_payment": "Credit Card",
                "amount": total_amount
            }
        ]
    }

    url = f"{FRAPPE_URL}/api/resource/Sales Invoice"
    # print("PAYLOAD SENT:", payload)
    # print("URL:", url)

    response = requests.post(
        url,
        headers=HEADERS,
        json=payload
    )
    # print("ERP STATUS:", response.status_code)
    # print("ERP RESPONSE:", response.text)

    data = response.json()
    # print("ERP DATA:", data)

    if "data" not in data:
        return Response(data, status=400)
    
    invoice_name = data["data"]["name"]
       
    # submit invoice
    submit_url = f"{FRAPPE_URL}/api/resource/Sales Invoice/{invoice_name}"

    submit_response = requests.put(
        submit_url,
        headers=HEADERS,
        json={"docstatus": 1}
    )

     # Creating the entrt in the Online Order Doctype
    online_order_payload = {
        "doctype": "Online Order",
        "order_id": order_id,
        "customer_name": customer_name,
        "sales_invoice": invoice_name,
        "order_status": "Pending",
        "order_total": total_amount,
        "order_items": []
    }

    for i in items:
        online_order_payload["order_items"].append({
            "doctype": "Online Order Items",
            "item_code": i["item_code"],
            "item_name": i["name"],
            "qty": i["qty"],
            "price": i["original_price"]
        })

    online_order_url = f"{FRAPPE_URL}/api/resource/Online Order"

    online_response=requests.post(
        online_order_url,
        headers=HEADERS,
        json=online_order_payload
    )
    print("ONLINE ORDER STATUS:", online_response.status_code)
    print("ONLINE ORDER RESPONSE:", online_response.text)

    # -----------------------------
    # SAVE ORDER IN DJANGO DATABASE
    # -----------------------------

    email = request.data.get("email")

    user = None
    if email:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass

    order = Order.objects.create(
        order_id=order_id,
        user=user,
        email=email,
        total=total_amount,
        status="PREPARING"
    )


    for i in items:
        image_url = i.get("image") or ""
        if image_url and "erp.shop-star-bazar.com" in image_url:
            image_url = urlparse(image_url).path
        OrderItem.objects.create(
        order=order,
        item_code=i["item_code"],
        name=i.get("name"),
        image=image_url,
        price=i["original_price"],
        qty=i["qty"]
    )

    return Response({
        "message": "Invoice created",
        "invoice": invoice_name
    })

# Creating Local Django invoice 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_orders(request):

    user = request.user

    orders = Order.objects.filter(user=user).order_by("-created_at")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 5))
    total_count = orders.count()

    start = (page - 1) * page_size
    end = start + page_size

    orders = orders[start:end]


    data = []

    for order in orders:
        items = []

        for item in order.items.all():
            items.append({
                "item_code": item.item_code,
                "name": item.name,
                "price": float(item.price),
                "qty": item.qty,
                "image": item.image
            })

        data.append({
            "id": order.order_id,
            "date": order.created_at.strftime("%b %d, %Y"),
            "time": order.created_at.strftime("%I:%M %p"),
            "status": order.status,
            "total": float(order.total),
            "items": items
        })

    return Response({
        "results": data,
        "count": total_count
    })


# Recalculating at the time of checkout
@api_view(['POST'])
def get_products_by_codes(request):

    item_codes = request.data.get("item_codes", [])

    if not item_codes:
        return Response({"products": []})

    item_codes_json = json.dumps(item_codes)

    # 1️⃣ Fetch items
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'fields=["name","item_name","item_code","image","stock_uom","item_group","custom_food_stamp_enable","custom_non_food","custom_tobaco"]'
        f"&filters=[[\"name\",\"in\",{item_codes_json}]]"
        f"&limit_page_length=500"
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    if not items_data:
        return Response({"products": []})

    # 2️⃣ Fetch price
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

    # 3️⃣ Fetch stock
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - SB"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    stock_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    # 4️⃣ Build response
    final_data = []

    for item in items_data:

        code = item["item_code"]

        final_data.append({
            "item_code": code,
            "item_name": item["item_name"],
            "image": item["image"],
            "unit": item["stock_uom"],
            "category": item["item_group"],
            "food_stamp": item.get("custom_food_stamp_enable"),
            "non_food": item.get("custom_non_food"),
            "tobacco": item.get("custom_tobaco"),
            "price": price_map.get(code, 0),
            "stock": stock_map.get(code, 0)
        })

    return Response({
        "products": final_data
    })



@api_view(['GET'])
def get_categories(request):

    url = (
        f"{FRAPPE_URL}/api/resource/Item%20Group?"
        f'fields=["name"]'
        f'&filters=[["name","!=","Scheme"]]'
        f"&limit_page_length=500"
    )

    response = requests.get(url, headers=HEADERS).json()
    data = response.get("data", [])

    categories = [d["name"] for d in data]

    return Response({"categories": categories})


@api_view(['GET'])
def all_products(request):

    page = int(request.GET.get("page", 1))
    page_size = 12

    category = unquote(request.GET.get("category", "all"))
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

    filters = [["item_group", "!=", "Scheme"]]

    if category and category != "all":
        filters.append(["item_group", "=", category])

    if search:
        filters.append(["item_name", "like", f"%{search}%"])

    # 1️⃣ Calculate pagination offset
    limit_start = (page - 1) * page_size
    
    # 2️⃣ Get total count - fetch with a small limit to get metadata with count
    # Frappe returns pagination metadata that should include the total
    count_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'fields=["name"]'
        f"&limit_page_length=500"  # Frappe limit - any value returns same meta with count
        f"&filters={quote(json.dumps(filters, separators=(',', ':')))}"
    )
    total_count = 0
    try:
        count_response = requests.get(count_url, headers=HEADERS).json()
        count_data = count_response.get("data", [])
        count_meta = count_response.get("meta", {})
        
        # If we got data, at least use that as a minimum
        total_count = len(count_data)
        
        # But try to get the actual total from Frappe's meta if available
        if "total_count" in count_meta:
            total_count = count_meta["total_count"]
        elif count_meta:
            # Sometimes Frappe includes count differently in meta
            # Check for common variations
            for key in ["totalCount", "count", "total"]:
                if key in count_meta:
                    total_count = count_meta[key]
                    break
    except Exception as e:
        total_count = 0
        import sys
        print(f"DEBUG: Error fetching count: {e}", file=sys.stderr)
    
    # 3️⃣ Fetch paginated items with larger batch to account for filtering
    # Fetch 2x page_size to ensure we have enough after availability/price filtering
    fetch_limit = page_size * 2
    items_url = (
        f"{FRAPPE_URL}/api/resource/Item?"
        f'fields=["name","item_name","item_code","image","stock_uom","item_group","custom_food_stamp_enable","custom_non_food","custom_tobaco"]'
        f"&limit_page_length={fetch_limit}"
        f"&limit_start={limit_start}"
        f"&filters={quote(json.dumps(filters, separators=(',', ':')))}"
    )

    items_response = requests.get(items_url, headers=HEADERS).json()
    items_data = items_response.get("data", [])

    if not items_data:
        return Response({"products": [], "total_count": total_count, "page": page, "page_size": page_size})

    item_codes = [item["item_code"] for item in items_data]
    item_codes_json = json.dumps(item_codes)

    # 2️⃣ Fetch prices, stock, files in parallel
    import concurrent.futures

    def fetch_prices():
        price_url = (
            f"{FRAPPE_URL}/api/resource/Item%20Price?"
            f'filters=[["item_code","in",{item_codes_json}],'
            f'["price_list","=","Standard Selling"]]'
            f'&fields=["item_code","price_list_rate"]'
            f'&order_by=creation desc'
            f'&limit_page_length=500'
        )
        return requests.get(price_url, headers=HEADERS).json().get("data", [])

    def fetch_stock():
        bin_url = (
            f"{FRAPPE_URL}/api/resource/Bin?"
            f'filters=[["item_code","in",{item_codes_json}],'
            f'["warehouse","=","Stores - SB"]]'
            f'&fields=["item_code","actual_qty"]'
        )
        return requests.get(bin_url, headers=HEADERS).json().get("data", [])

    def fetch_pending():
        pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"
        return requests.post(pending_url, headers=HEADERS, json={"item_codes": item_codes}).json().get("message", [])

    def fetch_files():
        file_url = (
            f"{FRAPPE_URL}/api/resource/File?"
            f'filters=[["File","attached_to_doctype","=","Item"],'
            f'["File","attached_to_name","in",{item_codes_json}]]'
            f'&fields=["attached_to_name","file_url"]'
        )
        return requests.get(file_url, headers=HEADERS).json().get("data", [])

    # Run all fetches in parallel
    with concurrent.futures.ThreadPoolExecutor() as executor:
        price_future = executor.submit(fetch_prices)
        stock_future = executor.submit(fetch_stock)
        pending_future = executor.submit(fetch_pending)
        file_future = executor.submit(fetch_files)

        price_data = price_future.result()
        bin_data = stock_future.result()
        pending_rows = pending_future.result()
        file_data = file_future.result()

    # 3️⃣ Build maps
    price_map = {}
    for price in price_data:
        if price["item_code"] not in price_map:
            price_map[price["item_code"]] = price["price_list_rate"]

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    pending_map = {}
    for row in pending_rows:
        pending_map[row.get("item_code")] = float(row.get("sold_qty") or 0)

    stock_map = {}
    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        stock_map[code] = max(base - sold, 0)

    # 4️⃣ Apply filters (availability and price) to current batch
    if availability == "in-stock":
        items_data = [i for i in items_data if stock_map.get(i["item_code"], 0) > 0]
    elif availability == "out-of-stock":
        items_data = [i for i in items_data if stock_map.get(i["item_code"], 0) <= 0]

    if min_price is not None or max_price is not None:
        items_data = [
            i for i in items_data
            if (min_price is None or float(price_map.get(i["item_code"], 0)) >= min_price) and
               (max_price is None or float(price_map.get(i["item_code"], 0)) <= max_price)
        ]

    # 5️⃣ Apply sorting
    if sort_by == "low_to_high":
        items_data = sorted(items_data, key=lambda i: float(price_map.get(i["item_code"], 0) or 0))
    elif sort_by == "high_to_low":
        items_data = sorted(items_data, key=lambda i: float(price_map.get(i["item_code"], 0) or 0), reverse=True)

    # 6️⃣ Take only page_size items from the filtered batch
    items_page = items_data[:page_size]
    final_data = []
    for item in items_page:
        item_code = item["item_code"]
        main_image = item.get("image")
        back_image = next(
            (f["file_url"] for f in file_data
             if f["attached_to_name"] == item_code and f["file_url"] != main_image),
            None
        )
        final_data.append({
            "item_code": item_code,
            "item_name": item["item_name"],
            "image": main_image,
            "back_image": back_image,
            "unit": item["stock_uom"],
            "food_stamp": item.get("custom_food_stamp_enable"),
            "non_food": item.get("custom_non_food"),
            "tobacco": item.get("custom_tobaco"),
            "price": price_map.get(item_code, 0),
            "category": item["item_group"],
            "brand": None,
            "stock": stock_map.get(item_code, 0)
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
        f'&fields=["name","item_name","item_code","image","stock_uom","custom_food_stamp_enable","custom_non_food","custom_tobaco"]'
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

    # 3️⃣ Get base stock from Bin (Stores - SB)
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - SB"]]'
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
            if stock_map.get(item["item_code"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) <= 0
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
        code = item["item_code"]
        stock_qty = stock_map.get(code, 0)
        item_code = item["item_code"]
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
            "food_stamp": item.get("custom_food_stamp_enable"),
            "non_food": item.get("custom_non_food"),
            "tobacco": item.get("custom_tobaco"),
            "price": price_map.get(code, 0),
            "stock": stock_qty,
            "in_stock": stock_qty > 0,
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
        f'&fields=["name","item_name","item_code","image","stock_uom","custom_food_stamp_enable","custom_non_food","custom_tobaco"]'
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
    
    # Fetch the actual stock qty
    # 🔥Batch fetch REAL stock (Bin - Pending POS)

    # 1️⃣ Get base stock from Bin
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - SB"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"
    # print("ITEM CODES SENT:", item_codes)

    pending_response = requests.post(
        pending_url,
        headers=HEADERS,
        json={"item_codes": item_codes}
    ).json()
    # print(pending_response)

    pending_rows = pending_response.get("message", [])

    pending_map = {}
    for row in pending_rows:
        item_code = row.get("item_code")
        sold_qty = float(row.get("sold_qty") or 0)
        pending_map[item_code] = sold_qty


    # 3️⃣ Final stock calculation
    stock_map = {}
    availability=""
    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        available = base - sold
        stock_map[code] = max(available, 0)

    # 🔥 4️⃣ Apply availability filter
    if availability == "in-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) <= 0
        ]

    # Merge item + price
    final_data = []
    print("BIN MAP:", bin_map)
    print("PENDING MAP:", pending_map)

    for item in items_data:
        item_code = item["item_code"]
        main_image = item.get("image")

        back_image = None
        stock_qty = stock_map.get(item["item_code"], 0)
        print("BIN MAP:", bin_map)
        print("PENDING MAP:", pending_map)

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break
        final_data.append({
        "item_code": item["item_code"],
        "item_name": item["item_name"],
        "image": item["image"],
        "back_image": back_image,
        "unit": item["stock_uom"],
        "food_stamp": item.get("custom_food_stamp_enable"),
        "non_food": item.get("custom_non_food"),
        "tobacco": item.get("custom_tobaco"),
        "price": price_map.get(item["item_code"], 0),
        "in_stock": stock_qty > 0,
        "stock":stock_qty,
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
        f'&fields=["name","item_name","item_code","image","stock_uom","custom_food_stamp_enable","custom_non_food","custom_tobaco"]'
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

    # Fetch the actual stock qty
    # 🔥Batch fetch REAL stock (Bin - Pending POS)

    # 1️⃣ Get base stock from Bin
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - SB"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"
    # print("ITEM CODES SENT:", item_codes)

    pending_response = requests.post(
        pending_url,
        headers=HEADERS,
        json={"item_codes": item_codes}
    ).json()
    # print(pending_response)

    pending_rows = pending_response.get("message", [])

    pending_map = {}
    for row in pending_rows:
        item_code = row.get("item_code")
        sold_qty = float(row.get("sold_qty") or 0)
        pending_map[item_code] = sold_qty


    # 3️⃣ Final stock calculation
    stock_map = {}
    availability=""
    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        available = base - sold
        stock_map[code] = max(available, 0)

    # 🔥 4️⃣ Apply availability filter
    if availability == "in-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) <= 0
        ]

    # Merge item + price
    final_data = []
    for item in items_data:
        item_code = item["item_code"]
        main_image = item.get("image")

        back_image = None
        stock_qty=stock_map.get(item["item_code"], 0)

        # Find attachment that is NOT the main image
        for f in file_data:
            if (
                f["attached_to_name"] == item_code and
                f["file_url"] != main_image
            ):
                back_image = f["file_url"]
                break
        final_data.append({
            "item_code": item["item_code"],
            "item_name": item["item_name"],
            "image": item["image"],
            "back_image": back_image,
            "unit": item["stock_uom"],
            "food_stamp": item.get("custom_food_stamp_enable"),
            "non_food": item.get("custom_non_food"),
            "tobacco": item.get("custom_tobaco"),
            "price": price_map.get(item["item_code"], 0),
            "in_stock":stock_qty>0,
            "stock":stock_qty,
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

    item_codes = [s.get("item") for s in schemes if s.get("item")]
    item_codes_json = json.dumps(item_codes)

    # Fetch the actual stock qty
    # 🔥Batch fetch REAL stock (Bin - Pending POS)

    # 1️⃣ Get base stock from Bin
    bin_url = (
        f"{FRAPPE_URL}/api/resource/Bin?"
        f'filters=[["item_code","in",{item_codes_json}],'
        f'["warehouse","=","Stores - SB"]]'
        f'&fields=["item_code","actual_qty"]'
    )

    bin_response = requests.get(bin_url, headers=HEADERS).json()
    bin_data = bin_response.get("data", [])

    bin_map = {d["item_code"]: float(d["actual_qty"] or 0) for d in bin_data}

    pending_url = f"{FRAPPE_URL}/api/method/star_bazar.star_bazar.api.stock.get_pending_pos_qty"
    # print("ITEM CODES SENT:", item_codes)

    pending_response = requests.post(
        pending_url,
        headers=HEADERS,
        json={"item_codes": item_codes}
    ).json()
    # print(pending_response)

    pending_rows = pending_response.get("message", [])

    pending_map = {}
    for row in pending_rows:
        item_code = row.get("item_code")
        sold_qty = float(row.get("sold_qty") or 0)
        pending_map[item_code] = sold_qty


    # 3️⃣ Final stock calculation
    stock_map = {}
    availability=""
    for code in item_codes:
        base = bin_map.get(code, 0)
        sold = pending_map.get(code, 0)
        available = base - sold
        stock_map[code] = max(available, 0)

    # 🔥 4️⃣ Apply availability filter
    if availability == "in-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) > 0
        ]

    elif availability == "out-of-stock":
        items_data = [
            item for item in items_data
            if stock_map.get(item["item_code"], 0) <= 0
        ]



    for scheme in schemes:

        item_code = scheme.get("item")
        qty = scheme.get("qty", 0)
        selling_price = scheme.get("selling_price", 0)
        stock_qty = stock_map.get(item_code, 0)

        if not item_code or qty == 0:
            continue

        offer_price = float(selling_price) / float(qty)
        print(offer_price)

        # Fetch item details
        item_response = requests.get(
            f"{FRAPPE_URL}/api/resource/Item/{item_code}",
            headers=HEADERS,
            params={
                "fields": json.dumps(["item_name","item_code", "image", "stock_uom","custom_food_stamp_enable","custom_non_food","custom_tobaco"])
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
            "food_stamp": item_data.get("custom_food_stamp_enable"),
            "non_food": item_data.get("custom_non_food"),
            "tobacco": item_data.get("custom_tobaco"),
            "price": offer_price,
            "min_qty": qty,
            "title": scheme.get("scheme_name"),
            "valid_from": scheme.get("from_date"),
            "valid_upto": scheme.get("to_date"),
            "in_stock":stock_qty>0,
            "stock":stock_qty,
        })

    return Response(final_data)


