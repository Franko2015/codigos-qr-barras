import { Service, afterNextRender, inject, signal } from '@angular/core';
import { CodeExport } from './code-export';
import { CodeSpec, fileNameFor } from './code-spec';
import { RenderedCode } from './code-renderer';
import { Print } from './print';
import { Toast } from './toast';

/** The actions offered on any code (download, share, print), with user feedback. */
@Service()
export class CodeActions {
  private readonly exporter = inject(CodeExport);
  private readonly printer = inject(Print);
  private readonly toast = inject(Toast);

  private readonly canShareState = signal(false);
  /** Set after the first render so server and browser HTML match during hydration. */
  readonly canShare = this.canShareState.asReadonly();

  constructor() {
    afterNextRender(() => this.canShareState.set(this.exporter.canShareFiles()));
  }

  async downloadPng(spec: CodeSpec, code: RenderedCode): Promise<void> {
    try {
      await this.exporter.downloadPng(code, fileNameFor(spec));
      this.toast.success('Imagen PNG descargada.');
    } catch {
      this.toast.error('No se pudo descargar la imagen. Inténtalo de nuevo.');
    }
  }

  downloadSvg(spec: CodeSpec, code: RenderedCode): void {
    try {
      this.exporter.downloadSvg(code, fileNameFor(spec));
      this.toast.success('Archivo SVG descargado.');
    } catch {
      this.toast.error('No se pudo descargar el archivo. Inténtalo de nuevo.');
    }
  }

  async share(spec: CodeSpec, code: RenderedCode): Promise<void> {
    try {
      await this.exporter.share(code, fileNameFor(spec), spec.label.trim() || 'Código');
    } catch {
      this.toast.error('No se pudo compartir. Prueba con «Descargar PNG».');
    }
  }

  print(spec: CodeSpec, code: RenderedCode): void {
    this.printer.open({ spec, code });
  }
}
