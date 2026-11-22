import { DOCUMENT, Service, afterNextRender, inject, signal } from '@angular/core';
import { CodeSpec, DEFAULT_SPEC } from './code-spec';
import { RenderedCode } from './code-renderer';

export interface SavedCode {
  id: string;
  createdAt: number;
  spec: CodeSpec;
  code: RenderedCode;
}

const STORAGE_KEY = 'codigos-guardados-v1';

/** Codes kept on this device (localStorage). Nothing is sent to any server. */
@Service()
export class SavedCodes {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly itemsState = signal<SavedCode[]>([]);
  private readonly loadedState = signal(false);

  readonly items = this.itemsState.asReadonly();
  /** False until storage has been read (after the first render, so hydration matches the server). */
  readonly loaded = this.loadedState.asReadonly();

  constructor() {
    afterNextRender(() => {
      this.itemsState.set(this.read());
      this.loadedState.set(true);
      this.window?.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) this.itemsState.set(this.read());
      });
    });
  }

  find(id: string): SavedCode | undefined {
    return this.itemsState().find((item) => item.id === id);
  }

  /** Adds a code, or updates it if `id` is given and exists. Returns the saved item, or null if storage is full. */
  save(spec: CodeSpec, code: RenderedCode, id?: string): SavedCode | null {
    const existing = id ? this.find(id) : undefined;
    const item: SavedCode = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? Date.now(),
      spec: { ...spec },
      code,
    };
    const next = existing
      ? this.itemsState().map((i) => (i.id === item.id ? item : i))
      : [item, ...this.itemsState()];
    return this.write(next) ? item : null;
  }

  remove(id: string): void {
    this.write(this.itemsState().filter((item) => item.id !== id));
  }

  private read(): SavedCode[] {
    try {
      const raw = this.window?.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      // Fill fields added in later versions. Codes saved before the inventory option were typed by hand.
      return (parsed as (Omit<SavedCode, 'spec'> & { spec: Partial<CodeSpec> })[]).map((item) => ({
        ...item,
        spec: { ...DEFAULT_SPEC, purpose: 'manual', ...item.spec },
      }));
    } catch {
      return [];
    }
  }

  private write(items: SavedCode[]): boolean {
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      this.itemsState.set(items);
      return true;
    } catch {
      return false;
    }
  }
}
