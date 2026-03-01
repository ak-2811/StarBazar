from django.urls import path
from .views import best_sellers,shop_all_product,pricing_offers,all_products,wishlist_products
from .views import signup_view,login_view
urlpatterns = [
    path('signup/', signup_view),
    path('login/', login_view),
    path('best-sellers/', best_sellers),
    path('shop-all-products/', shop_all_product),
    path('pricing-offers/', pricing_offers),
    path('all-products/', all_products),
    path("wishlist-products/", wishlist_products),
]