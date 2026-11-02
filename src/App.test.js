import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/barcodeComponent', () => function MockBarcodeComponent({ value, format }) {
  return <div role="img" aria-label={`Vonalkód ${format}: ${value}`} />;
});

beforeEach(() => {
  window.localStorage.clear();
});

test('updates the barcode when its input changes', () => {
  render(<App />);

  const input = screen.getByRole('textbox', { name: 'Kód értéke' });
  fireEvent.change(input, { target: { value: 'TERM-123' } });

  expect(screen.getByRole('img', { name: 'Vonalkód CODE128: TERM-123' })).toBeInTheDocument();
});

test('places the generated preview before the saved codes', () => {
  render(<App />);

  const preview = screen.getByRole('region', { name: 'Vonalkód előnézete' });
  const savedCodes = screen.getByRole('region', { name: 'Mentett kódok' });

  expect(preview.compareDocumentPosition(savedCodes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('switches from QR to barcode without opening the format menu', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'QR-kód' }));
  expect(screen.queryByRole('combobox', { name: 'Vonalkód típusa' })).not.toBeInTheDocument();

  const barcodeMode = screen.getByRole('button', { name: 'Vonalkód' });
  fireEvent.click(barcodeMode);

  expect(barcodeMode).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('combobox', { name: 'Vonalkód típusa' })).not.toBeInTheDocument();

  const formatToggle = screen.getByRole('button', { name: 'Vonalkód formátuma: Code 128' });
  expect(formatToggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(formatToggle);
  expect(formatToggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('combobox', { name: 'Vonalkód típusa' })).toBeInTheDocument();
});

