export type CodeType = 'qr' | 'barcode';

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14' | 'codabar';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

/** `inventory`: the app suggests a unique SKU code. `manual`: the person picks the format and types it. */
export type BarcodePurpose = 'inventory' | 'manual';

/** Everything needed to draw a code. It is what the form edits and what gets saved. */
export interface CodeSpec {
  type: CodeType;
  content: string;
  label: string;
  barcodeFormat: BarcodeFormat;
  purpose: BarcodePurpose;
  skuPrefix: string;
  qrErrorLevel: QrErrorLevel;
  foreground: string;
  background: string;
  margin: number;
  barHeight: number;
  barWidth: number;
  showText: boolean;
}

export const DEFAULT_SPEC: CodeSpec = {
  type: 'qr',
  content: '',
  label: '',
  barcodeFormat: 'CODE128',
  purpose: 'inventory',
  skuPrefix: 'SKU-',
  qrErrorLevel: 'M',
  foreground: '#000000',
  background: '#ffffff',
  margin: 2,
  barHeight: 80,
  barWidth: 2,
  showText: true,
};

export const QR_MAX_LENGTH = 1200;
export const CODE128_MAX_LENGTH = 80;

/** Random digits added after the prefix of suggested inventory codes. */
export const SKU_DIGITS = 8;
export const SKU_PREFIX_MAX_LENGTH = 10;

export function skuPrefixError(prefix: string): string | null {
  if (prefix.length > SKU_PREFIX_MAX_LENGTH) return `Máximo ${SKU_PREFIX_MAX_LENGTH} caracteres.`;
  return /^[A-Za-z0-9-]*$/.test(prefix) ? null : 'Usa solo letras sin tilde, números y guion (-).';
}

/** True when `content` is the prefix followed only by digits, e.g. SKU-00012345. */
export function isSkuFor(prefix: string, content: string): boolean {
  return content.startsWith(prefix) && /^\d+$/.test(content.slice(prefix.length));
}

function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

/** Suggests `prefix` + random digits, avoiding codes for which `isTaken` returns true. */
export function suggestSku(
  prefix: string,
  isTaken: (code: string) => boolean,
  random: () => number = secureRandom,
): string {
  let code = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    const digits = Math.floor(random() * 10 ** SKU_DIGITS)
      .toString()
      .padStart(SKU_DIGITS, '0');
    code = `${prefix}${digits}`;
    if (!isTaken(code)) break;
  }
  return code;
}

export interface BarcodeFormatInfo {
  value: BarcodeFormat;
  name: string;
  use: string;
  hint: string;
  example: string;
  numeric: boolean;
}

export const BARCODE_FORMATS: readonly BarcodeFormatInfo[] = [
  {
    value: 'CODE128',
    name: 'Code 128',
    use: 'Uso general: inventario, envíos, etiquetas',
    hint: 'Letras sin tilde, números y símbolos básicos (hasta 80).',
    example: 'ABC-12345',
    numeric: false,
  },
  {
    value: 'EAN13',
    name: 'EAN-13',
    use: 'Productos en tiendas',
    hint: '12 dígitos (el último se calcula solo) o 13 dígitos.',
    example: '780123456789',
    numeric: true,
  },
  {
    value: 'EAN8',
    name: 'EAN-8',
    use: 'Productos pequeños',
    hint: '7 dígitos (el último se calcula solo) u 8 dígitos.',
    example: '9638507',
    numeric: true,
  },
  {
    value: 'UPC',
    name: 'UPC-A',
    use: 'Productos (EE. UU. y Canadá)',
    hint: '11 dígitos (el último se calcula solo) o 12 dígitos.',
    example: '12345678901',
    numeric: true,
  },
  {
    value: 'CODE39',
    name: 'Code 39',
    use: 'Industria, credenciales',
    hint: 'MAYÚSCULAS, números, espacio y los símbolos - . $ / + %',
    example: 'CODIGO 39',
    numeric: false,
  },
  {
    value: 'ITF14',
    name: 'ITF-14',
    use: 'Cajas y embalajes',
    hint: '13 dígitos (el último se calcula solo) o 14 dígitos.',
    example: '1540014128876',
    numeric: true,
  },
  {
    value: 'codabar',
    name: 'Codabar',
    use: 'Bibliotecas, laboratorios',
    hint: 'Números y los símbolos - $ : / . + (puede empezar y terminar con A, B, C o D).',
    example: 'A12345B',
    numeric: false,
  },
];

