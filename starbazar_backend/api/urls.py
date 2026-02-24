from django.urls import path
from .views import best_sellers,shop_all_product,pricing_offers,all_products

urlpatterns = [
    path('best-sellers/', best_sellers),
    path('shop-all-products/', shop_all_product),
    path('pricing-offers/', pricing_offers),
    path('all-products/', all_products),
]