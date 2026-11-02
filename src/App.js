import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';
import BarcodeComponent from './components/barcodeComponent';

const STORAGE_KEY = 'barcode-generator:saved-codes';
const DEFAULT_FORMAT = 'CODE128';

const FORMAT_GROUPS = [
    {
        label: 'Általános',
        formats: [
            { value: 'CODE128', label: 'Code 128', hint: 'Számokhoz és ASCII-szöveghez. A legtöbb célra jó választás.' },
            { value: 'CODE128A', label: 'Code 128 A', hint: 'Nagybetűk, számok, írásjelek és vezérlőkódok.' },
            { value: 'CODE128B', label: 'Code 128 B', hint: 'Nyomtatható ASCII-szöveg kis- és nagybetűkkel.' },
            { value: 'CODE128C', label: 'Code 128 C', hint: 'Csak páros számú számjegyet adj meg.' },
            { value: 'CODE39', label: 'Code 39', hint: 'Nagybetűk, számok és - . $ / + % karakterek.' },
            { value: 'CODE93', label: 'Code 93', hint: 'Nagybetűk, számok és - . szóköz / + % karakterek.' },
            { value: 'CODE93FullASCII', label: 'Code 93 Full ASCII', hint: 'ASCII-karakterekhez, ékezetes és Unicode karakterek nélkül.' },
        ],
    },
    {
        label: 'EAN / UPC',
        formats: [
            { value: 'EAN13', label: 'EAN-13', hint: '12 számjegy esetén az ellenőrző számjegyet automatikusan hozzáadja; 13 számjegynél ellenőrzi.' },
            { value: 'EAN8', label: 'EAN-8', hint: '7 számjegy esetén az ellenőrző számjegyet automatikusan hozzáadja; 8 számjegynél ellenőrzi.' },
            { value: 'EAN5', label: 'EAN-5', hint: 'Pontosan 5 számjegyet adj meg.' },
            { value: 'EAN2', label: 'EAN-2', hint: 'Pontosan 2 számjegyet adj meg.' },
            { value: 'UPC', label: 'UPC-A', hint: '11 számjegy esetén az ellenőrző számjegyet automatikusan hozzáadja; 12 számjegynél ellenőrzi.' },
            { value: 'UPCE', label: 'UPC-E', hint: '6 számjegyet vagy érvényes, 8 számjegyű kódot adj meg.' },
        ],
    },
    {
        label: 'Ipari és egyéb',
        formats: [
            { value: 'codabar', label: 'Codabar', hint: 'Számok és - $ : . + / karakterek. A kezdő/záró A–D jelölés opcionális.' },
            { value: 'ITF', label: 'ITF', hint: 'Páros számú számjegyet adj meg.' },
            { value: 'ITF14', label: 'ITF-14', hint: '13 számjegy esetén az ellenőrző számjegyet automatikusan hozzáadja; 14 számjegynél ellenőrzi.' },
            { value: 'MSI', label: 'MSI', hint: 'Csak számjegyeket adj meg.' },
            { value: 'MSI10', label: 'MSI-10', hint: 'Csak számjegyeket adj meg.' },
            { value: 'MSI11', label: 'MSI-11', hint: 'Csak számjegyeket adj meg.' },
            { value: 'MSI1010', label: 'MSI-1010', hint: 'Csak számjegyeket adj meg.' },
            { value: 'MSI1110', label: 'MSI-1110', hint: 'Csak számjegyeket adj meg.' },
            { value: 'pharmacode', label: 'Pharmacode', hint: '3 és 131070 közötti egész számot adj meg.' },
        ],
    },
];

const FORMATS = FORMAT_GROUPS.flatMap((group) => group.formats);
const FORMATS_BY_VALUE = Object.fromEntries(FORMATS.map((format) => [format.value, format]));
const UPC_E_EXPANSIONS = ['XX00000XXX', 'XX10000XXX', 'XX20000XXX', 'XXX00000XX', 'XXXX00000X', 'XXXXX00005', 'XXXXX00006', 'XXXXX00007', 'XXXXX00008', 'XXXXX00009'];

const savedCodeId = ({ value, kind = 'barcode', format }) => `${kind}\u0000${format || ''}\u0000${value}`;

