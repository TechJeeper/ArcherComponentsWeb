import { pwmToDisplay } from './encoding.js';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function gearView(numGears, currentGear, size = 'md') {
  const gears = Array.from({ length: Math.max(numGears, 1) }, (_, i) => i + 1);
  const cogs = gears.map((g) => {
    const active = g === currentGear ? ' gear-view__cog--active' : '';
    const width = 40 + (g / numGears) * 60;
    return `<div class="gear-view__cog${active}" style="--cog-index:${g};--total:${numGears};width:${width}px">
      <span class="gear-view__label">${g}</span>
    </div>`;
  }).join('');
  return `<div class="gear-view gear-view--${size}">
    <div class="gear-view__cassette">${cogs}</div>
    <div class="gear-view__derailleur"></div>
  </div>`;
}

export function batteryBar(level, label) {
  const pct = Math.min(100, Math.max(0, level));
  const color = pct > 50 ? 'green' : pct > 20 ? 'yellow' : 'red';
  return `<div class="battery-bar">
    <span class="battery-bar__label">${escapeHtml(label)}</span>
    <div class="battery-bar__shell">
      <div class="battery-bar__fill battery-bar__fill--${color}" style="width:${pct}%"></div>
    </div>
    <span class="battery-bar__pct">${pct}%</span>
  </div>`;
}

export function toggle(checked, id = 'toggle') {
  return `<label class="toggle">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
    <span class="toggle__slider"></span>
  </label>`;
}

export function layout(title, content, { showBack = true, fullPage = false } = {}) {
  if (fullPage) return content;
  return `<div class="layout">
    <header class="layout__header">
      ${showBack ? '<button class="layout__back" data-action="back" aria-label="Back">←</button>' : '<span class="layout__spacer"></span>'}
      <h1 class="layout__title">${escapeHtml(title)}</h1>
      <a class="layout__home" href="#/home" aria-label="Home">⌂</a>
    </header>
    <main class="layout__main">${content}</main>
  </div>`;
}

export function pwmDisplay(pwm) {
  return `<div class="pwm-display">${pwmToDisplay(pwm)}<small>display value (2000 − PWM)</small></div>`;
}
