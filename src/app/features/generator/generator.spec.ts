import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Generator } from './generator';
import { SavedCodes } from '../../core/saved-codes';

async function settle(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  // Rendering uses dynamic imports, so give pending promises a few turns to resolve.
  for (let i = 0; i < 5; i++) {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function type(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input'));
}

describe('Generator', () => {
  beforeEach(async () => {
    localStorage.clear();
    // jsdom has no canvas; JsBarcode only needs it to measure the text under the bars.
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 }),
    })) as unknown as HTMLCanvasElement['getContext'];
    await TestBed.configureTestingModule({
      imports: [Generator],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a QR code preview from the typed content', async () => {
    const fixture = TestBed.createComponent(Generator);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(host.querySelector('.preview__image')).toBeNull();

    type(host.querySelector('textarea#content')!, 'https://ejemplo.com');
    await settle(fixture);

    const image = host.querySelector<HTMLImageElement>('.preview__image');
    expect(image?.src).toContain('data:image/svg+xml');
    expect(image?.alt).toContain('https://ejemplo.com');
    expect(host.querySelector<HTMLButtonElement>('.actions .button--primary')!.disabled).toBe(
      false,
    );
  });

  it('switches to barcodes, validates EAN-13 and renders it', async () => {
    const fixture = TestBed.createComponent(Generator);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    host.querySelector<HTMLInputElement>('input[type=radio][value=barcode]')!.click();
    await settle(fixture);
    host.querySelector<HTMLInputElement>('input[type=radio][value=manual]')!.click();
    await settle(fixture);
    const select = host.querySelector<HTMLSelectElement>('select#format')!;
    select.value = 'EAN13';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    await settle(fixture);

    const input = host.querySelector<HTMLInputElement>('input#content')!;
    type(input, '4006381333932');
    await settle(fixture);
    expect(host.querySelector('#content-error')?.textContent).toContain('debería ser 1');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('.preview__image')).toBeNull();

    type(input, '400638133393');
    await settle(fixture);
    expect(host.querySelector('#content-error')).toBeNull();
    expect(
      decodeURIComponent(host.querySelector<HTMLImageElement>('.preview__image')!.src),
    ).toContain('<rect');
  });

  it('saves the code on the device', async () => {
    const fixture = TestBed.createComponent(Generator);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    type(host.querySelector('textarea#content')!, 'Hola');
    type(host.querySelector('input#label')!, 'Saludo');
    await settle(fixture);

    const saveButton = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Guardar',
    )!;
    saveButton.click();
    await settle(fixture);

    const saved = TestBed.inject(SavedCodes);
    expect(saved.items().map((i) => i.spec.label)).toEqual(['Saludo']);
    expect(JSON.parse(localStorage.getItem('codigos-guardados-v1')!)).toHaveLength(1);
    expect(host.querySelector('h1')?.textContent).toContain('Editar código');
  });

  it('suggests a unique SKU code for inventory barcodes', async () => {
    const fixture = TestBed.createComponent(Generator);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    host.querySelector<HTMLInputElement>('input[type=radio][value=barcode]')!.click();
    await settle(fixture);

    // Inventory is the default purpose: the format list is hidden and a code is suggested.
    expect(
      host.querySelector<HTMLInputElement>('input[type=radio][value=inventory]')!.checked,
    ).toBe(true);
    expect(host.querySelector('select#format')).toBeNull();
    const content = host.querySelector<HTMLInputElement>('input#content')!;
    expect(content.value).toMatch(/^SKU-\d{8}$/);
    expect(host.querySelector<HTMLImageElement>('.preview__image')?.alt).toContain(content.value);

    // "Generar otro número" gives a different code.
    const first = content.value;
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Generar otro número'))!
      .click();
    await settle(fixture);
    expect(content.value).toMatch(/^SKU-\d{8}$/);
    expect(content.value).not.toBe(first);

    // Changing the initials keeps the number.
    const number = content.value.slice(4);
    type(host.querySelector('input#sku-prefix')!, 'ACT-');
    await settle(fixture);
    expect(content.value).toBe(`ACT-${number}`);

    // Invalid initials are explained and block the preview.
    type(host.querySelector('input#sku-prefix')!, 'AÑO-');
    await settle(fixture);
    expect(host.querySelector('#sku-prefix-error')?.textContent).toContain('sin tilde');
    expect(host.querySelector('.preview__image')).toBeNull();
  });

  it('does not suggest codes in "Otro uso" mode', async () => {
    const fixture = TestBed.createComponent(Generator);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    host.querySelector<HTMLInputElement>('input[type=radio][value=barcode]')!.click();
    await settle(fixture);
    host.querySelector<HTMLInputElement>('input[type=radio][value=manual]')!.click();
    await settle(fixture);
    type(host.querySelector('input#content')!, '');
    await settle(fixture);

    expect(host.querySelector('select#format')).not.toBeNull();
    expect(host.querySelector('input#sku-prefix')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('input#content')!.value).toBe('');
  });
});
