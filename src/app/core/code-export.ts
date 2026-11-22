import { DOCUMENT, Service, inject } from '@angular/core';
import { RenderedCode, svgDataUrl } from './code-renderer';

/** Minimum width (px) of exported PNG files, so they stay sharp when printed. */
const PNG_MIN_WIDTH = 1200;

/** Downloads and shares rendered codes as files. */
@Service()
export class CodeExport {
  private readonly document = inject(DOCUMENT);

  downloadSvg(code: RenderedCode, fileName: string): void {
    this.save(new Blob([code.svg], { type: 'image/svg+xml' }), `${fileName}.svg`);
  }

  async downloadPng(code: RenderedCode, fileName: string): Promise<void> {
    this.save(await this.toPng(code), `${fileName}.png`);
  }

  /** True when the device can share image files (most phones): lets people save to their gallery. */
  canShareFiles(): boolean {
    const nav = this.document.defaultView?.navigator;
    if (!nav?.canShare) return false;
    const probe = new File([''], 'codigo.png', { type: 'image/png' });
    return nav.canShare({ files: [probe] });
  }

  /** Opens the system share sheet. Resolves false if the person cancelled. */
  async share(code: RenderedCode, fileName: string, title: string): Promise<boolean> {
    const nav = this.document.defaultView?.navigator;
    if (!nav) return false;
    const file = new File([await this.toPng(code)], `${fileName}.png`, { type: 'image/png' });
    try {
      await nav.share({ files: [file], title });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }

  private async toPng(code: RenderedCode): Promise<Blob> {
    const image = new Image();
    image.src = svgDataUrl(code.svg);
    await image.decode();

    const scale = Math.max(2, Math.ceil(PNG_MIN_WIDTH / code.width));
    const canvas = this.document.createElement('canvas');
    canvas.width = Math.round(code.width * scale);
    canvas.height = Math.round(code.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear la imagen.');
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen.'))),
        'image/png',
      ),
    );
  }

  private save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    this.document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
