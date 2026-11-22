import { DOCUMENT, Service, inject } from '@angular/core';
import { CodeSpec } from './code-spec';

export interface RenderedCode {
  svg: string;
  width: number;
  height: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const QR_PREVIEW_SIZE = 320;

/** Turns a CodeSpec into an SVG string. Only works in the browser (uses the DOM). */
@Service()
export class CodeRenderer {
  private readonly document = inject(DOCUMENT);

  render(spec: CodeSpec): Promise<RenderedCode> {
    return spec.type === 'qr' ? this.renderQr(spec) : this.renderBarcode(spec);
  }

  private async renderQr(spec: CodeSpec): Promise<RenderedCode> {
    const qrcode = await import('qrcode');
    try {
      const svg = await qrcode.toString(spec.content, {
        type: 'svg',
        errorCorrectionLevel: spec.qrErrorLevel,
        margin: spec.margin,
        width: QR_PREVIEW_SIZE,
        color: { dark: spec.foreground, light: spec.background },
      });
      return { svg, width: QR_PREVIEW_SIZE, height: QR_PREVIEW_SIZE };
    } catch {
      throw new Error(
        'El contenido es demasiado largo para un código QR. Acorta el texto o baja el nivel de corrección.',
      );
    }
  }

  private async renderBarcode(spec: CodeSpec): Promise<RenderedCode> {
    const { default: JsBarcode } = await import('jsbarcode');
    const svg = this.document.createElementNS(SVG_NS, 'svg');
    let valid = true;
    JsBarcode(svg, spec.content, {
      format: spec.barcodeFormat,
      width: spec.barWidth,
      height: spec.barHeight,
      displayValue: spec.showText,
      lineColor: spec.foreground,
      background: spec.background,
      // Quiet zone: `margin` is expressed in steps of 5 bars.
      margin: spec.margin * spec.barWidth * 5,
      font: 'monospace',
      fontSize: 18,
      valid: (isValid) => (valid = isValid),
    });
    if (!valid) {
      throw new Error('El contenido no es válido para este formato de código de barras.');
    }
    svg.setAttribute('xmlns', SVG_NS);
    return {
      svg: new XMLSerializer().serializeToString(svg),
      width: parseFloat(svg.getAttribute('width') ?? '0'),
      height: parseFloat(svg.getAttribute('height') ?? '0'),
    };
  }
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
