import React, { useEffect, useRef, useState } from 'react';
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

const savedCodeId = ({ value, kind = 'barcode', format, name = '' }) => `${kind}\u0000${format || ''}\u0000${name}\u0000${value}`;

function readSavedBarcodes() {
    try {
        const storedBarcodes = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(storedBarcodes)) return [];

        const normalizedBarcodes = storedBarcodes.reduce((barcodes, savedBarcode) => {
            const storedCode = typeof savedBarcode === 'string'
                ? { value: savedBarcode, kind: 'barcode', format: DEFAULT_FORMAT, name: '' }
                : savedBarcode;
            const kind = storedCode && storedCode.kind === 'qr' ? 'qr' : 'barcode';
            const name = storedCode && typeof storedCode.name === 'string' ? storedCode.name : '';
            const code = kind === 'qr'
                ? { value: storedCode && storedCode.value, kind, name }
                : { value: storedCode && storedCode.value, kind, format: storedCode && storedCode.format, name };

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

async function createPngBlob(svg, title, caption) {
    const viewBox = svg.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
    const bounds = svg.getBoundingClientRect();
    const width = viewBox?.[2] || (svg.getAttribute('width')?.endsWith('%') ? bounds.width : Number.parseFloat(svg.getAttribute('width'))) || bounds.width;
    const height = viewBox?.[3] || (svg.getAttribute('height')?.endsWith('%') ? bounds.height : Number.parseFloat(svg.getAttribute('height'))) || bounds.height;

        function wrapText(context, text, maxWidth) {
            const lines = [];
            let line = '';

            for (const character of text) {
                const nextLine = line + character;
                if (line && context.measureText(nextLine).width > maxWidth) {
                    lines.push(line);
                    line = character;
                } else {
                    line = nextLine;
                }
            }

            if (line || lines.length === 0) lines.push(line);
            return lines;
        }

    if (!width || !height) throw new Error('A kód mérete nem olvasható.');

    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', String(width));
    copy.setAttribute('height', String(height));
    copy.querySelectorAll('text').forEach((text) => text.remove());

    const svgUrl = window.URL.createObjectURL(new Blob(
        [new XMLSerializer().serializeToString(copy)],
        { type: 'image/svg+xml;charset=utf-8' },
    ));

    try {
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = svgUrl;
        });

        const scale = Math.min(6, Math.max(3, Math.ceil(1800 / width)));
        const canvas = document.createElement('canvas');
        const pixelWidth = Math.ceil(width * scale);
        canvas.width = pixelWidth;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('A kép nem készíthető el.');

        const padding = 18 * scale;
        const lineHeight = 22 * scale;
        const titleFontSize = 17 * scale;
        const codeFontSize = 15 * scale;
        const maxTextWidth = pixelWidth - padding * 2;
        context.font = `700 ${titleFontSize}px "Trebuchet MS", sans-serif`;
        const titleLines = title ? wrapText(context, title, maxTextWidth) : [];
        context.font = `${codeFontSize}px Consolas, "Courier New", monospace`;
        const codeLines = wrapText(context, caption, maxTextWidth);

        const imageHeight = Math.ceil(height * scale);
        const imageTop = titleLines.length ? padding + titleLines.length * lineHeight + padding / 2 : padding;
        const codeTop = imageTop + imageHeight + padding;
        canvas.height = codeTop + codeLines.length * lineHeight + padding;
        const finalContext = canvas.getContext('2d');
        if (!finalContext) throw new Error('A kép nem készíthető el.');

        finalContext.fillStyle = '#ffffff';
        finalContext.fillRect(0, 0, canvas.width, canvas.height);
        finalContext.drawImage(image, 0, imageTop, pixelWidth, imageHeight);
        finalContext.fillStyle = '#17241f';
        finalContext.textAlign = 'center';
        finalContext.textBaseline = 'top';
        finalContext.font = `700 ${titleFontSize}px "Trebuchet MS", sans-serif`;
        titleLines.forEach((text, index) => {
            finalContext.fillText(text, pixelWidth / 2, padding + index * lineHeight);
        });
        finalContext.font = `${codeFontSize}px Consolas, "Courier New", monospace`;
        codeLines.forEach((text, index) => {
            finalContext.fillText(text, pixelWidth / 2, codeTop + index * lineHeight);
        });

        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('A PNG nem készíthető el.'));
            }, 'image/png');
        });
    } finally {
        window.URL.revokeObjectURL(svgUrl);
    }
}

