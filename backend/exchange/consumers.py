import json
from channels.generic.websocket import AsyncWebsocketConsumer


class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # public_id из URL: ws/order/<public_id>/
        self.public_id = self.scope["url_route"]["kwargs"]["public_id"]
        self.group_name = f"order_{self.public_id}"

        # подписка на группу
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # принимаем соединение
        await self.accept()

    async def disconnect(self, close_code):
        # отписка от группы
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # handler для group_send(type="order_update", ...)
    async def order_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "order_update",
            "data": event.get("data", {}),
        }))
