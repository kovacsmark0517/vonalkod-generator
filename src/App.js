import React, { useEffect, useState } from 'react';
import './App.css';
import BarcodeComponent from './components/barcodeComponent';

const STORAGE_KEY = 'barcode-generator:saved-codes';

function App() {
    const [value, setValue] = useState('');
    const [savedBarcodes, setSavedBarcodes] = useState(() => {
        try {
            const storedBarcodes = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(storedBarcodes)
                ? Array.from(new Set(storedBarcodes.filter((barcode) => typeof barcode === 'string')))
                : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBarcodes));
        } catch {
            return;
        }
    }, [savedBarcodes]);

    const saveBarcode = () => {
        if (!value.trim()) return;
        setSavedBarcodes((current) => current.includes(value) ? current : [value, ...current]);
    };

    const deleteBarcode = (barcodeToDelete) => {
        setSavedBarcodes((current) => current.filter((barcode) => barcode !== barcodeToDelete));
    };

    return (
        <main className="app-shell">
            <header className="topbar">
                <span className="brand"><span className="brand-mark">B</span> BARCODE</span>
                <span className="topbar-note">GENERÁTOR <span className="status-dot" /></span>
            </header>

            <section className="workspace" aria-labelledby="page-title">
                <p className="eyebrow">CODE 128 <span aria-hidden="true">·</span> SZÖVEG</p>
                <h1 id="page-title">Vonalkód generátor</h1>

                <label className="input-label" htmlFor="barcode-value">Vonalkód értéke</label>
                <div className="input-row">
                    <input
                        id="barcode-value"
                        type="text"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="pl. ABC-12345"
                        autoComplete="off"
                    />
                    <button
                        className="save-button"
                        type="button"
                        onClick={saveBarcode}
                        disabled={!value.trim() || savedBarcodes.includes(value)}
                    >
                        Mentés
                    </button>
                    {value && (
                        <button className="clear-button" type="button" onClick={() => setValue('')}>
                            Törlés
                        </button>
                    )}
                </div>

                <section className="saved-section" aria-labelledby="saved-title">
                    <div className="saved-heading">
                        <h2 id="saved-title">Mentett vonalkódok</h2>
                        <span className="saved-count">{savedBarcodes.length}</span>
                    </div>
                    {savedBarcodes.length > 0 ? (
                        <ul className="saved-list">
                            {savedBarcodes.map((barcode) => (
                                <li className="saved-item" key={barcode}>
                                    <button
                                        className="saved-code"
                                        type="button"
                                        onClick={() => setValue(barcode)}
                                        aria-pressed={value === barcode}
                                    >
                                        {barcode}
                                    </button>
                                    <button
                                        className="delete-saved-button"
                                        type="button"
                                        onClick={() => deleteBarcode(barcode)}
                                        aria-label={`${barcode} törlése`}
                                        title="Vonalkód törlése"
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-saved">Még nincs mentett vonalkód.</p>
                    )}
                </section>

                <section className="preview" aria-label="Vonalkód előnézete" aria-live="polite">
                    {value ? <BarcodeComponent value={value} /> : <div className="empty-preview" aria-hidden="true" />}
                </section>
            </section>
        </main>
    );
}

export default App;