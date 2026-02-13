import './LinksForRules.css'
import { Link, useLocation } from 'react-router-dom'


const LinksForRules = ({ items, title }) => {
    const { pathname } = useLocation();
    const isActive = (path) => pathname === path;

    return(
        <div className="links-for-rules">
            <h1>{ title }</h1>
            <ul>
                {items.map((item, i) => (
                    <li className={isActive(item.to) ? "media-menu-fixed-links-active-rules" : ""} key={i}>
                        <Link to={item.to}>{item.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default LinksForRules