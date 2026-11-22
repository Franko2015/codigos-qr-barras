import { Component, inject } from '@angular/core';
import { InstallApp } from '../core/install-app';
import { Toast } from '../core/toast';

/** One-time invitation to install the app (hidden for good once dismissed). */
@Component({
  selector: 'app-install-banner',
  template: `
    @if (installer.showBanner()) {
      <aside class="install-banner" aria-labelledby="install-banner-title">
        <img class="install-banner__icon" src="icons/icon-192.png" alt="" width="44" height="44" />
        <div class="install-banner__text">
          <h2 id="install-banner-title">Instala la app en tu teléfono</h2>
          <p>Ábrela desde tu pantalla de inicio, como cualquier app, incluso sin internet.</p>
        </div>
        <div class="install-banner__actions">
          <button type="button" class="button button--primary button--small" (click)="install()">
            Instalar
          </button>
          <button
            type="button"
            class="button button--ghost button--small"
            (click)="installer.dismissBanner()"
          >
            Ahora no
          </button>
        </div>
      </aside>
    }
  `,
})
export class InstallBanner {
  protected readonly installer = inject(InstallApp);
  private readonly toast = inject(Toast);

  protected async install(): Promise<void> {
    if (await this.installer.install()) this.toast.success('¡Listo! La app quedó instalada.');
  }
}
