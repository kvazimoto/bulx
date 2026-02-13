import './OrderPage.css'
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Link } from 'react-router-dom';
import { api } from "../../api/api";
import ChatPanel from "../../chat/ChatPanel/ChatPanel";
import { absUrl } from '../../config';
import { useTranslation } from 'react-i18next';

function msLeft(iso) {
    if (!iso) return 0
    const t = new Date(iso).getTime()
    return Math.max(0, t - Date.now())
}

function trimZeros(numStr) {
  if (numStr == null) return "";
  const s = String(numStr);

  // если нет точки — ничего не делаем
  if (!s.includes(".")) return s;

  // убираем хвостовые нули
  const noTail = s.replace(/0+$/, "");
  // если точка стала последним символом — убираем точку
  return noTail.replace(/\.$/, "");
}


function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function fmtDuration(sec) {
  sec = Math.max(0, sec | 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const parts = [];
  if (h > 0) parts.push(`${h} ${plural(h, "година", "години", "години")}`);
  if (m > 0) parts.push(`${m} ${plural(m, "хвилина", "хвилина", "хвилина")}`);
  if (s > 0 || parts.length === 0) parts.push(`${s} ${plural(s, "секунда", "секунда", "секунда")}`);
  return parts.join(" ");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}


function renderRequisites(req) {
  if (!req) return null;

  if (typeof req === "string") {
    return <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{req}</pre>;
  }

  if (typeof req === "object") {
    const rows = [
      req.card && ["Карта", req.card],
      req.recipient && ["Одержувач", req.recipient],
      req.bank && ["Банк", req.bank],
      req.bip && ["IBAN", req.bip],
      req.comment && ["Коментар", req.comment],
    ].filter(Boolean);

    return (
      <div className='order-page-con-for-req'>
        {rows.map(([label, value]) => (
          <div className='order-page-con-for-req-item' key={label}>
            <p><b>{label}:</b> {value}</p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default function OrderPage() {
    const { t } = useTranslation()
    const { publicId } = useParams()
    const [ order, setOrder ] = useState(null)
    const [ err, setErr ] = useState(null)

    useEffect(() => {
        let timer;

        const load = async () => {
            try {
                const { data } = await api.get(`/orders/${publicId}/`)
                setOrder(data)
                setErr(null)
            } catch (e) {
                setErr(e)
            }
        }

        load()
        timer = setInterval(load, 3000)
        return () => clearInterval(timer)
    }, [publicId])

    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((x) => x + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const timeLeftSec = useMemo(() => {
        if (!order) return 0;
        const deadline =
        order.status === "PROCESSING" && order.processing_expires_at
            ? order.processing_expires_at
            : order.expires_at;
        return Math.floor(msLeft(deadline) / 1000);
    }, [order, tick]);

    const onPaid = async () => {
        try {
        await api.post(`/orders/${publicId}/paid/`);
        // после paid polling сам подтянет новый статус
        } catch (e) {
            console.error(e);
            alert("Не удалось отметить оплату");
        }
    };

    if (err) return <div>Помилка завантаження заявки</div>;
    if (!order) return <div>Завантаження...</div>;

    const showActiveUI = order.status === "WAITING" || order.status === "PROCESSING";
    const orderWaiting = order.status === "WAITING"
    const orderProcessing = order.status === "PROCESSING";
    const orderReject = order.status === "CANCELED"
    const orderExpired = order.status === "EXPIRED"
    const orderDone = order.status === "DONE"

    return (

        <section className='order-page-section section-default-padding'>      

            <Link className='order-page-section-back-btn' to={'/'}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 25" role="img" width="24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12.5H5M12 19.325 5 12.5l7-6.825"></path>
            </svg>    
            </Link>

            <div className="order-page-section-top-text">
                <h2 className='order-page-section-code'>{t('application')} #{order.public_id}</h2>
                {orderWaiting ? <h1>{t('follow_instructions')}:</h1> : null}
                {orderProcessing ? <h1>{t('order_processing')}</h1> : null}
                {orderReject ? <h1>{t('has_been_rejected')}</h1> : null}
                {orderExpired ? <h1>{t('is_overdue')}</h1> : null}
                {orderDone ? <h1>{t('has_been_completed')}</h1> : null}
            </div>

            {!order.verified 
                ?
                    <>
                        <div className="order-page-section-order-info">
                            <div className="order-page-section-order-info-left order-page-section-order-info-item">
                                <p>Отдаёте</p>
                                <img src={absUrl(order.from_currency_image)} alt="" />
                                <p><span>{trimZeros(order.amount_from)}</span> {order.from_currency}</p>
                            </div>
                            <div className="order-page-section-order-info-center order-page-section-order-info-item">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 12" role="img" width="12"><path fill="currentColor" d="m0 0 6 3.709L12 0 8.291 6 12 12 6 8.291 0 12l3.709-6z"></path></svg>
                            </div>
                            <div className="order-page-section-order-info-right order-page-section-order-info-item">
                                <p>Получаете</p>
                                <img src={absUrl(order.to_currency_image)} alt="" />
                                <p><span>{trimZeros(order.amount_to)}</span> {order.to_currency}</p>
                            </div>
                        </div>

                        <div className="order-page-section-order-kyt">
                            <p>{t('kyt_check_notice')}</p>
                            <a href="#">{t('more_details')}</a>
                        </div>

                        <div className="order-page-section-order-verify">
                            <h1>{t('card_verification')}</h1>

                            <p>
                                {t('for_security_purposes')}
                            </p>

                            <a href="#">{t('Go to verification')}</a>
                        </div>
                    </>
                :
                    <>
                        {showActiveUI && (
                            <>
                                <div className='order-page-section-timer'>
                                    <p>{t('pay_order_within')} </p> <b>{fmtDuration(timeLeftSec)}</b>
                                </div>
                            </>
                        )}
                        <div className="order-page-section-status-container">
                            <div className='order-page-section-status'>
                                {order.status === "EXPIRED" 
                                    ?
                                        <span>{t('the_application_has_expired')}</span>
                                    :
                                        <span>
                                            {t('step')}
                                            {" "}
                                            {order.step_current ? `${order.step_current}/${order.steps_total}` : ""}
                                        </span> 
                                }
                                {order.status === "DONE" 
                                    ?
                                        <span>{t('the_request_has_been_completed')}</span>
                                    :
                                        null
                                }         
                            </div>

                            <div>
                                <div style={{ height: 8, background: "#eee", borderRadius: 999 }}>
                                    <div
                                    style={{
                                        height: 8,
                                        width: `${order.progress_pct || 0}%`,
                                        background: "#111",
                                        borderRadius: 999,
                                        transition: "width 200ms",
                                    }}
                                    />
                                </div>
                            </div>
                            {!showActiveUI ? <p>Ми опрацюємо вашу заявку <br /> після зарахування коштів на наш рахунок</p> : <p>Ми опрацюємо вашу заявку <br /> після зарахування коштів на наш рахунок</p>}
                            
                        </div>

                        <div className="order-page-section-order-info">
                            <div className="order-page-section-order-info-left order-page-section-order-info-item">
                                <p>{t('give')}</p>
                                <img src={absUrl(order.from_currency_image)} alt="" />
                                <p><span>{trimZeros(order.amount_from)}</span> {order.from_currency}</p>
                            </div>
                            <div className="order-page-section-order-info-center order-page-section-order-info-item">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 12" role="img" width="12"><path fill="currentColor" d="m0 0 6 3.709L12 0 8.291 6 12 12 6 8.291 0 12l3.709-6z"></path></svg>
                            </div>
                            <div className="order-page-section-order-info-right order-page-section-order-info-item">
                                <p>{t('get')}</p>
                                <img src={absUrl(order.to_currency_image)} alt="" />
                                <p><span>{trimZeros(order.amount_to)}</span> {order.to_currency}</p>
                            </div>
                        </div>

                        <div className="order-page-section-order-kyt">
                            <p>{t('kyt_check_notice')}</p>
                            <a href="#">{t('more_details')}</a>
                        </div>

                        <div className="order-page-section-order-main-steps">

                            {!order.can_press_paid ? null :

                            <>
                            <div className="order-page-section-order-main-steps-sep1">

                                <div className="order-page-section-order-main-steps-sep1-con">
                                    <div className="order-page-section-order-main-steps-sep1-left">
                                        <p>1</p>
                                    </div>

                                    <div className="order-page-section-order-main-steps-sep1-right">

                                        <div className="order-page-section-order-main-steps-sep1-right-text">
                                            <p>{t('you_need_to_send')} <span>{trimZeros(order.amount_from)}</span> {order.from_currency} {order.has_requisites ? t('to_banking_below') : t('to_address_below')}</p>
                                        </div>
                                        <div className="order-page-section-order-main-steps-sep1-right-wallet">

                                                {order.has_requisites 
                                                    ?
                                                        <div className="fgasfqw">
                                                            {renderRequisites(order.requisites)}
                                                        </div>
                                                    :
                                                    <button type="button" onClick={() => copyText(order.selected_wallet_address)}>
                                                        <p>{order.has_requisites ? t('requisites') : t('wallet')}</p>
                                                        <div className="fgasfqw">
                                                            <code>{order.selected_wallet_address}</code>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 19 21" role="img" class="flex-shrink-0" width="16">
                                                                <path fill="currentColor" fill-rule="evenodd" d="M12.375.198H8.488c-1.762 0-3.157 0-4.248.147-1.124.151-2.033.47-2.75 1.187S.454 3.158.303 4.282C.156 5.373.156 6.768.156 8.53v5.804a3.595 3.595 0 0 0 3.034 3.55c.132.732.385 1.357.894 1.866.577.577 1.303.825 2.166.94.83.112 1.887.112 3.197.112h2.98c1.311 0 2.368 0 3.199-.111.862-.116 1.588-.364 2.165-.941s.825-1.303.941-2.166c.112-.83.112-1.887.112-3.198V9.49c0-1.31 0-2.367-.112-3.197-.116-.863-.364-1.59-.94-2.166-.51-.509-1.135-.762-1.867-.894a3.595 3.595 0 0 0-3.55-3.034m2.04 2.896a2.16 2.16 0 0 0-2.04-1.458H8.542c-1.828 0-3.126.001-4.11.134-.965.13-1.52.372-1.926.778s-.649.961-.778 1.925c-.133.985-.134 2.283-.134 4.11v5.75c0 .947.61 1.751 1.458 2.041-.02-.584-.02-1.245-.02-1.988V9.49c0-1.31 0-2.367.11-3.197.117-.863.365-1.59.942-2.166.577-.577 1.303-.825 2.166-.941.83-.112 1.887-.112 3.197-.112h2.98c.743 0 1.404 0 1.989.02M5.1 5.142c.266-.265.638-.438 1.341-.532.724-.098 1.683-.1 3.059-.1h2.875c1.376 0 2.335.002 3.059.1.703.094 1.075.267 1.34.532.266.266.439.638.533 1.341.098.724.1 1.683.1 3.059v4.792c0 1.375-.002 2.335-.1 3.059-.094.703-.267 1.075-.532 1.34-.266.266-.638.439-1.341.533-.724.097-1.683.099-3.059.099H9.5c-1.376 0-2.335-.002-3.059-.099-.703-.094-1.075-.267-1.34-.533-.266-.265-.439-.637-.533-1.34-.098-.724-.1-1.684-.1-3.06V9.543c0-1.376.002-2.335.1-3.059.094-.703.267-1.075.532-1.34" clip-rule="evenodd"></path>
                                                            </svg>
                                                        </div>
                                                    </button>
                                                }
                                                
                                        </div>
                                        <div className="order-page-section-order-main-steps-sep1-right-qr">
                                            {order.wallet_qr_code && (
                                                <img src={absUrl(order.wallet_qr_code)} alt="QR"/>
                                            )}
                                        </div>
                                        <div className="order-page-section-order-main-steps-sep1-right-amount">
                                            <button type="button" onClick={() => copyText(trimZeros(order.amount_from))}>
                                                <p>{t('amount_label')}</p>
                                                <div className="fgasfqw">
                                                    {trimZeros(order.amount_from)} {order.from_currency}
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 19 21" role="img" class="flex-shrink-0" width="16"><path fill="currentColor" fill-rule="evenodd" d="M12.375.198H8.488c-1.762 0-3.157 0-4.248.147-1.124.151-2.033.47-2.75 1.187S.454 3.158.303 4.282C.156 5.373.156 6.768.156 8.53v5.804a3.595 3.595 0 0 0 3.034 3.55c.132.732.385 1.357.894 1.866.577.577 1.303.825 2.166.94.83.112 1.887.112 3.197.112h2.98c1.311 0 2.368 0 3.199-.111.862-.116 1.588-.364 2.165-.941s.825-1.303.941-2.166c.112-.83.112-1.887.112-3.198V9.49c0-1.31 0-2.367-.112-3.197-.116-.863-.364-1.59-.94-2.166-.51-.509-1.135-.762-1.867-.894a3.595 3.595 0 0 0-3.55-3.034m2.04 2.896a2.16 2.16 0 0 0-2.04-1.458H8.542c-1.828 0-3.126.001-4.11.134-.965.13-1.52.372-1.926.778s-.649.961-.778 1.925c-.133.985-.134 2.283-.134 4.11v5.75c0 .947.61 1.751 1.458 2.041-.02-.584-.02-1.245-.02-1.988V9.49c0-1.31 0-2.367.11-3.197.117-.863.365-1.59.942-2.166.577-.577 1.303-.825 2.166-.941.83-.112 1.887-.112 3.197-.112h2.98c.743 0 1.404 0 1.989.02M5.1 5.142c.266-.265.638-.438 1.341-.532.724-.098 1.683-.1 3.059-.1h2.875c1.376 0 2.335.002 3.059.1.703.094 1.075.267 1.34.532.266.266.439.638.533 1.341.098.724.1 1.683.1 3.059v4.792c0 1.375-.002 2.335-.1 3.059-.094.703-.267 1.075-.532 1.34-.266.266-.638.439-1.341.533-.724.097-1.683.099-3.059.099H9.5c-1.376 0-2.335-.002-3.059-.099-.703-.094-1.075-.267-1.34-.533-.266-.265-.439-.637-.533-1.34-.098-.724-.1-1.684-.1-3.06V9.543c0-1.376.002-2.335.1-3.059.094-.703.267-1.075.532-1.34" clip-rule="evenodd"></path></svg>
                                                </div>
                                            </button>
                                        </div>

                                    </div>
                                </div>
                                <p className='order-page-section-order-main-steps-sep1-footer'>{t('amount_mismatch_warning')}</p>

                            </div>
                            
                            <div className="order-page-section-order-main-steps-sep2">

                                <div className="order-page-section-order-main-steps-sep2-left">
                                    <p>2</p>
                                </div>

                                <div className="order-page-section-order-main-steps-sep2-right">
                                    <p>{t('confirm_payment_instruction')}</p>

                                    
                                        <button onClick={onPaid}>
                                            {t('i_have_paid')}
                                        </button>
                                    
                                </div>

                            </div>
                            </>
                            }

                        </div>

                        {/* Инструкции */}

                        {order.need_requisites && !order.has_requisites && (
                            <div className='requarement-waiting'>
                                <h3>{t('expect_banking_details')}</h3>
                                <p>{t('banking_details_will_appear_here_soon')}</p>
                            </div>
                        )}
                    </>
            }

            


            {/* <ChatPanel /> */}

        </section>
    )
}