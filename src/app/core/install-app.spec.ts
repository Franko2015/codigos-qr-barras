import { TestBed } from '@angular/core/testing';
import { InstallApp } from './install-app';

const UA = {
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

function setup(userAgent: string, withPrompt: boolean): InstallApp {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
  window.__installPrompt = withPrompt
    ? (Object.assign(new Event('beforeinstallprompt'), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      }) as Window['__installPrompt'])
    : undefined;
  localStorage.clear();
  const installer = TestBed.inject(InstallApp);
  TestBed.tick(); // runs afterNextRender
  return installer;
}

describe('InstallApp', () => {
  afterEach(() => {
    window.__installPrompt = undefined;
  });

  it('never offers installing on a computer, even if the browser could', () => {
    const installer = setup(UA.windows, true);
    expect(installer.mode()).toBe('none');
    expect(installer.showBanner()).toBe(false);
  });

  it('offers the native prompt on Android phones', () => {
    const installer = setup(UA.android, true);
    expect(installer.mode()).toBe('prompt');
    expect(installer.showBanner()).toBe(true);
    installer.dismissBanner();
    expect(installer.showBanner()).toBe(false);
  });

  it('offers instructions on iPhone', async () => {
    const installer = setup(UA.iphone, false);
    expect(installer.mode()).toBe('ios');
    await installer.install();
    expect(installer.iosHelpOpen()).toBe(true);
  });
});
