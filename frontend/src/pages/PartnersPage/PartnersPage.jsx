import './PartnersPage.css'
import img from '../../assets/images/partners-ps.png'
import { useTranslation } from 'react-i18next'

const PartnersPage = () => {
    const { t } = useTranslation()
    return(
        <section className="partners-page-sectionn">
            <h1>{t('for_partners')}</h1>

            <div className="partners-page-sectionn-box-con">

                <div className="partners-page-sectionn-box-con-top">

                    <div className="partners-page-sectionn-box-con-top-item">
                        <span>{t('loyalty_program')}</span>
                        <h3>{t('referral_program')}</h3>
                        <p>{t('client_acquisition_motivation_system')}. {t('become_partner_today')}.</p>
                        <a href="#">{t('connect')}</a>
                    </div>

                    <div className="partners-page-sectionn-box-con-top-item">
                        <span>{t('payment_acceptance')}</span>
                        <h3>{t('for_monitorings')}</h3>
                        <p>{t('monitoring_cooperation_invite')}</p>
                        <a href="#">{t('connect')}</a>
                    </div>

                </div>

                <div className="partners-page-sectionn-box-con-bottom">
                    <img src={img} alt="" />
                    <h1>{t('connect_payment_acceptance')}</h1>
                    <p>{t('payment_fees')}</p>
                    <a href="#">{t('connect')}</a>
                </div>

            </div>

        </section>
    )
}

export default PartnersPage