from django.urls import path
from .views import best_sellers,shop_all_product,pricing_offers,all_products,wishlist_products
from .views import signup_view,login_view,toggle_wishlist,get_user_wishlist,get_categories,user_profile
from .views import create_sales_invoice
urlpatterns = [
    path('signup/', signup_view),
    path('login/', login_view),
    path('best-sellers/', best_sellers),
    path('shop-all-products/', shop_all_product),
    path('pricing-offers/', pricing_offers),
    path('all-products/', all_products),
    path("wishlist-products/", wishlist_products),
    path('wishlist/toggle/', toggle_wishlist),
    path('wishlist/', get_user_wishlist),
    path('categories/', get_categories),
    path('profile/',user_profile),
    path('create-sales-invoice/', create_sales_invoice),
]