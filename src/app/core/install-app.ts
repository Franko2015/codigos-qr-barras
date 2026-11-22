import { DOCUMENT, Service, afterNextRender, computed, inject, signal } from '@angular/core';

/** Chrome/Edge/Samsung Internet event that lets a page show the native "install app" prompt. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = 'instalar-app-descartado';

/**
 * Knows whether the app can be installed on this device and how:
 * - `prompt`: the browser offers a native install dialog (Android, desktop Chrome/Edge).
 * - `ios`: iPhone/iPad, installed by hand from the Share menu ("Agregar a pantalla de inicio").
 * - `none`: already installed, a computer (install is only offered on phones and tablets),
 *   or the browser can't install web apps.
 */
@Service()
export class InstallApp {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly promptEvent = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);
  private readonly ios = signal(false);
  private readonly mobile = signal(false);
  private readonly dismissed = signal(true);

  readonly mode = computed<'prompt' | 'ios' | 'none'>(() => {
    if (this.installed() || !this.mobile()) return 'none';
    if (this.promptEvent()) return 'prompt';
    return this.ios() ? 'ios' : 'none';
  });
  /** Show the friendly banner: installable and not dismissed before. */
  readonly showBanner = computed(() => this.mode() !== 'none' && !this.dismissed());
  /** iPhone instructions dialog. */
  readonly iosHelpOpen = signal(false);

  constructor() {
    // Browser-only checks, after the first render so hydration matches the server HTML.
    afterNextRender(() => {
      const win = this.window;
      if (!win) return;
      const standalone =
        win.matchMedia?.('(display-mode: standalone)').matches ||
        (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
      this.installed.set(standalone);
      const nav = win.navigator as Navigator & { userAgentData?: { mobile: boolean } };
      const ua = nav.userAgent;
      // iPadOS reports itself as a Mac: tell them apart by the touch screen.
      const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && nav.maxTouchPoints > 1);
      const android = /android/i.test(ua);
      this.ios.set(ios);
      this.mobile.set(ios || android || nav.userAgentData?.mobile === true || /mobi/i.test(ua));
      this.dismissed.set(this.readDismissed());

      const takePrompt = () => this.promptEvent.set(win.__installPrompt ?? null);
      takePrompt();
      win.addEventListener('installpromptready', takePrompt);
      win.addEventListener('appinstalled', () => {
        this.installed.set(true);
        this.promptEvent.set(null);
      });
    });
  }

  /** Opens the native prompt or the iPhone instructions. Resolves true if the app was installed. */
  async install(): Promise<boolean> {
    const event = this.promptEvent();
    if (!event) {
      if (this.ios()) this.iosHelpOpen.set(true);
      return false;
    }
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only be used once.
    this.promptEvent.set(null);
    if (this.window) this.window.__installPrompt = undefined;
    return outcome === 'accepted';
  }

  dismissBanner(): void {
    this.dismissed.set(true);
    try {
      this.window?.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: the banner just comes back next time.
    }
  }

  private readDismissed(): boolean {
    try {
      return this.window?.localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
