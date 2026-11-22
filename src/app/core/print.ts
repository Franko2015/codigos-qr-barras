import { Service, signal } from '@angular/core';
import { CodeSpec } from './code-spec';
import { RenderedCode } from './code-renderer';

export interface PrintSource {
  spec: CodeSpec;
  code: RenderedCode;
}

export interface PrintJob extends PrintSource {
  copies: number;
  widthCm: number;
  showLabel: boolean;
}

/**
 * Print flow: `open()` shows the options dialog, `print()` fills the hidden print sheet,
 * which then calls the browser's print dialog.
 */
@Service()
export class Print {
  private readonly requestState = signal<PrintSource | null>(null);
  private readonly jobState = signal<PrintJob | null>(null);

  /** Code whose print options are being chosen (dialog open). */
  readonly request = this.requestState.asReadonly();
  /** Sheet being printed right now. */
  readonly job = this.jobState.asReadonly();

  open(source: PrintSource): void {
    this.requestState.set(source);
  }

  cancel(): void {
    this.requestState.set(null);
  }

  print(job: PrintJob): void {
    this.requestState.set(null);
    this.jobState.set(job);
  }

  finish(): void {
    this.jobState.set(null);
  }
}
