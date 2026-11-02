import React, { useState } from 'react';
import './App.css';
import BarcodeComponent from './components/barcodeComponent';

function App() {
    const [value, setValue] = useState('');

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
                    {value && (
                        <button className="clear-button" type="button" onClick={() => setValue('')}>
                            Törlés
                        </button>
                    )}
                </div>

                <section className="preview" aria-label="Vonalkód előnézete" aria-live="polite">
                    {value ? <BarcodeComponent value={value} /> : <div className="empty-preview" aria-hidden="true" />}
                </section>
            </section>
        </main>
    );
}

export default App;