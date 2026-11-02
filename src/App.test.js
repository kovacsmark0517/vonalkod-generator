import { fireEvent, render, screen } from '@testing-library/react';
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
    { value: '400638133393', kind: 'barcode', format: 'EAN13' },
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
    { value: 'OLD-123', kind: 'barcode', format: 'CODE128' },
  ]);
});

test('generates, saves, restores, and deletes QR codes separately', () => {
  const { unmount } = render(<App />);
  const value = 'https://example.com/item/42';

  fireEvent.click(screen.getByRole('button', { name: 'QR-kód' }));
  expect(screen.getByRole('button', { name: 'QR-kód' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Vonalkód' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.change(screen.getByRole('textbox', { name: 'Kód értéke' }), { target: { value } });

  expect(screen.getByRole('img', { name: `QR-kód: ${value}` })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }));
  expect(JSON.parse(window.localStorage.getItem('barcode-generator:saved-codes'))).toContainEqual({
    value,
    kind: 'qr',
  });
  unmount();

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: `QR-kód ${value}` }));
  expect(screen.getByRole('textbox', { name: 'Kód értéke' })).toHaveValue(value);
  expect(screen.getByRole('button', { name: 'QR-kód' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img', { name: `QR-kód: ${value}` })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: `${value} (QR-kód) törlése` }));
  expect(screen.queryByRole('button', { name: `QR-kód ${value}` })).not.toBeInTheDocument();
});
