import './Header.css'
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const Header = () => {
    const { i18n } = useTranslation();
    const { t } = useTranslation()

    const setLang = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem("lang", lng);
    };

    return(
        <>
            <header className="main-header">
                <div className="header-logo">
                    <Link to={'/'}>
                        <svg viewBox="0 0 90 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M31.1274 3.89082L34.9478 0L45.6726 10.8387C47.8557 13.062 48.5921 15.8612 47.5006 17.7866L43.4073 21.9553C42.0974 23.2893 38.4953 23.067 37.4038 21.9553L30.0359 14.4516C29.8175 14.2293 28.6714 14.1737 28.3985 14.4516L17.756 25.2903L13.9355 21.3995L26.2154 8.89331C27.307 7.78164 31.1274 7.78164 32.2189 8.89331L39.8598 16.6749C40.733 17.5643 42.5886 15.5633 41.77 14.7295L31.1274 3.89082Z" fill="#101010"/>
                            <path d="M16.8728 3.89082L13.0524 0L2.32765 10.8387C0.144558 13.062 -0.591888 15.8612 0.499657 17.7866L4.59295 21.9553C5.90281 23.2893 9.50491 23.067 10.5965 21.9553L17.9644 14.4516C18.1827 14.2293 19.3288 14.1737 19.6017 14.4516L30.2443 25.2903L34.0647 21.3995L21.7848 8.89331C20.6933 7.78164 16.8728 7.78164 15.7813 8.89331L8.14048 16.6749C7.26724 17.5643 5.41161 15.5633 6.23027 14.7295L16.8728 3.89082Z" fill="#101010"/>
                            <path d="M54.39 21V5.4H59.85C61.5833 5.4 62.45 6.26667 62.45 8V10.08C62.45 10.4093 62.3937 10.7517 62.281 11.107C62.177 11.4623 61.995 11.7353 61.735 11.926V12.004C62.2117 12.342 62.45 12.927 62.45 13.759V18.387C62.45 20.1203 61.5833 20.987 59.85 20.987L54.39 21ZM56.99 18.387H59.85V13.2L56.99 13.213V18.387ZM56.99 10.6H59.85V8H56.99V10.6ZM68.6859 5.387L71.2859 5.4V18.4C71.2859 20.1333 70.4193 21 68.6859 21H65.8259C64.0926 21 63.2259 20.1333 63.2259 18.4V5.387H65.8259V18.4H68.6859V5.387ZM72.0619 21V5.4H74.6619V18.569L78.5619 18.4V21H72.0619ZM88.0947 5.4L85.3907 13.083L88.0947 21H85.2347L83.5967 14.5H83.4277L81.8027 21H78.9427L81.6467 13.083L78.9427 5.4H81.8027L83.4277 11.614H83.5967L85.2347 5.4H88.0947Z" fill="#101010"/>
                        </svg>
                    </Link>
                </div>
                <ul>
                    <li><Link to="/">{t('exchange')}</Link></li>
                    <li><Link to="/terms_and_conditions">{t('exchange_rules')}</Link></li>
                    <li><Link to="/faq">FAQ</Link></li>
                    <li><Link to="/partners">{t('partners')}</Link></li>
                    <li><Link to="/contacts">{t('contacts')}</Link></li>
                </ul>
                <div className='language-choice'>
                    <div className='language-choice-container'>
                        <button type="button" onClick={() => setLang("ua")}>UA</button>
                        <span>/</span>
                        <button type="button" onClick={() => setLang("en")}>EN</button>
                    </div>
                </div>
            </header>
        </>
    )
}

export default Header