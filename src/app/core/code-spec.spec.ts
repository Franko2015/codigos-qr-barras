import {
  barcodeContentError,
  colorWarning,
  fileNameFor,
  gs1CheckDigit,
  isSkuFor,
  skuPrefixError,
  suggestSku,
} from './code-spec';

describe('gs1CheckDigit', () => {
  it('computes EAN-13, EAN-8 and UPC check digits', () => {
    expect(gs1CheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(gs1CheckDigit('9638507')).toBe(4); // 96385074
    expect(gs1CheckDigit('03600029145')).toBe(2); // 036000291452
  });
});

describe('barcodeContentError', () => {
  it('accepts valid content', () => {
    expect(barcodeContentError('EAN13', '400638133393')).toBeNull();
    expect(barcodeContentError('EAN13', '4006381333931')).toBeNull();
    expect(barcodeContentError('EAN8', '96385074')).toBeNull();
    expect(barcodeContentError('UPC', '036000291452')).toBeNull();
    expect(barcodeContentError('CODE128', 'ABC-123 xyz')).toBeNull();
    expect(barcodeContentError('CODE39', 'CODIGO 39')).toBeNull();
    expect(barcodeContentError('codabar', 'A12345B')).toBeNull();
  });

  it('rejects content that cannot be encoded', () => {
    expect(barcodeContentError('EAN13', '4006381333932')).toContain('debería ser 1');
    expect(barcodeContentError('EAN13', '12345')).toContain('Ahora tiene 5');
    expect(barcodeContentError('EAN8', '12a4567')).toBe('Solo se permiten números.');
    expect(barcodeContentError('CODE128', 'Año')).not.toBeNull();
    expect(barcodeContentError('CODE39', 'minúsculas')).not.toBeNull();
    expect(barcodeContentError('codabar', 'A123')).not.toBeNull();
  });
});

describe('colorWarning', () => {
  it('warns about inverted or low contrast colors', () => {
    expect(colorWarning('#000000', '#ffffff')).toBeNull();
    expect(colorWarning('#ffffff', '#000000')).toContain('invertidos');
    expect(colorWarning('#999999', '#bbbbbb')).toContain('contraste');
  });
});

describe('fileNameFor', () => {
  it('builds safe file names', () => {
    expect(fileNameFor({ type: 'qr', label: '', content: 'https://ejemplo.com/menú' })).toBe(
      'qr-ejemplo-com-menu',
    );
    expect(fileNameFor({ type: 'barcode', label: 'Caja Nº 5', content: '123' })).toBe(
      'barras-caja-n-5',
    );
  });
});

describe('SKU suggestions', () => {
  it('builds prefix + 8 digits and skips taken codes', () => {
    const values = [0.5, 0.25];
    const random = () => values.shift() ?? 0.75;
    const taken = new Set(['SKU-50000000']);
    expect(suggestSku('SKU-', (code) => taken.has(code), random)).toBe('SKU-25000000');
    expect(
      suggestSku(
        'SKU-',
        () => false,
        () => 0.0000001,
      ),
    ).toBe('SKU-00000010');
  });

  it('recognises SKU codes and validates prefixes', () => {
    expect(isSkuFor('SKU-', 'SKU-00012345')).toBe(true);
    expect(isSkuFor('SKU-', 'SKU-12A')).toBe(false);
    expect(isSkuFor('SKU-', 'https://ejemplo.com')).toBe(false);
    expect(skuPrefixError('ACT-')).toBeNull();
    expect(skuPrefixError('')).toBeNull();
    expect(skuPrefixError('AÑO-')).not.toBeNull();
    expect(skuPrefixError('DEMASIADO-LARGO')).not.toBeNull();
  });
});
