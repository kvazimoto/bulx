from django.urls import re_path
from exchange.consumers import OrderConsumer

websocket_urlpatterns = [
    re_path(r"ws/order/(?P<public_id>[^/]+)/$", OrderConsumer.as_asgi()),
]
