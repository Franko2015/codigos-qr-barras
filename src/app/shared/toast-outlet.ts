import { Component, inject } from '@angular/core';
import { Toast } from '../core/toast';

@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="toast-region" role="status" aria-live="polite">
      @if (toast.message(); as message) {
        <div class="toast" [class.toast--error]="message.kind === 'error'">
          <span>{{ message.text }}</span>
          <button
            type="button"
            class="icon-button icon-button--light"
            aria-label="Cerrar aviso"
            (click)="toast.dismiss()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastOutlet {
  protected readonly toast = inject(Toast);
}
