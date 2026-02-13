import './PartnersItem.css'

const PartnersItem = ({ name, image }) => {
    return (
        <div className="partners-item-container">

            <div className="partners-item-container-left">
                <img src={image} alt="" />
            </div>

            <div className="partners-item-container-right">
                <h3>{ name }</h3>
                <p>Monitoring</p>
            </div>
            
        </div>
    )
}

export default PartnersItem