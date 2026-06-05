import { device } from './device.js';
import { extractVersionNumber } from './encoding.js';
import { getWheels, addWheel, removeWheel } from './wheelLibrary.js';
import { batteryBar, gearView, layout, pwmDisplay, toggle } from './components.js';
import { navigate, getParams } from './router.js';

const STEP_DISTANCE = 5;
const STEP_DELAY = 50;
const DELAY_MIN = 200;
const DELAY_STEP = 50;

export const views = {
  '/': renderConnect,
  '/home': renderHome,
  '/settings': renderSettings,
  '/settings/quick-shift': renderQuickShift,
  '/settings/auto-shutdown': renderAutoShutdown,
  '/settings/overshoot': renderOvershoot,
  '/settings/metrics': renderMetrics,
  '/settings/home-gear': renderHomeGear,
  '/settings/shift': renderManualShift,
  '/settings/wheels': renderWheels,
  '/settings/pair-remote': () => renderInfo('Pair Remote',
    'When you tap Proceed, the shifter will restart automatically. Then turn on your remote. Once the orange light on the remote flashes, you\'re good to go!',
    ['Tap Proceed below', 'Turn the shifter on if needed', 'Turn on the remote', 'Wait for the orange light to flash'],
    'Proceed', () => alert('Shifter restart initiated. Pair your remote now.')),
  '/settings/cable': () => renderInfo('Change Shifter Cable',
    'Before you start, loosen your shift cable at the derailleur or take your chain off.',
    ['Loosen the shift cable at the derailleur', 'Swap out your shift cable and replace the maintenance door cover', 'Tap Finished when done'],
    'Finished', () => history.back()),
  '/config/new': renderGearSelect,
  '/config/setup': () => renderShiftConfig('new'),
  '/config/update': () => renderShiftConfig('update'),
};

export function mountView(route) {
  const mount = mounts[route];
  if (mount) mount(document.getElementById('app'));
}

const mounts = {
  '/': mountConnect,
  '/home': mountHome,
  '/settings': mountSettings,
  '/settings/quick-shift': mountQuickShift,
  '/settings/auto-shutdown': mountAutoShutdown,
  '/settings/overshoot': mountOvershoot,
  '/settings/metrics': mountMetrics,
  '/settings/home-gear': mountHomeGear,
  '/settings/shift': mountManualShift,
  '/settings/wheels': mountWheels,
  '/config/new': mountGearSelect,
  '/config/setup': mountShiftConfig,
  '/config/update': mountShiftConfig,
};

function renderConnect() {
  const ble = device.webBluetoothAvailable;
  return `<div class="connect-page">
    <div class="connect-page__panel">
      <div class="connect-page__brand">
        <div class="connect-page__logo">A</div>
        <h1>Archer Components</h1>
        <p>D1x Trail Configuration Tool</p>
      </div>
      <div class="connect-page__content">
        <p class="connect-page__desc">Configure shift points, Quick Shift, auto-shutdown, and more for your Archer D1x electronic shifter.</p>
        ${!ble ? '<div class="alert alert--warning">Web Bluetooth is not available. Use Chrome or Edge, or try Demo Mode.</div>' : ''}
        <div id="connect-error"></div>
        <div class="btn-grid">
          ${ble ? '<button class="btn btn--primary" id="btn-connect">Connect to Shifter</button>' : ''}
          <button class="btn btn--secondary" id="btn-demo">Try Demo Mode</button>
        </div>
        <div class="connect-page__chips">
          <span class="chip">Chrome & Edge</span>
          <span class="chip">Demo mode available</span>
        </div>
      </div>
    </div>
  </div>`;
}

function mountConnect(root) {
  root.querySelector('#btn-connect')?.addEventListener('click', async () => {
    const err = root.querySelector('#connect-error');
    try {
      await device.connect();
      navigate('/home');
    } catch (e) {
      if (err) err.innerHTML = `<div class="alert alert--warning">${e.message || 'Connection failed'}</div>`;
    }
  });
  root.querySelector('#btn-demo')?.addEventListener('click', async () => {
    await device.connectDemo();
    navigate('/home');
  });
}

