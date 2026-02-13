import { useTranslation } from 'react-i18next';
import './MediaMenu.css'
import { Link, useLocation } from 'react-router-dom'


const MediaMenu = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isActive = (path) => pathname === path;

    return (
        <section className={`media-menu-fixed ${isOpen ? "media-menu-fixed-active" : ""}`}>

            <div className="media-menu-fixed-close-btn" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="img" width="14" height="14"><path fill="currentColor" fill-rule="evenodd" d="M4.957 20.457a1 1 0 1 1-1.414-1.414L10.586 12 3.543 4.957a1 1 0 0 1 1.414-1.414L12 10.586l7.043-7.043a1 1 0 1 1 1.414 1.414L13.414 12l7.043 7.043a1 1 0 1 1-1.414 1.414L12 13.414z" clip-rule="evenodd"></path></svg>
            </div>

            <div className="media-menu-fixed-links">
                <ul>
                    <li className={isActive("/") ? "media-menu-fixed-links-active" : ""}>
                        <Link onClick={onClose} to="/">{t('exchange')}</Link>
                    </li>
                    <li className={isActive("/terms_and_conditions") ? "media-menu-fixed-links-active" : ""}>
                        <Link onClick={onClose} to="/terms_and_conditions">{t('exchange_rules')}</Link>
                    </li>
                    <li className={isActive("/faq") ? "media-menu-fixed-links-active" : ""}>
                        <Link onClick={onClose} to="/faq">FAQ</Link>
                    </li>
                    <li className={isActive("/partners") ? "media-menu-fixed-links-active" : ""}>
                        <Link onClick={onClose} to="/partners">{t('partners')}</Link>
                    </li>
                    <li className={isActive("/contacts") ? "media-menu-fixed-links-active" : ""}>
                        <Link onClick={onClose} to="/contacts">{t('contacts')}</Link>
                    </li>
                </ul>
            </div>

        </section>
    )
}

export default MediaMenu