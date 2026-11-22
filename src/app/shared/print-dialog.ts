import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { PrintSource, Print } from '../core/print';
import { svgDataUrl } from '../core/code-renderer';
import { printLabel } from './print-label';

interface PrintOptions {
  copies: number;
  widthCm: number;
  showLabel: boolean;
}

/** A4 / Letter usable area with 1 cm margins, and the gap between codes (cm). */
const PAGE_WIDTH_CM = 19;
const PAGE_HEIGHT_CM = 25.9;
const GAP_CM = 0.6;
const LABEL_HEIGHT_CM = 0.7;

function defaultsFor(source: PrintSource | null): PrintOptions {
  return {
    copies: 1,
    widthCm: source?.spec.type === 'barcode' ? 6 : 4,
    showLabel: !!source?.spec.label.trim(),
  };
}

@Component({
  selector: 'app-print-dialog',
  imports: [FormField],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="print-title" (close)="print.cancel()">
      @if (print.request(); as source) {
        <form class="dialog__body" novalidate (submit)="confirm($event, source)">
          <header class="dialog__header">
            <h2 id="print-title">Imprimir</h2>
            <button type="button" class="icon-button" aria-label="Cerrar" (click)="print.cancel()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <img class="dialog__thumb" [src]="thumbUrl()" alt="" />

          <div class="field">
            <label for="print-copies">¿Cuántas copias?</label>
            <input
              id="print-copies"
              type="number"
              inputmode="numeric"
              [formField]="f.copies"
              [attr.aria-describedby]="f.copies().invalid() ? 'print-copies-error' : null"
            />
            @if (f.copies().invalid()) {
              <p id="print-copies-error" class="field__error">
                {{ f.copies().errors()[0].message }}
              </p>
            }
          </div>

          <div class="field">
            <label for="print-width">Ancho de cada código (cm)</label>
            <input
              id="print-width"
              type="number"
              inputmode="decimal"
              step="0.5"
              [formField]="f.widthCm"
              aria-describedby="print-width-hint"
            />
            @if (f.widthCm().invalid()) {
              <p class="field__error">{{ f.widthCm().errors()[0].message }}</p>
            } @else {
              <p id="print-width-hint" class="field__hint">{{ fitHint() }}</p>
            }
          </div>

          @if (labelText()) {
            <label class="check">
              <input type="checkbox" [formField]="f.showLabel" />
              <span
                >Mostrar texto debajo: <strong>{{ labelText() }}</strong></span
              >
            </label>
          }

          <div class="dialog__actions">
            <button type="button" class="button button--ghost" (click)="print.cancel()">
              Cancelar
            </button>
            <button type="submit" class="button button--primary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 9V3h10v6M7 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-3M7 14h10v7H7z" />
              </svg>
              Imprimir
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
})
export class PrintDialog {
  protected readonly print = inject(Print);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly options = linkedSignal(() => defaultsFor(this.print.request()));
  protected readonly f = form(this.options, (p) => {
    required(p.copies, { message: 'Indica cuántas copias quieres.' });
    min(p.copies, 1, { message: 'Mínimo 1 copia.' });
    max(p.copies, 200, { message: 'Máximo 200 copias.' });
    required(p.widthCm, { message: 'Indica el ancho en centímetros.' });
    min(p.widthCm, 1.5, { message: 'El ancho mínimo es 1,5 cm.' });
    max(p.widthCm, PAGE_WIDTH_CM, { message: `El ancho máximo es ${PAGE_WIDTH_CM} cm.` });
  });

  protected readonly thumbUrl = computed(() => {
    const source = this.print.request();
    return source ? svgDataUrl(source.code.svg) : '';
  });

  protected readonly labelText = computed(() => {
    const source = this.print.request();
    return source ? printLabel(source.spec) : '';
  });

  protected readonly fitHint = computed(() => {
    const source = this.print.request();
    const { widthCm, showLabel } = this.options();
    if (!source || !widthCm) return '';
    const heightCm =
      (widthCm * source.code.height) / source.code.width +
      (showLabel && this.labelText() ? LABEL_HEIGHT_CM : 0);
    const columns = Math.max(1, Math.floor((PAGE_WIDTH_CM + GAP_CM) / (widthCm + GAP_CM)));
    const rows = Math.max(1, Math.floor((PAGE_HEIGHT_CM + GAP_CM) / (heightCm + GAP_CM)));
    const perPage = columns * rows;
    return `Caben aprox. ${perPage} por hoja (A4 o carta).`;
  });

  constructor() {
    effect(() => {
      const open = !!this.print.request();
      const dialog = this.dialog().nativeElement;
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    });
  }

  protected confirm(event: Event, source: PrintSource): void {
    event.preventDefault();
    if (this.f().invalid()) return;
    const { copies, widthCm, showLabel } = this.options();
    this.print.print({ ...source, copies, widthCm, showLabel: showLabel && !!this.labelText() });
  }
}