function renderHome() {
  if (!device.connected) { navigate('/'); return ''; }
  const badge = device.demoMode ? 'badge--demo' : 'badge--connected';
  const badgeText = device.demoMode ? 'Demo Mode' : 'Connected';
  return layout('Home', `
    <div class="home-page__status">
      <span class="badge ${badge}">${badgeText}</span>
      <span class="home-page__device">${device.deviceName}</span>
    </div>
    <div class="card">
      ${batteryBar(device.getByte('BattShifter'), 'Shifter')}
      ${batteryBar(device.getByte('BattRemote'), 'Remote')}
    </div>
    <div class="btn-grid">
      <a class="btn btn--primary" href="#/config/new">New Configuration</a>
      <a class="btn btn--secondary" href="#/config/update">Update Configuration</a>
      <a class="btn btn--outline" href="#/settings">Settings</a>
      <button class="btn btn--ghost" id="btn-disconnect">Disconnect &amp; Ride</button>
    </div>`, { showBack: false });
}

function mountHome(root) {
  device.readMultiple(['BattRemote', 'BattShifter']);
  root.querySelector('#btn-disconnect')?.addEventListener('click', async () => {
    await device.disconnect();
    navigate('/');
  });
}

function renderSettings() {
  const fw = device.getString('ShifterFirmwareVersion');
  const showOvershoot = device.supports('OvershootEnable') && !extractVersionNumber(fw).endsWith('0.26');
  const lowPowerOn = device.getByte('LowPowerMode') === 1;
  const isGen2 = device.isGen2;
  const lowPowerSection = !isGen2 ? `
    <div class="setting-row" id="row-lowpower">
      <span class="setting-row__label">Low Power Mode</span>
      ${toggle(lowPowerOn, 'sw-lowpower')}
    </div>` : '';
  const settingsLinks = (!lowPowerOn || isGen2) ? `
    <a class="setting-row" href="#/settings/quick-shift"><span class="setting-row__label">Quick Shift</span><span class="setting-row__value">${device.getByte('QuickShiftState') === 1 ? 'ON' : 'OFF'} →</span></a>
    <a class="setting-row" href="#/settings/auto-shutdown"><span class="setting-row__label">Shutdown and Wake Up</span><span class="setting-row__value">${device.getByte('AutoShutDown')} min →</span></a>
    <a class="setting-row" href="#/settings/home-gear"><span class="setting-row__label">Get Me Home Gear</span><span class="setting-row__value">${device.getByte('HomeGear') > 0 ? 'ON' : 'OFF'} →</span></a>`
    : '<p class="card__desc" style="color:#c00">Low Power Mode is ON — Get Me Home Gear and Auto Shutdown are disabled.</p>';

  return layout('Settings', `
    <div class="card">
      <div class="setting-row"><span class="setting-row__label">Reverse Shift Button</span>${toggle(device.getByte('SwitchOrder') === 1, 'sw-reverse')}</div>
      ${lowPowerSection}
      ${settingsLinks}
    </div>
    <div class="card">
      <a class="setting-row" href="#/settings/shift"><span class="setting-row__label">Manual Shift</span><span>→</span></a>
      <a class="setting-row" href="#/settings/pair-remote"><span class="setting-row__label">Pair Remote</span><span>→</span></a>
      <a class="setting-row" href="#/settings/cable"><span class="setting-row__label">Change Shifter Cable</span><span>→</span></a>
      ${showOvershoot ? '<a class="setting-row" href="#/settings/overshoot"><span class="setting-row__label">Overshoot</span><span>→</span></a>' : ''}
      <a class="setting-row" href="#/settings/metrics"><span class="setting-row__label">Metrics</span><span>→</span></a>
      <a class="setting-row" href="#/settings/wheels"><span class="setting-row__label">Saved Wheel Library</span><span>→</span></a>
    </div>
    ${fw ? `<div class="card"><p class="card__desc" style="margin:0">Firmware: ${fw}</p></div>` : ''}`);
}

