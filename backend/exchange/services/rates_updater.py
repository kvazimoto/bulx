import json
from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime
import requests
from django.utils import timezone
from django.db import transaction

from exchange.models import Currency, RateCache  # поправь импорт под свой путь


BINANCE_BASE_URL = "https://api.binance.com"  # можно заменить на https://data-api.binance.vision
NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange"


@dataclass
class RatePoint:
    base: str
    quote: str
    rate: Decimal
    source: str


def fetch_binance_prices(symbols: list[str]) -> dict[str, Decimal]:
    """
    symbols: ["BTCUSDT","ETHUSDT",...]
    returns: {"BTCUSDT": Decimal("..."), ...}
    """
    if not symbols:
        return {}

    params = {"symbols": json.dumps(symbols, separators=(",", ":"))}
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(
        f"{BINANCE_BASE_URL}/api/v3/ticker/price",
        params=params,
        headers=headers,
        timeout=10
    )
    r.raise_for_status()
    if r.status_code != 200:
        print("BINANCE_ERR", r.status_code, r.text)
    data = r.json()

    out: dict[str, Decimal] = {}
    for item in data:
        sym = item["symbol"]
        out[sym] = Decimal(item["price"])
    return out


def fetch_usd_uah_rate() -> Decimal:
    today = datetime.utcnow().strftime("%Y%m%d")
    params = {"valcode": "USD", "date": today, "json": ""}  # ?json без значения тоже ок
    r = requests.get(NBU_URL, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    # ожидаем массив из 1 элемента
    return Decimal(str(data[0]["rate"]))


@transaction.atomic
def write_rate_points(points: list[RatePoint]) -> None:
    now = timezone.now()

    # заранее получим Currency по code
    codes = set()
    for p in points:
        codes.add(p.base)
        codes.add(p.quote)

    currencies = {}
    for c in Currency.objects.filter(code__in=codes):
        currencies.setdefault(c.code, []).append(c)
    missing = [c for c in codes if c not in currencies]
    if missing:
        raise RuntimeError(f"Missing Currency rows for: {missing}")

    for p in points:
        base_list = currencies.get(p.base, [])
        quote_list = currencies.get(p.quote, [])

        for base_obj in base_list:
            for quote_obj in quote_list:
                RateCache.objects.update_or_create(
                    base=base_obj,
                    quote=quote_obj,
                    defaults={"rate": p.rate, "source": p.source, "updated_at": now},
                )

def update_rates_once() -> dict:
    """
    1) crypto/USDT from Binance
    2) USDT/UAH from NBU USD/UAH
    """
    # активные крипты (не фиат), кроме USDT (она будет базой)
    cryptos = list(
        Currency.objects.filter(is_active=True, is_fiat=False)
        .exclude(code="USDT")
        .values_list("code", flat=True)
        .distinct()
    )

    # 1) Binance prices COINUSDT
    symbols = list({f"{c}USDT" for c in cryptos})
    prices = fetch_binance_prices(symbols)

    points: list[RatePoint] = []
    for c in cryptos:
        sym = f"{c}USDT"
        if sym in prices:
            points.append(RatePoint(base=c, quote="USDT", rate=prices[sym], source="binance"))

    # 2) NBU USD/UAH -> считаем USDT/UAH
    usd_uah = fetch_usd_uah_rate()
    points.append(RatePoint(base="USDT", quote="UAH", rate=usd_uah, source="nbu"))

    write_rate_points(points)

    return {
        "updated": len(points),
        "cryptos": len(cryptos),
        "binance_symbols": len(symbols),
        "ts": timezone.now().isoformat(),
    }