function readSavedBarcodes() {
    try {
        const storedBarcodes = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(storedBarcodes)) return [];

        const normalizedBarcodes = storedBarcodes.reduce((barcodes, savedBarcode) => {
            const storedCode = typeof savedBarcode === 'string'
                ? { value: savedBarcode, kind: 'barcode', format: DEFAULT_FORMAT }
                : savedBarcode;
            const kind = storedCode && storedCode.kind === 'qr' ? 'qr' : 'barcode';
            const code = kind === 'qr'
                ? { value: storedCode && storedCode.value, kind }
                : { value: storedCode && storedCode.value, kind, format: storedCode && storedCode.format };

            if (
                typeof code.value === 'string' &&
                (kind === 'qr' || FORMATS_BY_VALUE[code.format]) &&
                !barcodes.some((item) => savedCodeId(item) === savedCodeId(code))
            ) {
                barcodes.push(code);
            }

            return barcodes;
        }, []);

        return normalizedBarcodes;
    } catch {
        return [];
    }
}

function savedCodeType(code) {
    return code.kind === 'qr' ? 'QR-kód' : FORMATS_BY_VALUE[code.format].label;
}

function checkDigit(digits, firstWeight, secondWeight) {
    const sum = digits.split('').reduce((total, digit, index) => {
        return total + Number(digit) * (index % 2 === 0 ? firstWeight : secondWeight);
    }, 0);

    return String((10 - sum % 10) % 10);
}

function getValidationError(format, value) {
    if (!value.trim()) return '';

    const isDigits = /^\d+$/.test(value);
    const validCheckDigit = (length, firstWeight, secondWeight) => {
        return value.length === length && isDigits && value[length - 1] === checkDigit(value.slice(0, -1), firstWeight, secondWeight);
    };

    switch (format) {
        case 'CODE128':
        case 'CODE93FullASCII':
            return [...value].every((character) => character.charCodeAt(0) <= 127)
                ? ''
                : 'Ez a formátum csak ASCII-karaktereket támogat.';
        case 'CODE128A':
            return [...value].every((character) => character.charCodeAt(0) <= 95) ? '' : 'A Code 128 A nem támogat kisbetűket vagy nem ASCII-karaktereket.';
        case 'CODE128B':
            return [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) <= 127) ? '' : 'A Code 128 B nyomtatható ASCII-karaktereket támogat.';
        case 'CODE128C':
            return /^(\d{2})+$/.test(value) ? '' : 'A Code 128 C páros számú számjegyet vár.';
        case 'CODE39':
            return /^[0-9A-Z\-. $/+%]+$/.test(value) ? '' : 'A Code 39 csak nagybetűket, számokat és - . $ / + % karaktereket támogat.';
        case 'CODE93':
            return /^[0-9A-Z\-. $/+%]+$/.test(value) ? '' : 'A Code 93 csak nagybetűket, számokat és - . szóköz / + % karaktereket támogat.';
        case 'codabar':
            return /^[0-9\-$:.+/]+$/i.test(value) || /^[A-D][0-9\-$:.+/]+[A-D]$/i.test(value)
                ? ''
                : 'A Codabar számokat, - $ : . + / karaktereket és opcionális A–D jelölést támogat.';
        case 'EAN13':
            return (value.length === 12 && isDigits) || validCheckDigit(13, 1, 3)
                ? ''
                : 'Az EAN-13 kód 12 számjegyet vár, vagy 13-at helyes ellenőrző számjeggyel.';
        case 'EAN8':
            return (value.length === 7 && isDigits) || validCheckDigit(8, 3, 1)
                ? ''
                : 'Az EAN-8 kód 7 számjegyet vár, vagy 8-at helyes ellenőrző számjeggyel.';
        case 'EAN5':
            return /^\d{5}$/.test(value) ? '' : 'Az EAN-5 kód pontosan 5 számjegyet vár.';
        case 'EAN2':
            return /^\d{2}$/.test(value) ? '' : 'Az EAN-2 kód pontosan 2 számjegyet vár.';
        case 'UPC':
            return (value.length === 11 && isDigits) || validCheckDigit(12, 3, 1)
                ? ''
                : 'A UPC-A kód 11 számjegyet vár, vagy 12-t helyes ellenőrző számjeggyel.';
        case 'UPCE':
            return isValidUpce(value) ? '' : 'A UPC-E kód 6 számjegyet vagy érvényes, 8 számjegyű kódot vár.';
        case 'ITF':
            return /^(\d{2})+$/.test(value) ? '' : 'Az ITF páros számú számjegyet vár.';
        case 'ITF14':
            return (value.length === 13 && isDigits) || validCheckDigit(14, 3, 1)
                ? ''
                : 'Az ITF-14 kód 13 számjegyet vár, vagy 14-et helyes ellenőrző számjeggyel.';
        case 'MSI':
        case 'MSI10':
        case 'MSI11':
        case 'MSI1010':
        case 'MSI1110':
            return isDigits ? '' : 'Ez az MSI-formátum csak számjegyeket támogat.';
        case 'pharmacode':
            return isDigits && Number(value) >= 3 && Number(value) <= 131070
                ? ''
                : 'A Pharmacode értéke 3 és 131070 közötti egész szám lehet.';
        default:
            return '';
    }
}