function mountSettings(root) {
  device.readMultiple(['HomeGear', 'AutoShutDown', 'SwitchOrder', 'LowPowerMode', 'ShifterFirmwareVersion', 'OvershootEnable']);
  root.querySelector('#sw-reverse')?.addEventListener('change', async (e) => {
    await device.write('SwitchOrder', e.target.checked ? 1 : 0);
    await device.read('SwitchOrder');
  });
  root.querySelector('#sw-lowpower')?.addEventListener('change', async (e) => {
    await device.write('LowPowerMode', e.target.checked ? 1 : 0);
    await device.read('LowPowerMode');
    navigate('/settings');
  });
}

function renderQuickShift() {
  const enabled = device.getByte('QuickShiftState') === 1;
  const delay = device.getShort('QuickShiftDelay', 350);
  const progress = Math.round((delay - DELAY_MIN) / DELAY_STEP);
  const up = device.getByte('QuickShiftUp');
  const down = device.getByte('QuickShiftDown');
  return layout('Quick Shift', `
    <div class="card"><div class="setting-row"><span>Quick Shift</span>${toggle(enabled, 'sw-qs')}</div></div>
    <div class="card" style="opacity:${enabled ? 1 : 0.4}">
      <div class="slider-group"><label><span>Button Press Delay</span><span id="delay-val">${delay}ms</span></label>
        <input type="range" id="delay-slider" min="0" max="8" value="${progress}" ${enabled ? '' : 'disabled'}></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
        <div><p class="card__title">Shift Up</p><div class="stepper"><button id="up-minus" ${!enabled || up <= 0 ? 'disabled' : ''}>−</button><span class="stepper__value">${up + 1}</span><button id="up-plus" ${!enabled || up >= 4 ? 'disabled' : ''}>+</button></div></div>
        <div><p class="card__title">Shift Down</p><div class="stepper"><button id="dn-minus" ${!enabled || down <= 0 ? 'disabled' : ''}>−</button><span class="stepper__value">${down + 1}</span><button id="dn-plus" ${!enabled || down >= 4 ? 'disabled' : ''}>+</button></div></div>
      </div>
    </div>`);
}

function mountQuickShift(root) {
  device.readMultiple(['QuickShiftState', 'QuickShiftDelay', 'QuickShiftUp', 'QuickShiftDown']);
  root.querySelector('#sw-qs')?.addEventListener('change', async (e) => {
    await device.write('QuickShiftState', e.target.checked ? 1 : 0);
    await device.read('QuickShiftState');
    navigate('/settings/quick-shift');
  });
  root.querySelector('#delay-slider')?.addEventListener('input', async (e) => {
    const delay = parseInt(e.target.value, 10) * DELAY_STEP + DELAY_MIN;
    root.querySelector('#delay-val').textContent = delay + 'ms';
    await device.write('QuickShiftDelay', delay);
  });
  const adj = async (key, delta) => {
    let v = device.getByte(key) + delta;
    if (v < 0) v = 0; if (v > 4) v = 4;
    await device.write(key, v);
    await device.read(key);
    navigate('/settings/quick-shift');
  };
  root.querySelector('#up-minus')?.addEventListener('click', () => adj('QuickShiftUp', -1));
  root.querySelector('#up-plus')?.addEventListener('click', () => adj('QuickShiftUp', 1));
  root.querySelector('#dn-minus')?.addEventListener('click', () => adj('QuickShiftDown', -1));
  root.querySelector('#dn-plus')?.addEventListener('click', () => adj('QuickShiftDown', 1));
}

