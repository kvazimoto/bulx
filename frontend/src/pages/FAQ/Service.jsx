import LinksForRules from "../../main_components/LinksForRules/LinksForRules";

const Service = () => {
    return(
        <section className='exchange-rulls-section exchange-rulls-section-default'>
            <LinksForRules 
                items={[
                    { name: "Загальні питання", to: "/faq" },
                    { name: "Сервіс", to: "/faq/service_questions" },
                    { name: "Заявка", to: "/faq/exchange_requests" },
                    { name: "Різне", to: "/faq/different_issues" },
                ]}
                title='Документи'
            />

            <div className="exchange-rulls-section-content">
                <h1>Сервіс</h1>
                <div className="exchange-rulls-section-content-container">
                    <ul>
                        <li className='exchange-rulls-section-content-container-title'>Режим роботи криптовалютного онлайн-обмінника BULX</li>
                        <li>Режим роботи bul-x.com: цілодобово, без вихідних.</li>
                        <li>Щоденні технічні перерви:</li>
                        <li>З 15:45 до 16:15 за київським часом (GMT +2).</li>
                        <li>З 23:30 до 00:00 за київським часом (GMT +2).</li>

                        <li>Технічна підтримка:</li>
                        <li>Працює з 8:00 до 00:00 за київським часом (GMT +2).</li>
                        <li>Автоматичний режим:</li>

                        <li>З 00:00 до 8:00 за київським часом (GMT +2) сайт працює повністю в автоматичному режимі.</li>
                        <li>Додаткові перерви:</li>
                        <li>Можливі у разі оновлення функціоналу системи. Повідомлення про такі перерви будуть завчасно розміщені на сайті в розділі «Новини» та в соціальних мережах.</li>
                        <li>Якщо у вас виникнуть додаткові запитання або знадобиться допомога, зверніться до служби технічної підтримки сервісу bul-x.com.</li>
                    </ul>

                    <ul>
                        <li className='exchange-rulls-section-content-container-title'>Де знайти реферальний код?</li>
                        <li>Для отримання реферального коду зверніться до чату підтримки на сайті або в Telegram.</li>
                    </ul>

                    <ul>
                        <li className='exchange-rulls-section-content-container-title'>Де я можу залишити відгук про роботу сервісу?</li>
                        <li>Ви можете залишити свій відгук на таких моніторингах:</li>
                        <li>- Bestchange </li>
                        <li>- TrustPilot</li>
                        <li>Також ви можете залишити відгук на форумах:</li>
                        <li>- Bits.Media</li>
                        <li>- BitcoinTalk</li>
                        <li>- MMGP</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

export default Service