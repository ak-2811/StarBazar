import requests

FRAPPE_URL = "http://172.28.180.147:8001"
API_KEY = "823008797018d0a"
API_SECRET = "c3977b78a0e37d6"

url = f"{FRAPPE_URL}/api/resource/Best%20Seller?fields=[\"item\"]"

headers = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Host": "groceryv15.localhost"
}

response = requests.get(url, headers=headers)

print("Status:", response.status_code)
print("Response:", response.text)