from django.contrib import admin
from .models import Wishlist, Order,OrderItem

admin.site.register(Wishlist)
admin.site.register(Order)
admin.site.register(OrderItem)