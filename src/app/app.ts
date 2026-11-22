import { Component, DOCUMENT, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { InstallApp } from './core/install-app';
import { Print } from './core/print';
import { Toast } from './core/toast';
import { SavedCodes } from './core/saved-codes';
import { InstallBanner } from './shared/install-banner';
import { IosInstallHelp } from './shared/ios-install-help';
import { PrintDialog } from './shared/print-dialog';
import { PrintSheet } from './shared/print-sheet';
import { ToastOutlet } from './shared/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    InstallBanner,
    IosInstallHelp,
    PrintDialog,
    PrintSheet,
    ToastOutlet,
  ],
  template: `
    <div class="app-shell" [class.print-hidden]="print.job()">
      <a class="skip-link" href="#main">Saltar al contenido</a>
      <header class="topbar">
        <div class="topbar__inner">
          <a class="brand" routerLink="/" aria-label="Códigos QR y de barras, inicio">
            <svg class="brand__logo" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14v6M17 14v6M20 14v6" />
            </svg>
            <span class="brand__name">Códigos QR y de barras</span>
          </a>
          @if (installer.mode() !== 'none') {
            <button type="button" class="button button--small topbar__install" (click)="install()">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v12m0 0-4-4m4 4 4-4M7 21h10a2 2 0 0 0 2-2v-2M5 17v2a2 2 0 0 0 2 2" />
              </svg>
              Instalar app
            </button>
          }
          <nav aria-label="Principal">
            <ul class="nav">
              <li>
                <a
                  class="nav__link"
                  routerLink="/"
                  routerLinkActive="nav__link--active"
                  ariaCurrentWhenActive="page"
                  [routerLinkActiveOptions]="{
                    paths: 'exact',
                    queryParams: 'ignored',
                    fragment: 'ignored',
                    matrixParams: 'ignored',
                  }"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 8v8M8 12h8M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
                    />
                  </svg>
                  <span>Crear</span>
                </a>
              </li>
              <li>
                <a
                  class="nav__link"
                  routerLink="/guardados"
                  routerLinkActive="nav__link--active"
                  ariaCurrentWhenActive="page"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
                  </svg>
                  <span>Guardados</span>
                  @if (saved.items().length) {
                    <span class="nav__badge">{{ saved.items().length }}</span>
                  }
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <app-install-banner />

      <main id="main" tabindex="-1">
        <router-outlet />
      </main>

      <footer class="footer">
        <p>Tus códigos se crean y se guardan en este dispositivo. No se envía nada a internet.</p>
      </footer>
    </div>

    <app-print-dialog />
    <app-ios-install-help />
    <app-toast-outlet />
    <app-print-sheet />
  `,
})
export class App {
  protected readonly print = inject(Print);
  protected readonly saved = inject(SavedCodes);
  protected readonly installer = inject(InstallApp);
  private readonly toast = inject(Toast);

  protected async install(): Promise<void> {
    if (await this.installer.install()) this.toast.success('¡Listo! La app quedó instalada.');
  }

  constructor() {
    // After each in-app navigation, move focus to the new page so screen readers announce it.
    const document = inject(DOCUMENT);
    const subscription = inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
      )
      .subscribe(() => document.getElementById('main')?.focus({ preventScroll: true }));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