function renderAutoShutdown() {
  const shutdown = device.getByte('AutoShutDown', 30);
  const wakeup = device.getShort('MotionThreshold', 12000);
  const wakeupSection = device.isGen2 ? `
    <div class="card"><p class="card__desc">Tune the force required to wake the shifter after auto shutdown.</p>
      <div class="slider-group"><label><span>Wake Up Force</span><span id="wakeup-val">${wakeup}</span></label>
        <input type="range" id="wakeup-slider" min="5000" max="25000" value="${wakeup}">
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#888"><span>Light</span><span>Hard</span></div>
      </div>
    </div>` : '';
  return layout('Shutdown and Wake Up', `
    <div class="card"><p class="card__desc">The shifter shuts down after your bike has been stationary for a period of time.</p>
      <div class="slider-group"><label><span>Auto Shutdown Timer</span><span id="shutdown-val">${shutdown} min</span></label>
        <input type="range" id="shutdown-slider" min="1" max="179" value="${shutdown}"></div>
    </div>${wakeupSection}
    <button class="btn btn--primary" id="btn-save">Done</button>`);
}

function mountAutoShutdown(root) {
  device.readMultiple(['AutoShutDown', 'MotionThreshold']);
  let shutdown = device.getByte('AutoShutDown', 30);
  let wakeup = device.getShort('MotionThreshold', 12000);
  root.querySelector('#shutdown-slider')?.addEventListener('input', (e) => {
    shutdown = parseInt(e.target.value, 10);
    root.querySelector('#shutdown-val').textContent = shutdown + ' min';
  });
  root.querySelector('#wakeup-slider')?.addEventListener('input', (e) => {
    wakeup = parseInt(e.target.value, 10);
    root.querySelector('#wakeup-val').textContent = wakeup;
  });
  root.querySelector('#btn-save')?.addEventListener('click', async () => {
    await device.write('AutoShutDown', shutdown);
    if (device.isGen2) await device.write('MotionThreshold', wakeup);
    navigate('/settings');
  });
}

function renderOvershoot() {
  const enabled = device.getByte('OvershootEnable') === 1;
  const dd = device.getByte('OvershootDownDistance');
  const ddel = device.getShort('OvershootDownDelay');
  const ud = device.getByte('OvershootUpDistance');
  const udel = device.getShort('OvershootUpDelay');
  return layout('Overshoot', `
    <div class="alert alert--warning">Overshoot makes the motor fly past each shift point and return after a delay. Test in a controlled environment first.</div>
    <div class="card"><div class="setting-row"><span>Enable Overshoot</span>${toggle(enabled, 'sw-os')}</div></div>
    <div class="card" style="opacity:${enabled ? 1 : 0.4}">
      <p class="card__title">Shift Down</p>
      <div class="slider-group"><label><span>Distance</span><span>${dd}</span></label><input type="range" class="os-slider" data-key="OvershootDownDistance" data-step="${STEP_DISTANCE}" min="0" max="20" value="${dd / STEP_DISTANCE}" ${enabled ? '' : 'disabled'}></div>
      <div class="slider-group"><label><span>Delay</span><span>${ddel}ms</span></label><input type="range" class="os-slider" data-key="OvershootDownDelay" data-step="${STEP_DELAY}" min="0" max="40" value="${ddel / STEP_DELAY}" ${enabled ? '' : 'disabled'}></div>
      <p class="card__title">Shift Up</p>
      <div class="slider-group"><label><span>Distance</span><span>${ud}</span></label><input type="range" class="os-slider" data-key="OvershootUpDistance" data-step="${STEP_DISTANCE}" min="0" max="20" value="${ud / STEP_DISTANCE}" ${enabled ? '' : 'disabled'}></div>
      <div class="slider-group"><label><span>Delay</span><span>${udel}ms</span></label><input type="range" class="os-slider" data-key="OvershootUpDelay" data-step="${STEP_DELAY}" min="0" max="40" value="${udel / STEP_DELAY}" ${enabled ? '' : 'disabled'}></div>
    </div>`);
}

function mountOvershoot(root) {
  device.readMultiple(['OvershootEnable', 'OvershootDownDistance', 'OvershootDownDelay', 'OvershootUpDistance', 'OvershootUpDelay']);
  root.querySelector('#sw-os')?.addEventListener('change', async (e) => {
    await device.write('OvershootEnable', e.target.checked ? 1 : 0);
    await device.read('OvershootEnable');
    navigate('/settings/overshoot');
  });
  root.querySelectorAll('.os-slider').forEach((el) => {
    el.addEventListener('change', async (e) => {
      const key = e.target.dataset.key;
      const step = parseInt(e.target.dataset.step, 10);
      const val = parseInt(e.target.value, 10) * step;
      await device.write(key, val);
      await device.read(key);
      navigate('/settings/overshoot');
    });
  });
}