function isValidUpce(value) {
    if (/^\d{6}$/.test(value)) return true;
    if (!/^[01]\d{7}$/.test(value)) return false;

    const numberSystem = value[0];
    const digits = value.slice(1, 7);
    const expansion = UPC_E_EXPANSIONS[Number(digits[5])];
    let digitIndex = 0;
    let upcDigits = '';

    for (const character of expansion) {
        upcDigits += character === 'X' ? digits[digitIndex++] : character;
    }

    const upcWithoutCheck = numberSystem + upcDigits;
    return value[7] === checkDigit(upcWithoutCheck, 3, 1);
}

function App() {
    const [value, setValue] = useState('');
    const [generatorMode, setGeneratorMode] = useState('barcode');
    const [format, setFormat] = useState(DEFAULT_FORMAT);
    const [isFormatOpen, setIsFormatOpen] = useState(false);
    const [savedBarcodes, setSavedBarcodes] = useState(readSavedBarcodes);
    const selectedFormat = FORMATS_BY_VALUE[format];
    const validationError = generatorMode === 'barcode' ? getValidationError(format, value) : '';
    const currentCode = generatorMode === 'qr' ? { value, kind: 'qr' } : { value, kind: 'barcode', format };
    const isSaved = savedBarcodes.some((barcode) => savedCodeId(barcode) === savedCodeId(currentCode));

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBarcodes));
        } catch {
            return;
        }
    }, [savedBarcodes]);

    const saveCode = () => {
        if (!value.trim() || validationError || isSaved) return;
        setSavedBarcodes((current) => [currentCode, ...current]);
    };

    const deleteCode = (codeToDelete) => {
        setSavedBarcodes((current) => current.filter((barcode) => savedCodeId(barcode) !== savedCodeId(codeToDelete)));
    };

    return (
        <main className="app-shell">
            <header className="topbar">
                <span className="brand"><span className="brand-mark">B</span> BARCODE</span>
                <span className="topbar-note">GENERÁTOR <span className="status-dot" /></span>
            </header>

            <section className="workspace" aria-labelledby="page-title">
                <p className="eyebrow">{generatorMode === 'qr' ? 'QR-KÓD' : `${selectedFormat.label.toUpperCase()} · VONALKÓD`}</p>
                <h1 id="page-title">Vonalkód generátor</h1>

                <div className="generator-mode-row">
                    <button
                        className={generatorMode === 'barcode' ? 'generator-mode-toggle is-active' : 'generator-mode-toggle'}
                        type="button"
                        aria-pressed={generatorMode === 'barcode'}
                        onClick={() => {
                            setGeneratorMode('barcode');
                            setIsFormatOpen(false);
                        }}
                    >
                        Vonalkód
                    </button>
                    <button
                        className={generatorMode === 'qr' ? 'generator-mode-toggle is-active' : 'generator-mode-toggle'}
                        type="button"
                        aria-pressed={generatorMode === 'qr'}
                        onClick={() => {
                            setGeneratorMode('qr');
                            setIsFormatOpen(false);
                        }}
                    >
                        QR-kód
                    </button>
                </div>

                {generatorMode === 'barcode' && (
                    <div className="format-control">
                        <button
                            className="format-toggle"
                            type="button"
                            aria-expanded={isFormatOpen}
                            aria-controls="format-panel"
                            aria-label={`Vonalkód formátuma: ${selectedFormat.label}`}
                            onClick={() => setIsFormatOpen((isOpen) => !isOpen)}
                        >
                            <span className="format-toggle-label">Formátum</span>
                            <span className="format-toggle-value">{selectedFormat.label}</span>
                        </button>

                        <div className="format-field" id="format-panel" hidden={!isFormatOpen}>
                            <label className="input-label" htmlFor="barcode-format">Vonalkód típusa</label>
                            <select
                                className="format-select"
                                id="barcode-format"
                                value={format}
                                onChange={(event) => {
                                    setFormat(event.target.value);
                                    setIsFormatOpen(false);
                                }}
                                aria-describedby="format-help"
                            >
                                {FORMAT_GROUPS.map((group) => (
                                    <optgroup label={group.label} key={group.label}>
                                        {group.formats.map((option) => (
                                            <option value={option.value} key={option.value}>{option.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <p className={validationError ? 'format-help format-error' : 'format-help'} id="format-help" role={validationError ? 'alert' : 'status'}>
                                {validationError || selectedFormat.hint}
                            </p>
                        </div>
                    </div>
                )}

                <label className="input-label" htmlFor="barcode-value">Kód értéke</label>
                <div className="input-row">
                    <input
                        id="barcode-value"
                        type="text"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="pl. ABC-12345"
                        autoComplete="off"
                        aria-invalid={Boolean(validationError)}
                    />
                    <button
                        className="save-button"
                        type="button"
                        onClick={saveCode}
                        disabled={!value.trim() || Boolean(validationError) || isSaved}
                    >
                        Mentés
                    </button>
                    {value && (
                        <button className="clear-button" type="button" onClick={() => setValue('')}>
                            Törlés
                        </button>
                    )}
                </div>

                <section className="preview" aria-label={generatorMode === 'qr' ? 'QR-kód előnézete' : 'Vonalkód előnézete'} aria-live="polite">
                    {value.trim() && !validationError
                        ? generatorMode === 'qr'
                            ? <div className="qr-graphic" role="img" aria-label={`QR-kód: ${value}`}><QRCodeSVG value={value} size={240} level="M" /></div>
                            : <BarcodeComponent value={value} format={format} />
                        : validationError
                            ? <p className="preview-error">Javítsd a kódot a vonalkód megjelenítéséhez.</p>
                            : <div className="empty-preview" aria-hidden="true" />}
                </section>

                <section className="saved-section" aria-labelledby="saved-title">
                    <div className="saved-heading">
                        <h2 id="saved-title">Mentett kódok</h2>
                        <span className="saved-count">{savedBarcodes.length}</span>
                    </div>
                    {savedBarcodes.length > 0 ? (
                        <ul className="saved-list">
                            {savedBarcodes.map((barcode) => (
                                <li className="saved-item" key={savedCodeId(barcode)}>
                                    <button
                                        className="saved-code"
                                        type="button"
                                        onClick={() => {
                                            setValue(barcode.value);
                                            setGeneratorMode(barcode.kind);
                                            if (barcode.kind === 'barcode') setFormat(barcode.format);
                                            setIsFormatOpen(false);
                                        }}
                                        aria-label={`${savedCodeType(barcode)} ${barcode.value}`}
                                        aria-pressed={savedCodeId(currentCode) === savedCodeId(barcode)}
                                    >
                                        <span className="saved-format">{savedCodeType(barcode)}</span>
                                        <span>{barcode.value}</span>
                                    </button>
                                    <button
                                        className="delete-saved-button"
                                        type="button"
                                        onClick={() => deleteCode(barcode)}
                                        aria-label={`${barcode.value} (${savedCodeType(barcode)}) törlése`}
                                        title="Vonalkód törlése"
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-saved">Még nincs mentett kód.</p>
                    )}
                </section>

            </section>
        </main>
    );
}

export default App;