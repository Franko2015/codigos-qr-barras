import { Service, signal } from '@angular/core';

export interface ToastMessage {
  text: string;
  kind: 'success' | 'error';
}

/** Short status messages announced to screen readers and shown at the bottom of the screen. */
@Service()
export class Toast {
  private readonly messageState = signal<ToastMessage | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly message = this.messageState.asReadonly();

  success(text: string): void {
    this.show({ text, kind: 'success' });
  }

  error(text: string): void {
    this.show({ text, kind: 'error' });
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.messageState.set(null);
  }

  private show(message: ToastMessage): void {
    clearTimeout(this.timer);
    this.messageState.set(message);
    this.timer = setTimeout(() => this.messageState.set(null), 5000);
  }
}