function renderMetrics() {
  const odometer = device.getInt('Odometer');
  const shiftCounter = device.getInt('ShiftCounter');
  const total = odometer + shiftCounter;
  const voltage = device.getShort('ShiftBatteryVoltage') / 1000;
  const lastReset = device.state.LastResetDate;
  const dateStr = lastReset instanceof Date
    ? lastReset.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const lrv = parseInt(localStorage.getItem('archer_last_reset_voltage') ?? '0', 10) / 1000;
  return layout('Metrics', `
    <div class="card">
      <div class="setting-row"><span>Last Reset Date</span><span>${dateStr}</span></div>
      <div class="setting-row"><span>Number of Shifts</span><span>${shiftCounter}</span></div>
      <div class="setting-row"><span>Odometer (total)</span><span>${total}</span></div>
      <div class="setting-row"><span>Low Power Mode</span><span>${device.getByte('LowPowerMode') === 1 ? 'ON' : 'OFF'}</span></div>
      <div class="setting-row"><span>Current Shift Voltage</span><span>${voltage.toFixed(2)} V</span></div>
      <div class="setting-row"><span>Last Reset Voltage</span><span>${lrv > 0 ? lrv.toFixed(2) + ' V' : '—'}</span></div>
      <div class="setting-row"><span>Shifter Firmware</span><span>${device.getString('ShifterFirmwareVersion') || '—'}</span></div>
      <div class="setting-row"><span>Remote Firmware</span><span>${device.getString('RemoteFiremwareVersion') || '—'}</span></div>
    </div>
    <button class="btn btn--outline" id="btn-reset">Reset Shift Counter</button>`);
}

function mountMetrics(root) {
  device.readMultiple(['LastResetDate', 'ShiftCounter', 'Odometer', 'LowPowerMode', 'ShifterFirmwareVersion', 'RemoteFiremwareVersion', 'ShiftBatteryVoltage']);
  root.querySelector('#btn-reset')?.addEventListener('click', async () => {
    const total = device.getInt('Odometer') + device.getInt('ShiftCounter');
    const now = new Date();
    await device.write('ShiftCounter', 0);
    await device.write('Odometer', total);
    await device.write('LastResetDate', now);
    localStorage.setItem('archer_last_reset_voltage', String(device.getShort('ShiftBatteryVoltage')));
    navigate('/settings/metrics');
  });
}

function renderHomeGear() {
  const homeGear = device.getByte('HomeGear');
  const numGears = device.getByte('NumGears', 12);
  if (homeGear === 0) {
    return layout('Get Me Home Gear', `
      <div class="card"><p class="card__desc">When batteries run low, the system shifts you into a gear you select here so you can pedal home safely.</p>
        <button class="btn btn--primary" id="btn-enable">Enable Get Me Home Gear</button></div>`);
  }
  return layout('Get Me Home Gear', `
    <div class="card">${gearView(numGears, homeGear, 'lg')}
      <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem">
        <button class="btn btn--outline" id="gear-down" style="width:auto">▼ Down</button>
        <button class="btn btn--outline" id="gear-up" style="width:auto">▲ Up</button>
      </div>
      <p style="text-align:center;margin-top:0.5rem">Gear ${homeGear}</p>
    </div>
    <button class="btn btn--ghost" id="btn-disable">Disable Get Me Home Gear</button>`);
}

