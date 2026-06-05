const routes = new Map();
let currentParams = {};
let onRender = null;

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function navigate(path, params = {}) {
  currentParams = params;
  const hash = path.startsWith('/') ? path : `/${path}`;
  if (location.hash !== `#${hash}`) {
    location.hash = hash;
  } else if (onRender) {
    onRender();
  }
}

export function getParams() {
  return currentParams;
}

export function back() {
  history.back();
}

export function getRoute() {
  const hash = location.hash.slice(1) || '/';
  return hash.split('?')[0];
}

export function render() {
  const route = getRoute();
  const handler = routes.get(route) || routes.get('/');
  const app = document.getElementById('app');
  if (handler && app) {
    app.innerHTML = handler();
    app.querySelector('[data-action="back"]')?.addEventListener('click', back);
  }
}

export function initRouter(renderCallback) {
  onRender = renderCallback;
  window.addEventListener('hashchange', () => onRender?.());
  onRender();
}
