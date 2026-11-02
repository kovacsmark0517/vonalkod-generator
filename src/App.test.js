import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/barcodeComponent', () => function MockBarcodeComponent({ value }) {
  return <div role="img" aria-label={`Vonalkód: ${value}`} />;
});

test('updates the barcode when its input changes', () => {
  render(<App />);

  const input = screen.getByRole('textbox', { name: 'Vonalkód értéke' });
  fireEvent.change(input, { target: { value: 'TERM-123' } });

  expect(screen.getByRole('img', { name: 'Vonalkód: TERM-123' })).toBeInTheDocument();
});