function mountHomeGear(root) {
  device.readMultiple(['NumGears', 'HomeGear']);
  root.querySelector('#btn-enable')?.addEventListener('click', async () => {
    await device.write('HomeGear', 1);
    await device.read('HomeGear');
    navigate('/settings/home-gear');
  });
  root.querySelector('#btn-disable')?.addEventListener('click', async () => {
    await device.write('HomeGear', 0);
    navigate('/settings');
  });
  root.querySelector('#gear-down')?.addEventListener('click', async () => {
    await device.adjustHomeGear(-1);
    navigate('/settings/home-gear');
  });
  root.querySelector('#gear-up')?.addEventListener('click', async () => {
    await device.adjustHomeGear(1);
    navigate('/settings/home-gear');
  });
}

function renderManualShift() {
  const num = device.getByte('NumGears', 12);
  const cur = device.getByte('CurrentGear', 1);
  return layout('Manual Shift', `
    <div class="card">${gearView(num, cur, 'lg')}
      <p style="text-align:center;font-weight:700;margin-top:1rem">Gear ${cur} / ${num}</p>
      <div style="display:flex;gap:0.5rem;margin-top:1rem">
        <button class="btn btn--secondary" id="gear-down" ${cur <= 1 ? 'disabled' : ''}>▼ Down</button>
        <button class="btn btn--secondary" id="gear-up" ${cur >= num ? 'disabled' : ''}>▲ Up</button>
      </div>
    </div>`);
}

function mountManualShift(root) {
  device.readMultiple(['NumGears', 'CurrentGear']);
  root.querySelector('#gear-down')?.addEventListener('click', async () => {
    await device.shiftGear(-1);
    navigate('/settings/shift');
  });
  root.querySelector('#gear-up')?.addEventListener('click', async () => {
    await device.shiftGear(1);
    navigate('/settings/shift');
  });
}

function renderWheels() {
  const wheels = getWheels();
  const list = wheels.length === 0
    ? '<p class="card__desc" style="text-align:center">No Saved Wheels</p>'
    : wheels.map((w) => `<div class="card"><p class="card__title">${w.name}</p><p class="card__desc">Gears: ${w.numGears}<br>Saved: ${new Date(w.date).toLocaleDateString()}</p>
        <button class="btn btn--outline btn-delete" data-id="${w.id}">Delete</button></div>`).join('');
  return layout('Saved Wheel Library', `${list}<button class="btn btn--primary" id="btn-save">Save Current Configuration</button>`);
}

function mountWheels(root) {
  root.querySelector('#btn-save')?.addEventListener('click', async () => {
    const name = prompt('Name this configuration:');
    if (!name) return;
    await device.readMultiple(['NumGears', 'CurrentPWM']);
    const num = device.getByte('NumGears', 12);
    const pwm = device.getShort('CurrentPWM', 1960);
    addWheel(name, num, Array(num).fill(pwm));
    navigate('/settings/wheels');
  });
  root.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this?')) {
        removeWheel(parseInt(btn.dataset.id, 10));
        navigate('/settings/wheels');
      }
    });
  });
}

function renderGearSelect() {
  const params = getParams();
  const num = params.numGears ?? 12;
  return layout('New Configuration', `
    <div class="alert alert--warning">Before you start, loosen your shift cable at the derailleur or take your chain off.</div>
    <div class="card"><p class="card__title">Number of Gears</p>
      ${gearView(num, 1, 'lg')}
      <div class="stepper" style="justify-content:center;margin:1rem 0">
        <button id="gear-minus">−</button><span class="stepper__value" id="gear-count">${num}</span><button id="gear-plus">+</button>
      </div>
      <p class="card__desc" style="text-align:center">${num}-speed cassette</p>
    </div>
    <button class="btn btn--primary" id="btn-next">Next</button>`);
}

