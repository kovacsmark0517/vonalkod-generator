import Barcode from 'react-barcode';
import './BarcodeComponent.css';

function BarcodeComponent({ value, format }) {
    return (
        <div className="barcode-graphic" role="img" aria-label={`Vonalkód: ${value}`}>
            <Barcode value={value} format={format} />
        </div>
    );
}

export default BarcodeComponent;