export function barcodeFormatInfo(format: BarcodeFormat): BarcodeFormatInfo {
  return BARCODE_FORMATS.find((f) => f.value === format) ?? BARCODE_FORMATS[0];
}

/** GS1 check digit (EAN-8, EAN-13, UPC-A, ITF-14) for the digits that come before it. */
export function gs1CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[digits.length - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

const GS1_LENGTHS: Partial<Record<BarcodeFormat, number>> = {
  EAN13: 13,
  EAN8: 8,
  UPC: 12,
  ITF14: 14,
};

function gs1Error(format: BarcodeFormat, content: string): string | null {
  const full = GS1_LENGTHS[format];
  if (!full) return null;
  if (!/^\d+$/.test(content)) return 'Solo se permiten números.';
  if (content.length !== full && content.length !== full - 1) {
    return `Debe tener ${full - 1} dígitos (el último se calcula solo) o ${full} dígitos. Ahora tiene ${content.length}.`;
  }
  if (content.length === full) {
    const expected = gs1CheckDigit(content.slice(0, -1));
    if (Number(content.at(-1)) !== expected) {
      return `El último dígito (de control) debería ser ${expected}. Puedes escribir solo los primeros ${full - 1} y se calculará automáticamente.`;
    }
  }
  return null;
}

/** Returns a human readable problem with `content` for the given format, or null if it can be encoded. */
export function barcodeContentError(format: BarcodeFormat, content: string): string | null {
  switch (format) {
    case 'CODE128':
      if (content.length > CODE128_MAX_LENGTH) {
        return `Máximo ${CODE128_MAX_LENGTH} caracteres. Para textos largos usa un código QR.`;
      }
      return /^[\x20-\x7E]+$/.test(content)
        ? null
        : 'Contiene caracteres no permitidos (tildes, ñ o emojis). Para eso usa un código QR.';
    case 'CODE39':
      return /^[0-9A-Z\-. $/+%]+$/.test(content)
        ? null
        : 'Solo MAYÚSCULAS sin tilde, números, espacio y los símbolos - . $ / + %';
    case 'codabar':
      return /^[0-9\-$:/.+]+$|^[A-D][0-9\-$:/.+]+[A-D]$/.test(content)
        ? null
        : 'Solo números y - $ : / . + (opcionalmente entre letras A-D al inicio y al final).';
    default:
      return gs1Error(format, content);
  }
}

/** WCAG relative luminance of a #rrggbb color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1 to 21) between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Scanners need dark bars on a light background with enough contrast. Returns a warning or null. */
export function colorWarning(foreground: string, background: string): string | null {
  if (relativeLuminance(foreground) > relativeLuminance(background)) {
    return 'El código es más claro que el fondo. Muchos lectores no leen códigos invertidos: usa un color oscuro sobre fondo claro.';
  }
  if (contrastRatio(foreground, background) < 4) {
    return 'Los colores tienen poco contraste. Es posible que algunos lectores no puedan leer el código.';
  }
  return null;
}

/** Short, filesystem-safe name for downloads. */
export function fileNameFor(spec: Pick<CodeSpec, 'type' | 'label' | 'content'>): string {
  const base = (spec.label.trim() || spec.content.trim() || 'codigo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase();
  return `${spec.type === 'qr' ? 'qr' : 'barras'}-${base || 'codigo'}`;
}
