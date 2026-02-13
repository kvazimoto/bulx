import './OurPartners.css'
import LinksForRules from '../../main_components/LinksForRules/LinksForRules'
import PartnersItem from '../../main_components/PartnersItem/PartnersItem'
import img1 from '../../assets/images/partners/glazok.png'


const data = [
    { name: 'Bits.media', image: img1},
    { name: 'Exnode - Мониторинг обменников', image: img1},
]

const OurPartners = () => {
    return (
        <section className='exchange-rulls-section exchange-rulls-section-default'>
            <LinksForRules 
                items={[
                    { name: "Правила обмена", to: "/terms_and_conditions" },
                    { name: "AML / KYC", to: "/aml-policy" },
                    { name: "Политика конфиденциальности", to: "/privacy-policy" },
                    {/*{ name: "Наши партнёры", to: "/our-partners" }, */}
                ]}
                title='Документы'
            />

            <div className="exchange-rulls-section-content">
                <h1>Наши партнеры</h1>

                <div className="exchange-rulls-section-content-container-partners">
                    {data.map((d, i) => (
                        <PartnersItem
                            key={i}
                            name={d.name}
                            image={d.image}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default OurPartners