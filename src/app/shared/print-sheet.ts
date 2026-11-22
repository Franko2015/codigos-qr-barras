import {
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
} from '@angular/core';
import { Print } from '../core/print';
import { svgDataUrl } from '../core/code-renderer';
import { printLabel } from './print-label';

/** Hidden on screen; it is the only thing visible on paper while a print job is active. */
@Component({
  selector: 'app-print-sheet',
  host: { class: 'print-sheet' },
  template: `
    @if (print.job(); as job) {
      <div class="print-grid">
        @for (copy of copies(); track copy) {
          <figure class="print-item" [style.width.cm]="job.widthCm">
            <img [src]="imageUrl()" alt="" />
            @if (job.showLabel) {
              <figcaption>{{ label() }}</figcaption>
            }
          </figure>
        }
      </div>
    }
  `,
})
export class PrintSheet {
  protected readonly print = inject(Print);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly copies = computed(() =>
    Array.from({ length: this.print.job()?.copies ?? 0 }, (_, i) => i),
  );
  protected readonly imageUrl = computed(() => {
    const job = this.print.job();
    return job ? svgDataUrl(job.code.svg) : '';
  });
  protected readonly label = computed(() => {
    const job = this.print.job();
    return job ? printLabel(job.spec) : '';
  });

  constructor() {
    afterRenderEffect(() => {
      if (!this.print.job()) return;
      void this.printWhenReady();
    });
  }

  private async printWhenReady(): Promise<void> {
    const images = Array.from(this.host.nativeElement.querySelectorAll('img'));
    await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
    this.window?.addEventListener('afterprint', () => this.print.finish(), { once: true });
    this.window?.print();
  }
}
