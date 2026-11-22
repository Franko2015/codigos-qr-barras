import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormField, form, max, maxLength, min, required, validate } from '@angular/forms/signals';
import {
  BARCODE_FORMATS,
  CodeSpec,
  DEFAULT_SPEC,
  QR_MAX_LENGTH,
  SKU_DIGITS,
  barcodeContentError,
  barcodeFormatInfo,
  colorWarning,
  isSkuFor,
  skuPrefixError,
  suggestSku,
} from '../../core/code-spec';
import { CodeRenderer, RenderedCode, svgDataUrl } from '../../core/code-renderer';
import { CodeActions } from '../../core/code-actions';
import { SavedCodes } from '../../core/saved-codes';
import { Toast } from '../../core/toast';

@Component({
  selector: 'app-generator',
  imports: [FormField],
  templateUrl: './generator.html',
})
export class Generator {
  private readonly renderer = inject(CodeRenderer);
  private readonly saved = inject(SavedCodes);
  private readonly toast = inject(Toast);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly actions = inject(CodeActions);

  /** `?id=` query param: opens a saved code for editing. */
  readonly id = input<string>();

  protected readonly formats = BARCODE_FORMATS;
  protected readonly qrMaxLength = QR_MAX_LENGTH;

  protected readonly model = signal<CodeSpec>({ ...DEFAULT_SPEC });
  protected readonly f = form(this.model, (p) => {
    required(p.content, { message: 'Escribe el contenido del código.' });
    validate(p.content, ({ value, valueOf }) => {
      const content = value();
      if (!content) return null;
      if (valueOf(p.type) === 'qr') {
        return content.length > QR_MAX_LENGTH
          ? { kind: 'qrLength', message: `Máximo ${QR_MAX_LENGTH} caracteres en un código QR.` }
          : null;
      }
      const message = barcodeContentError(valueOf(p.barcodeFormat), content);
      return message ? { kind: 'barcodeContent', message } : null;
    });
    validate(p.skuPrefix, ({ value, valueOf }) => {
      if (valueOf(p.type) !== 'barcode' || valueOf(p.purpose) !== 'inventory') return null;
      const message = skuPrefixError(value());
      return message ? { kind: 'skuPrefix', message } : null;
    });
    maxLength(p.label, 60);
    min(p.margin, 0);
    max(p.margin, 8);
    min(p.barHeight, 30);
    max(p.barHeight, 200);
    min(p.barWidth, 1);
    max(p.barWidth, 4);
  });

  protected readonly editingId = signal<string | null>(null);
  protected readonly rendered = signal<RenderedCode | null>(null);
  protected readonly renderError = signal<string | null>(null);

  protected readonly isQr = computed(() => this.model().type === 'qr');
  protected readonly isInventory = computed(
    () => this.model().type === 'barcode' && this.model().purpose === 'inventory',
  );
  private readonly skuPrefix = computed(() => this.model().skuPrefix);
  /** Read by screen readers when a new code is suggested. */
  protected readonly skuAnnouncement = signal('');
  protected readonly skuDigits = SKU_DIGITS;
  protected readonly formatInfo = computed(() => barcodeFormatInfo(this.model().barcodeFormat));
  protected readonly colorWarning = computed(() =>
    colorWarning(this.model().foreground, this.model().background),
  );
  protected readonly showContentError = computed(() => {
    const field = this.f.content();
    return field.invalid() && (field.touched() || field.value().length > 0);
  });
  protected readonly previewUrl = computed(() => {
    const code = this.rendered();
    return code ? svgDataUrl(code.svg) : '';
  });
  protected readonly previewAlt = computed(() => {
    const { type, content, label } = this.model();
    const kind = type === 'qr' ? 'Código QR' : `Código de barras ${this.formatInfo().name}`;
    return `${kind}${label.trim() ? ` «${label.trim()}»` : ''} con el contenido: ${content}`;
  });

  /** False when the preview is scrolled out of view (phones): shows the "Ver y descargar" bar. */
  protected readonly previewVisible = signal(true);
  private readonly previewSection = viewChild.required<ElementRef<HTMLElement>>('previewSection');
  private readonly previewHeading = viewChild.required<ElementRef<HTMLElement>>('previewHeading');

