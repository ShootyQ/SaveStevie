import { Capacitor, SystemBars } from '@capacitor/core';
import { App } from '@capacitor/app';
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native-app');
  window.dispatchEvent(new Event('resize'));
  const immerse = () => SystemBars.hide().catch(() => {});
  immerse();
  App.addListener('backButton', () => {
    const menu = document.getElementById('startOverlay');
    const dialog = Array.from(document.querySelectorAll('.build-overlay')).find(el => getComputedStyle(el).display !== 'none');
    if (menu && getComputedStyle(menu).display !== 'none' && !dialog) App.exitApp();
    else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  });
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) { immerse(); window.dispatchEvent(new Event('savestevie:foreground')); }
    else window.dispatchEvent(new Event('savestevie:background'));
  });
}