function mountGearSelect(root) {
  let num = getParams().numGears ?? 12;
  const countEl = root.querySelector('#gear-count');
  const descEl = root.querySelector('.card__desc');
  const cassette = root.querySelector('.gear-view__cassette');
  const updateDom = () => {
    if (countEl) countEl.textContent = num;
    if (descEl) descEl.textContent = num + '-speed cassette';
    if (cassette) {
      cassette.innerHTML = Array.from({ length: num }, (_, i) => {
        const g = i + 1;
        const active = g === 1 ? ' gear-view__cog--active' : '';
        const width = 40 + (g / num) * 60;
        return `<div class="gear-view__cog${active}" style="width:${width}px"><span class="gear-view__label">${g}</span></div>`;
      }).join('');
    }
  };
  root.querySelector('#gear-minus')?.addEventListener('click', () => { num = Math.max(1, num - 1); updateDom(); });
  root.querySelector('#gear-plus')?.addEventListener('click', () => { num = Math.min(20, num + 1); updateDom(); });
  root.querySelector('#btn-next')?.addEventListener('click', async () => {
    await device.write('CurrentGear', 1);
    await device.write('CurrentPWM', 1960);
    navigate('/config/setup', { numGears: num, mode: 'new' });
  });
}

function renderShiftConfig(mode) {
  const params = getParams();
  const m = mode || params.mode || 'update';
  const num = params.numGears ?? device.getByte('NumGears', 12);
  const cur = device.getByte('CurrentGear', 1);
  const pwm = device.getShort('CurrentPWM', 1960);
  return layout('Shift Point Configuration', `
    <div class="alert alert--warning">Remove your chain or use a bike stand before moving the derailleur!</div>
    <div class="card">${gearView(num, cur, 'lg')}<p style="text-align:center;font-weight:700">Gear ${cur} / ${num}</p></div>
    <div class="card"><p class="card__title">Position (PWM)</p>${pwmDisplay(pwm)}
      <div class="pwm-controls">
        <button class="btn btn--outline" data-pwm="-20" data-os="-15">−−</button>
        <button class="btn btn--outline" data-pwm="-20">−</button>
        <button class="btn btn--outline" data-pwm="20">+</button>
        <button class="btn btn--outline" data-pwm="20" data-os="0">++</button>
      </div>
    </div>
    <div class="card"><p class="card__title">Move Derailleur</p>
      <div style="display:flex;gap:0.5rem">
        <button class="btn btn--secondary" id="gear-down" ${cur <= 1 ? 'disabled' : ''}>▼ Gear Down</button>
        <button class="btn btn--secondary" id="gear-up" ${cur >= num ? 'disabled' : ''}>▲ Gear Up</button>
      </div>
    </div>
    <button class="btn btn--primary" id="btn-done">Done</button>`, { showBack: true });
}

function mountShiftConfig(root) {
  const params = getParams();
  if (params.mode === 'new' && params.numGears) {
    device.write('NumGears', params.numGears);
    device.write('CurrentGear', 1);
  }
  device.readMultiple(['NumGears', 'CurrentGear', 'CurrentPWM']);
  root.querySelectorAll('[data-pwm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const delta = parseInt(btn.dataset.pwm, 10);
      const os = btn.dataset.os !== undefined ? parseInt(btn.dataset.os, 10) : 0;
      await device.adjustPwm(delta, os);
      navigate(location.hash.slice(1), params);
    });
  });
  root.querySelector('#gear-down')?.addEventListener('click', async () => {
    await device.shiftGear(-1);
    navigate(location.hash.slice(1), params);
  });
  root.querySelector('#gear-up')?.addEventListener('click', async () => {
    await device.shiftGear(1);
    navigate(location.hash.slice(1), params);
  });
  root.querySelector('#btn-done')?.addEventListener('click', () => navigate('/home'));
}

function renderInfo(title, desc, steps, actionLabel, onAction) {
  const stepsHtml = steps ? `<ol style="padding-left:1.25rem;line-height:1.8;color:#555">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : '';
  return layout(title, `
    <div class="card"><p class="card__desc">${desc}</p>${stepsHtml}</div>
    <button class="btn btn--primary" id="btn-action">${actionLabel}</button>`);
}

// Info pages with actions mounted via route-specific mounts
mounts['/settings/pair-remote'] = (root) => {
  root.querySelector('#btn-action')?.addEventListener('click', () => alert('Shifter restart initiated. Pair your remote now.'));
};
mounts['/settings/cable'] = (root) => {
  root.querySelector('#btn-action')?.addEventListener('click', () => history.back());
};
