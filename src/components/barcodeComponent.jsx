import Barcode from 'react-barcode';
import './BarcodeComponent.css';

function BarcodeComponent({ value }) {
    return (
        <div className="barcode-graphic" role="img" aria-label={`Vonalkód: ${value}`}>
            <Barcode value={value} format="CODE128" />
        </div>
    );
}

export default BarcodeComponent;
