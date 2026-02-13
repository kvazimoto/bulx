import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../api/api";
import { fmtRate, fmtAmount } from "../../utils/num";
import { useTranslation } from "react-i18next";
import svg1 from '../../assets/svg/btn.svg'
import svg2 from '../../assets/svg/arrows.svg'
import CurrencyModal from "../../components/CurrencyModal/CurrencyModal";
import { absUrl } from "../../config";
import './ExchangePage.css'
import svg3 from '../../assets/svg/arrow_change.svg'


function getClientId() {
  const key = "client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function formatCardInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function ExchangePage() {
  const { t } = useTranslation();

  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState("");


  const nav = useNavigate();
  const clientId = useMemo(() => getClientId(), []);

  const [currs, setCurrs] = useState([]);
  const [fromCode, setFromCode] = useState(null); // теперь тут id
  const [toCode, setToCode] = useState(null);     // теперь тут id

  const [amountFrom, setAmountFrom] = useState("10");
  const [quote, setQuote] = useState(null);

  const [amountTo, setAmountTo] = useState("");
  const [lastEdited, setLastEdited] = useState("from"); // "from" | "to"

  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [walletToReceive, setWalletToReceive] = useState("");

  const [fullName, setFullName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const [agreeService, setAgreeService] = useState(false);
  const [agreeCheck, setAgreeCheck] = useState(false);

  // Визуальный таймер + триггер автообновления курса
  const [secLeft, setSecLeft] = useState(30);
  const [rateTick, setRateTick] = useState(0);

  const [formError, setFormError] = useState("");

  const [modal, setModal] = useState({ open: false, side: "from" });

  const openFromModal = () => setModal({ open: true, side: "from" });
  const openToModal = () => setModal({ open: true, side: "to" });

  const pickCurrency = (id) => {
    if (modal.side === "from") setFromCode(id);
    else setToCode(id);
    setModal({ open: false, side: "from" });
  };


  // init chat (чтобы order create не падал)
  useEffect(() => {
    api.post("/chats/init/", { client_id: clientId }).catch(() => {});
  }, [clientId]);

  // load currencies
  useEffect(() => {
    (async () => {
      const { data } = await api.get("/currencies/");
      setCurrs(data);
    })();
  }, []);

  const [didInit, setDidInit] = useState(false);

  useEffect(() => {
    if (didInit) return;
    if (!currs.length) return;

    const defFrom = currs.find(c => c.code === "USDT") || currs[0];
    const defTo = currs.find(c => c.code === "UAH") || currs[0];

    setFromCode(defFrom?.id ?? null);
    setToCode(defTo?.id ?? null);
    setDidInit(true);
  }, [currs, didInit]);

  // определяем, получаем ли фиат
  const toCur = currs.find((c) => c.id === toCode);
  const fromCur = currs.find((c) => c.id === fromCode);

  const toIsFiat = !!toCur?.is_fiat;

  const fromBg = fromCur?.background || "#ffffff";
  const toBg = toCur?.background || "#ffffff";

  const fromBgImg = fromCur?.background_image || "#ffffff";
  const toBgImg = toCur?.background_image || "#ffffff";


  // секундный таймер: 30→0→30, и на 0 триггерим обновление rateTick
  useEffect(() => {
    const id = setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          setRateTick((x) => x + 1); // каждые 30 сек обновляем курс
          return 30;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // quote with debounce:
  // - срабатывает сразу при смене пары/amountFrom
  // - и срабатывает каждые 30 сек через rateTick
  useEffect(() => {
    if (fromCode == null || toCode == null || fromCode === toCode) {
      setQuote(null);
      return;
    }

    // Пока MVP: считаем только от amountFrom (lastEdited="from")
    if (!amountFrom || Number(amountFrom) <= 0) {
      setQuote(null);
      return;
    }

    const t = setTimeout(async () => {
      try {
        console.log("QUOTE_REQUEST", new Date().toLocaleTimeString(), { fromCode, toCode, amountFrom, rateTick });
        const promoQ = promo.trim().toUpperCase();
        const { data } = await api.get(
          `/quote/?from_id=${fromCode}&to_id=${toCode}&amount_from=${encodeURIComponent(amountFrom)}&promo=${encodeURIComponent(promoQ)}`
        );

        setQuote(data);
        if (promoQ && data.promo_applied === false) setPromoError('Промокод не знайдено або він закінчився');
        else setPromoError("");
        const minUsd = 1000;
        const usdValue = Number(data.amount_from_usdt ?? data.usd_value ?? 0);
        setAmountTo(fmtAmount(data.amount_to, { isFiat: toIsFiat }));
      } catch (e) {
        setQuote(null);
        setPromoError("");
      }
    }, 400);

    return () => clearTimeout(t);
  }, [fromCode, toCode, amountFrom, rateTick, toIsFiat, promo]);

  const swap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!agreeService || !agreeCheck) {
      setFormError('Потрібно поставити обидві галочки')
      return;
    }
    if (!quote) {
      setFormError('Немає курсу для розрахунку')
      return;
    }

    try {
      const payload = {
        client_id: clientId,
        from_currency_id: fromCode,
        to_currency_id: toCode,
        amount_from: String(quote.amount_from),
        amount_to: String(quote.amount_to),
        email,
        telegram,

        wallet_to_receive: toIsFiat ? null : walletToReceive,
        recipient_full_name: toIsFiat ? fullName : "",
        recipient_card_number: toIsFiat ? cardNumber : "",

        agree_service: true,
        agree_check: true,

        promo_code: promo.trim().toUpperCase(),
      };
      
      console.log("ORDER_PAYLOAD", payload);

      const { data } = await api.post("/orders/", payload);
      nav(`/order/${data.public_id}`);
    } catch (err) {
      console.log("CREATE_ORDER_ERR", err?.response?.status, err?.response?.data);
      const msg =
        err?.response?.data?.amount_from?.[0] ||
        err?.response?.data?.detail ||
        "Помилка створення заявки";
      setFormError(msg);
    }
  };

  useEffect(() => {
    if (!fromCur || !toCur) {
      setFormError("Выберите валюты");
    } else if (formError === "Выберите валюты") {
      setFormError("");
    }
  }, [fromCur, toCur]);

  return (
    <section className="exchange-page-section section-default-padding">
      <div className="exchange-page-section-title">
        <h1>{t('online_cryptocurrency_exchanger')}</h1>
        <div className="exchange-page-section-title-24">

          <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10.5" cy="10.5" r="9.5" stroke="white" stroke-width="2"/>
            <path d="M10 6V12L13 13" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>

          <span>24/7</span>

        </div>
      </div>

      <div className="exchange-page-section-form-container">

        <form onSubmit={onSubmit} className="exchange-page-section-form-container-form">

          <div className="exchange-page-section-form-container-form-left">
              
              <h1 className="exchange-page-section-form-container-form-left-title">{t('exchange')}</h1>
              
              <div className="wrapper-for-steps">
                <p className="step-number step-number1">1</p>
                <div className="exchange-page-section-form-container-form-left-box exchange-page-section-form-container-form-left-box1" style={{ background: fromBg }}>
                
                  <div className="exchange-page-section-form-container-form-left-box-content">

                    <label>{/* Отдаёте */}</label>

                    <button type="button" onClick={openFromModal} className="currency-picker-btn">

                      <div className="currency-picker-btn-left-side">
                        <div className="currency-picker-btn-img-con" style={{ background: fromBgImg }}>
                          {fromCur?.image ? <img src={absUrl(fromCur.image)} alt={fromCur.code}/> : null}
                        </div>

                        <div className="currency-picker-btn-left-side-text-con">
                          <div>
                            <p>{fromCur?.code || toCode}</p>
                          </div>
                          {fromCur?.description ? (
                            <div className="currency-picker-btn-left-side-text-con-descr">{fromCur.description}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="currency-picker-btn-right-side">
                          <img src={svg3} alt="" />
                      </div>

                    </button>
                    <input className="exchange-page-section-form-container-form-input" value={amountFrom} onChange={(e) => { setLastEdited("from"); setAmountFrom(e.target.value); }} placeholder={t('amount')} />
                  </div>
          
                </div>
              </div>

              <button className="exchange-page-section-form-container-form-swap-btn" type="button" onClick={swap}>
                <img className="exchange-page-section-form-container-form-swap-btn-arr1" src={svg1} alt="" />
                <img className="exchange-page-section-form-container-form-swap-btn-arr" src={svg2} alt="" />
              </button>

              <div className="wrapper-for-steps">
                <p className="step-number step-number2">2</p>
                <div className="exchange-page-section-form-container-form-left-box exchange-page-section-form-container-form-left-box2" style={{ background: toBg }}>
                  
                  <div className="exchange-page-section-form-container-form-left-box-content">

                    <label>{/* Получаете */}</label>

                    <button type="button" onClick={openToModal} className="currency-picker-btn">
                      <div className="currency-picker-btn-left-side">
                        <div className="currency-picker-btn-img-con" style={{ background: toBgImg }}>
                          {toCur?.image ? <img src={absUrl(toCur.image)} alt={toCur.code}/> : null}
                        </div>

                        <div className="currency-picker-btn-left-side-text-con">
                          <div>
                            <p>{toCur?.code || toCode}</p>
                          </div>
                          {toCur?.description ? (
                            <div className="currency-picker-btn-left-side-text-con-descr">{toCur.description}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="currency-picker-btn-right-side">
                          <img src={svg3} alt="" />
                      </div>
                      
                    </button>

                    <input className="exchange-page-section-form-container-form-input" value={amountTo}onChange={(e) => { setLastEdited("to"); setAmountTo(e.target.value); }} readOnly placeholder={t('calculated')}/>

                  </div>
          
                </div>
              </div>           
              

          </div>

          <div className="exchange-page-section-form-container-form-right">
            <p className="step-number">3</p>
            <h1>{t('exchange_data')}</h1>

            <div className="exchange-page-section-form-container-form-right-container">
                
                {quote && (
                  <div className="exchange-page-section-form-container-form-right-container-qoute-con">

                    <div className="exchange-page-section-form-container-form-right-container-qoute">
                      <p>
                        {t('current_rate')}: 1 {fromCur?.code} ≈ {fmtAmount(quote.rate, { isFiat: toIsFiat })} {toCur?.code}
                      </p>

                      {/*
                        (комиссия {quote.fee_pct}%)
                        {" "}— обновление через 
                      */}
                      <span className="exchange-page-section-form-container-form-right-container-qoute-timer" style={{ "--p": secLeft / 30 }}>
                        {secLeft}
                      </span>
                        
                    </div>
                     <p>({t('fee')} {Number(quote.fee_pct)}%)</p>

                  </div>
                )}

               

                <div className="exchange-page-section-form-container-form-right-container-input-con">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"/>
                  <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="Telegram (@...)"/>
                  {toIsFiat ? (
                    <>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('full_name')}/>
                      <input value={cardNumber} onChange={(e) => setCardNumber(formatCardInput(e.target.value))} placeholder={t('card_number')}/>
                    </>
                  ) : (
                    <input value={walletToReceive} onChange={(e) => setWalletToReceive(e.target.value)} placeholder={t('receiving_wallet')}/>
                  )}
                  {promoError && (
                    <div style={{ fontSize: 12, color: '#ac0707' }}>
                      {promoError}
                    </div>
                  )}
                  <input value={promo} onChange={(e) => {setPromo(e.target.value); setPromoError("");}} placeholder={t('promo_code_optional')}/>
                </div>

                <div className="exchange-page-section-form-container-form-right-container-label-con">

                  <label>
                    <input type="checkbox" checked={agreeService} onChange={(e) => setAgreeService(e.target.checked)}/>
                    {" "}
                    {t('i_agree_with')}{" "}<Link to="/terms_and_conditions">{t('terms_and_rules')}</Link>
                  </label>

                  <label>
                    <input type="checkbox" checked={agreeCheck} onChange={(e) => setAgreeCheck(e.target.checked)}/>
                    {" "}
                    {t('i_agree_with')}{" "}<Link to="/aml-policy">{t('aml_kyt_terms')}</Link>
                  </label>

                  {formError && (
                    <div className="error-text-form">
                      {formError}
                    </div>
                  )}

                </div>
                
                <button type="submit">{t('start_exchange')}</button>

            </div>
              
          </div>

        </form>

      </div>

      <CurrencyModal
        open={modal.open}
        title={modal.side === "from" ? "Выберите валюту (отдаёте)" : "Выберите валюту (получаете)"}
        items={currs}
        onPick={pickCurrency}
        onClose={() => setModal({ open: false, side: "from" })}
      />

    </section>
  );
}