  private readonly contentInput =
    viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('contentInput');

  constructor() {
    // Draw the code every time the form changes (browser only: it needs the DOM).
    effect((onCleanup) => {
      if (!this.isBrowser) return;
      const spec = this.model();
      if (this.f().invalid()) {
        this.rendered.set(null);
        this.renderError.set(null);
        return;
      }
      let stale = false;
      onCleanup(() => (stale = true));
      this.renderer.render(spec).then(
        (code) => {
          if (stale) return;
          this.rendered.set(code);
          this.renderError.set(null);
        },
        (error: unknown) => {
          if (stale) return;
          this.rendered.set(null);
          this.renderError.set(
            error instanceof Error ? error.message : 'No se pudo generar el código.',
          );
        },
      );
    });

    // Inventory barcodes: suggest a code when the option is chosen, and follow prefix edits.
    let wasInventory = false;
    let previousPrefix = this.skuPrefix();
    effect(() => {
      const active = this.isInventory();
      const prefix = this.skuPrefix();
      untracked(() => {
        const content = this.model().content;
        if (active && !wasInventory) {
          this.patch({ barcodeFormat: 'CODE128' });
          if (!isSkuFor(prefix, content)) this.generateSku();
        } else if (active && prefix !== previousPrefix && content.startsWith(previousPrefix)) {
          this.patch({ content: prefix + content.slice(previousPrefix.length) });
        }
        wasInventory = active;
        previousPrefix = prefix;
      });
    });

    const window = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!window || !('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver(([entry]) =>
        this.previewVisible.set(entry.isIntersecting),
      );
      observer.observe(this.previewSection().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    // Load a saved code when arriving with ?id=
    effect(() => {
      const id = this.id();
      if (!id || !this.saved.loaded()) return;
      const item = untracked(() => this.saved.find(id));
      if (item) {
        this.model.set({ ...item.spec });
        this.editingId.set(item.id);
      } else {
        this.toast.error('Ese código ya no está guardado en este dispositivo.');
        void this.router.navigate(['/']);
      }
    });
  }

  /** Replaces the content with a new random code that isn't already saved or shown. */
  protected generateSku(): void {
    const current = this.model().content;
    const code = suggestSku(
      this.model().skuPrefix,
      (candidate) =>
        candidate === current || this.saved.items().some((item) => item.spec.content === candidate),
    );
    this.patch({ content: code });
    this.skuAnnouncement.set(`Código sugerido: ${code}`);
  }

  private patch(changes: Partial<CodeSpec>): void {
    this.model.update((spec) => ({ ...spec, ...changes }));
  }

  protected showPreview(): void {
    const reduceMotion = this.previewSection().nativeElement.ownerDocument.defaultView?.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.previewSection().nativeElement.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    this.previewHeading().nativeElement.focus({ preventScroll: true });
  }

  protected useExample(): void {
    this.f.content().value.set(this.isQr() ? 'https://ejemplo.com' : this.formatInfo().example);
    this.contentInput()?.nativeElement.focus();
  }

  protected save(code: RenderedCode): void {
    const item = this.saved.save(this.model(), code, this.editingId() ?? undefined);
    if (!item) {
      this.toast.error('No hay espacio para guardar más códigos. Elimina algunos en «Guardados».');
      return;
    }
    const wasEditing = !!this.editingId();
    this.editingId.set(item.id);
    this.toast.success(wasEditing ? 'Cambios guardados.' : 'Código guardado en este dispositivo.');
  }

  protected startNew(): void {
    const wasInventory = this.isInventory();
    const { type, purpose, skuPrefix } = this.model();
    this.model.set({ ...DEFAULT_SPEC, type, purpose, skuPrefix });
    // If inventory mode was already on, the effect won't fire again: suggest a fresh code here.
    if (wasInventory) this.generateSku();
    this.f().reset();
    this.editingId.set(null);
    if (this.id()) void this.router.navigate(['/']);
    this.contentInput()?.nativeElement.focus();
  }
}