test('validates and saves a format, then restores and deletes it', () => {
  const { unmount } = render(<App />);
  const input = screen.getByRole('textbox', { name: 'Kód értéke' });
  const formatToggle = screen.getByRole('button', { name: 'Vonalkód formátuma: Code 128' });

  expect(formatToggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('combobox', { name: 'Vonalkód típusa' })).not.toBeInTheDocument();
  fireEvent.click(formatToggle);

  const formatSelect = screen.getByRole('combobox', { name: 'Vonalkód típusa' });

  fireEvent.change(formatSelect, { target: { value: 'EAN13' } });
  expect(screen.getByRole('button', { name: 'Vonalkód formátuma: EAN-13' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('combobox', { name: 'Vonalkód típusa' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Vonalkód formátuma: EAN-13' }));
  const selectedFormat = screen.getByRole('combobox', { name: 'Vonalkód típusa' });
  expect(selectedFormat).toHaveValue('EAN13');
  fireEvent.change(input, { target: { value: 'not-a-number' } });
  expect(screen.getByRole('alert')).toHaveTextContent(/EAN-13/);
  expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled();

  fireEvent.change(input, { target: { value: '400638133393' } });
  expect(screen.getByRole('img', { name: 'Vonalkód EAN13: 400638133393' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }));

  expect(JSON.parse(window.localStorage.getItem('barcode-generator:saved-codes'))).toEqual([
    { value: '400638133393', name: '', kind: 'barcode', format: 'EAN13' },
  ]);
  unmount();

  render(<App />);
  expect(screen.getByRole('button', { name: 'EAN-13 400638133393' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Kód értéke' }), {
    target: { value: 'OTHER-456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'EAN-13 400638133393' }));

  expect(screen.getByRole('textbox', { name: 'Kód értéke' })).toHaveValue('400638133393');
  expect(screen.getByRole('button', { name: 'Vonalkód formátuma: EAN-13' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Vonalkód formátuma: EAN-13' }));
  expect(screen.getByRole('combobox', { name: 'Vonalkód típusa' })).toHaveValue('EAN13');
  expect(screen.getByRole('img', { name: 'Vonalkód EAN13: 400638133393' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '400638133393 (EAN-13) törlése' }));
  expect(screen.queryByRole('button', { name: 'EAN-13 400638133393' })).not.toBeInTheDocument();
  expect(window.localStorage.getItem('barcode-generator:saved-codes')).toBe('[]');
});

test('migrates older text-only saves to Code 128', () => {
  window.localStorage.setItem('barcode-generator:saved-codes', '["OLD-123"]');

  render(<App />);

  expect(screen.getByRole('button', { name: 'Code 128 OLD-123' })).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('barcode-generator:saved-codes'))).toEqual([
    { value: 'OLD-123', name: '', kind: 'barcode', format: 'CODE128' },
  ]);
});

test('generates, saves, restores, and deletes QR codes separately', () => {
  const { unmount } = render(<App />);
  const value = 'https://example.com/item/42';
  const name = 'Mintatermék';

  fireEvent.click(screen.getByRole('button', { name: 'QR-kód' }));
  expect(screen.getByRole('button', { name: 'QR-kód' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Vonalkód' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.change(screen.getByRole('textbox', { name: 'Elnevezés (opcionális)' }), { target: { value: name } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Kód értéke' }), { target: { value } });

  expect(screen.getByRole('img', { name: `QR-kód: ${value}` })).toBeInTheDocument();
  expect(screen.getByText(name)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }));
  expect(JSON.parse(window.localStorage.getItem('barcode-generator:saved-codes'))).toContainEqual({
    value,
    name,
    kind: 'qr',
  });
  unmount();

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: `${name} (QR-kód) ${value}` }));
  expect(screen.getByRole('textbox', { name: 'Kód értéke' })).toHaveValue(value);
  expect(screen.getByRole('textbox', { name: 'Elnevezés (opcionális)' })).toHaveValue(name);
  expect(screen.getByRole('button', { name: 'QR-kód' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img', { name: `QR-kód: ${value}` })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: `${value} (QR-kód) törlése` }));
  expect(screen.queryByRole('button', { name: `QR-kód ${value}` })).not.toBeInTheDocument();
});

test('offers PNG and PDF export for a generated QR code', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'QR-kód' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Elnevezés (opcionális)' }), {
    target: { value: 'Export termék' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Kód értéke' }), {
    target: { value: 'https://example.com/export-123' },
  });
  expect(screen.getByText('Export termék')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Letöltés' }));
  expect(screen.getByRole('button', { name: 'PNG-kép' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'PDF mentése' })).toBeInTheDocument();

  const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'PDF mentése' }));
  expect(printSpy).toHaveBeenCalledTimes(1);
  printSpy.mockRestore();
});

test('exports a square QR PNG with the optional name and code text', async () => {
  const context = {
    measureText: (text) => ({ width: text.length * 10 }),
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    fillText: jest.fn(),
  };
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const originalImage = global.Image;
  let exportedCanvas;
  let downloadedFilename;

  HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
  HTMLCanvasElement.prototype.toBlob = function (callback, type) {
    exportedCanvas = this;
    callback(new Blob(['png'], { type }));
  };
  window.URL.createObjectURL = jest.fn(() => 'blob:export-test');
  window.URL.revokeObjectURL = jest.fn();
  global.Image = class MockImage {
    set src(value) {
      this.onload();
    }
  };
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloadedFilename = this.download;
  });

  try {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'QR-kód' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Elnevezés (opcionális)' }), {
      target: { value: 'Teszt termék' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Kód értéke' }), {
      target: { value: 'SKU-42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Letöltés' }));
    fireEvent.click(screen.getByRole('button', { name: 'PNG-kép' }));

    await waitFor(() => expect(anchorClick).toHaveBeenCalled());

    expect(exportedCanvas.width).toBe(1200);
    expect(exportedCanvas.height).toBe(1200);
    expect(context.fillText.mock.calls.map(([text]) => text)).toContain('Teszt termék');
    expect(context.fillText.mock.calls.map(([text]) => text)).toContain('SKU-42');
    expect(downloadedFilename).toBe('qr-kod-Teszt-termék.png');
  } finally {
    anchorClick.mockRestore();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    if (originalCreateObjectURL) window.URL.createObjectURL = originalCreateObjectURL;
    else delete window.URL.createObjectURL;
    if (originalRevokeObjectURL) window.URL.revokeObjectURL = originalRevokeObjectURL;
    else delete window.URL.revokeObjectURL;
    global.Image = originalImage;
  }
});
