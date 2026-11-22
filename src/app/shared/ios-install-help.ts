import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { InstallApp } from '../core/install-app';

/** iPhone/iPad have no install prompt: explain the 3 taps in Safari's Share menu. */
@Component({
  selector: 'app-ios-install-help',
  template: `
    <dialog
      #dialog
      class="dialog"
      aria-labelledby="ios-install-title"
      (close)="installer.iosHelpOpen.set(false)"
    >
      <div class="dialog__body">
        <header class="dialog__header">
          <h2 id="ios-install-title">Instalar en iPhone o iPad</h2>
          <button
            type="button"
            class="icon-button"
            aria-label="Cerrar"
            (click)="installer.iosHelpOpen.set(false)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <ol class="install-steps">
          <li>
            Toca el botón <strong>Compartir</strong>
            <svg class="install-steps__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15V3m0 0L8 7m4-4 4 4M6 10H5v11h14V10h-1" />
            </svg>
            en la barra de Safari.
          </li>
          <li>Desliza y elige <strong>Agregar a pantalla de inicio</strong>.</li>
          <li>Toca <strong>Agregar</strong>. El ícono aparecerá junto a tus otras apps.</li>
        </ol>
        <p class="field__hint">Si no ves la opción, abre esta página en Safari.</p>
        <div class="dialog__actions">
          <button
            type="button"
            class="button button--primary"
            (click)="installer.iosHelpOpen.set(false)"
          >
            Entendido
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class IosInstallHelp {
  protected readonly installer = inject(InstallApp);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const open = this.installer.iosHelpOpen();
      const dialog = this.dialog().nativeElement;
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    });
  }
}
