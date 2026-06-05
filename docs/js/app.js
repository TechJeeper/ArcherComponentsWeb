import { device } from './device.js';
import { initRouter, registerRoute, getRoute } from './router.js';
import { views, mountView } from './views.js';

for (const [path, handler] of Object.entries(views)) {
  registerRoute(path, () => {
    if (path !== '/' && !device.connected) {
      location.hash = '#/';
      return '';
    }
    return handler();
  });
}

function renderApp() {
  const route = getRoute();
  if (route !== '/' && route !== '/home' && !device.connected) {
    location.hash = '#/';
    return;
  }
  const handler = views[route] || views['/'];
  const app = document.getElementById('app');
  if (handler && app) {
    app.innerHTML = handler();
    app.querySelector('[data-action="back"]')?.addEventListener('click', () => history.back());
    mountView(route);
  }
}

device.onStateChange(() => {
  const route = getRoute();
  const live = ['/home', '/settings', '/settings/quick-shift', '/settings/metrics',
    '/settings/shift', '/config/setup', '/config/update'];
  if (live.some((r) => route === r || route.startsWith(r + '/'))) renderApp();
});

device.onConnectionChange((connected) => {
  if (!connected && getRoute() !== '/') location.hash = '#/';
});

initRouter(renderApp);
