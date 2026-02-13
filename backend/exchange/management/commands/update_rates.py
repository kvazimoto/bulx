import time
from django.core.management.base import BaseCommand
from exchange.services.rates_updater import update_rates_once


class Command(BaseCommand):
    help = "Update RateCache from Binance + NBU. Use --loop for periodic updates."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")
        parser.add_argument("--interval", type=int, default=30)

    def handle(self, *args, **opts):
        loop = opts["loop"]
        interval = opts["interval"]

        if not loop:
            info = update_rates_once()
            self.stdout.write(self.style.SUCCESS(str(info)))
            return

        self.stdout.write(self.style.WARNING(f"Loop mode: interval={interval}s"))
        while True:
            try:
                info = update_rates_once()
                self.stdout.write(self.style.SUCCESS(str(info)))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"update failed: {e}"))
            time.sleep(interval)
