import {
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { barcodeFormatInfo } from '../../core/code-spec';
import { svgDataUrl } from '../../core/code-renderer';
import { CodeActions } from '../../core/code-actions';
import { SavedCode, SavedCodes } from '../../core/saved-codes';
import { Toast } from '../../core/toast';

interface SavedView {
  item: SavedCode;
  title: string;
  kind: string;
  imageUrl: string;
}

@Component({
  selector: 'app-saved',
  imports: [RouterLink, DatePipe],
  templateUrl: './saved.html',
})
export class Saved {
  protected readonly saved = inject(SavedCodes);
  protected readonly actions = inject(CodeActions);
  private readonly toast = inject(Toast);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  protected readonly query = signal('');

  private readonly views = computed<SavedView[]>(() =>
    this.saved.items().map((item) => ({
      item,
      title: item.spec.label.trim() || item.spec.content,
      kind:
        item.spec.type === 'qr'
          ? 'Código QR'
          : `Barras ${barcodeFormatInfo(item.spec.barcodeFormat).name}`,
      imageUrl: svgDataUrl(item.code.svg),
    })),
  );

  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.views();
    return this.views().filter(({ item, kind }) =>
      `${item.spec.label} ${item.spec.content} ${kind}`.toLowerCase().includes(query),
    );
  });

  protected remove(view: SavedView): void {
    if (!this.window?.confirm(`¿Eliminar «${view.title}» de este dispositivo?`)) return;
    this.saved.remove(view.item.id);
    this.toast.success('Código eliminado.');
    this.heading().nativeElement.focus();
  }
}