function safeFilePart(value) {
    const safeValue = [...value.trim()].map((character) => {
        if (/[<>:"/\\|?*]/.test(character) || character.charCodeAt(0) < 32) return '_';
        return /\s/.test(character) ? '-' : character;
    }).join('');

    return safeValue.slice(0, 60) || 'kod';
}

function App() {
    const [value, setValue] = useState('');
    const [name, setName] = useState('');
    const [generatorMode, setGeneratorMode] = useState('barcode');
    const [format, setFormat] = useState(DEFAULT_FORMAT);
    const [isFormatOpen, setIsFormatOpen] = useState(false);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [savedBarcodes, setSavedBarcodes] = useState(readSavedBarcodes);
    const previewRef = useRef(null);
    const selectedFormat = FORMATS_BY_VALUE[format];
    const validationError = generatorMode === 'barcode' ? getValidationError(format, value) : '';
    const currentCode = generatorMode === 'qr'
        ? { value, name: name.trim(), kind: 'qr' }
        : { value, name: name.trim(), kind: 'barcode', format };
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

    const getExportBaseName = () => {
        const codeType = generatorMode === 'qr' ? 'qr-kod' : format.toLowerCase();
        return `${codeType}-${safeFilePart(name.trim() || value)}`;
    };

    const downloadPng = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        setDownloadError('');

        try {
            const svg = previewRef.current?.querySelector('svg');
            if (!svg) throw new Error('Nem található letölthető kód.');

            const blob = await createPngBlob(svg, name.trim(), value);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${getExportBaseName()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            setIsDownloadOpen(false);
        } catch {
            setDownloadError('A PNG mentése nem sikerült.');
        } finally {
            setIsDownloading(false);
        }
    };

    const savePdf = () => {
        const previousTitle = document.title;
        document.title = getExportBaseName();
        window.addEventListener('afterprint', () => {
            document.title = previousTitle;
        }, { once: true });
        setIsDownloadOpen(false);
        window.print();
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

                <label className="input-label name-label" htmlFor="barcode-name">Elnevezés (opcionális)</label>
                <input
                    className="name-input"
                    id="barcode-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="pl. Termék neve"
                    autoComplete="off"
                />

                <section
                    className="preview"
                    ref={previewRef}
                    aria-label={generatorMode === 'qr' ? 'QR-kód előnézete' : 'Vonalkód előnézete'}
                    aria-live="polite"
                >
                    {value.trim() && !validationError && name.trim() && (
                        <p className="preview-code-name">{name.trim()}</p>
                    )}
                    {value.trim() && !validationError
                        ? generatorMode === 'qr'
                            ? <div className="qr-graphic" role="img" aria-label={`QR-kód: ${value}`}><QRCodeSVG value={value} size={240} level="M" /></div>
                            : <BarcodeComponent value={value} format={format} />
                        : validationError
                            ? <p className="preview-error">Javítsd a kódot a vonalkód megjelenítéséhez.</p>
                            : <div className="empty-preview" aria-hidden="true" />}
                    {value.trim() && !validationError && <p className="print-code-value">{value}</p>}
                </section>

                {value.trim() && !validationError && (
                    <div className="export-control">
                        <button
                            className="export-toggle"
                            type="button"
                            aria-expanded={isDownloadOpen}
                            aria-controls="export-options"
                            onClick={() => setIsDownloadOpen((isOpen) => !isOpen)}
                        >
                            Letöltés
                        </button>
                        {isDownloadOpen && (
                            <div className="export-options" id="export-options" role="group" aria-label="Letöltési formátum">
                                <button type="button" onClick={downloadPng} disabled={isDownloading}>
                                    PNG-kép
                                </button>
                                <button type="button" onClick={savePdf}>
                                    PDF mentése
                                </button>
                            </div>
                        )}
                        {downloadError && <p className="download-error" role="alert">{downloadError}</p>}
                    </div>
                )}

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
                                            setName(barcode.name || '');
                                            setGeneratorMode(barcode.kind);
                                            if (barcode.kind === 'barcode') setFormat(barcode.format);
                                            setIsFormatOpen(false);
                                        }}
                                        aria-label={`${barcode.name ? `${barcode.name} (${savedCodeType(barcode)})` : savedCodeType(barcode)} ${barcode.value}`}
                                        aria-pressed={savedCodeId(currentCode) === savedCodeId(barcode)}
                                    >
                                        {barcode.name && <span className="saved-name">{barcode.name}</span>}
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