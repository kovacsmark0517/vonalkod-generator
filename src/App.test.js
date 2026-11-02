import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/barcodeComponent', () => function MockBarcodeComponent({ value }) {
  return <div role="img" aria-label={`Vonalkód: ${value}`} />;
});

beforeEach(() => {
  window.localStorage.clear();
});

test('updates the barcode when its input changes', () => {
  render(<App />);

  const input = screen.getByRole('textbox', { name: 'Vonalkód értéke' });
  fireEvent.change(input, { target: { value: 'TERM-123' } });

  expect(screen.getByRole('img', { name: 'Vonalkód: TERM-123' })).toBeInTheDocument();
});

test('saves, restores, selects, and deletes a barcode', () => {
  const { unmount } = render(<App />);
  const input = screen.getByRole('textbox', { name: 'Vonalkód értéke' });

  fireEvent.change(input, { target: { value: 'TERM-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }));

  expect(window.localStorage.getItem('barcode-generator:saved-codes')).toBe('["TERM-123"]');
  unmount();

  render(<App />);
  expect(screen.getByRole('button', { name: 'TERM-123' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Vonalkód értéke' }), {
    target: { value: 'OTHER-456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'TERM-123' }));

  expect(screen.getByRole('textbox', { name: 'Vonalkód értéke' })).toHaveValue('TERM-123');
  expect(screen.getByRole('img', { name: 'Vonalkód: TERM-123' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'TERM-123 törlése' }));
  expect(screen.queryByRole('button', { name: 'TERM-123' })).not.toBeInTheDocument();
  expect(window.localStorage.getItem('barcode-generator:saved-codes')).toBe('[]');
});
