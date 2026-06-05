import { archerBle } from './archerBle.js';
import { clampPwm, extractMainVersion, extractVersionNumber } from './encoding.js';

export const device = {
  get connected() { return archerBle.connected; },
  get demoMode() { return archerBle.demoMode; },
  get deviceName() { return archerBle.deviceName; },
  get webBluetoothAvailable() { return archerBle.isWebBluetoothAvailable; },
  get state() { return archerBle.getState(); },

  connect: () => archerBle.connect(),
  connectDemo: () => archerBle.connectDemo(),
  disconnect: () => archerBle.disconnect(),
  read: (key) => archerBle.readData(key),
  write: (key, val) => archerBle.sendData(key, val),
  readMultiple: (keys) => archerBle.readMultiple(keys),
  supports: (key) => archerBle.supportsCharacteristic(key),

  getByte(key, fallback = 0) {
    const v = archerBle.state[key];
    return typeof v === 'number' ? v : fallback;
  },

  getShort(key, fallback = 0) {
    const v = archerBle.state[key];
    return typeof v === 'number' ? v : fallback;
  },

  getInt(key, fallback = 0) {
    const v = archerBle.state[key];
    return typeof v === 'number' ? v : fallback;
  },

  getString(key) {
    const v = archerBle.state[key];
    return typeof v === 'string' ? v : '';
  },

  get isGen2() {
    const fw = this.getString('ShifterFirmwareVersion');
    return extractMainVersion(extractVersionNumber(fw)) >= 1;
  },

  async shiftGear(delta) {
    const numGears = this.getByte('NumGears', 1);
    let gear = this.getByte('CurrentGear', 1) + delta;
    if (gear < 1) gear = 1;
    if (gear > numGears) gear = numGears;
    await archerBle.sendData('CurrentGear', gear);
    await archerBle.readData('CurrentGear');
    return gear;
  },

  async adjustHomeGear(delta) {
    const numGears = this.getByte('NumGears', 1);
    let gear = this.getByte('HomeGear', 1) + delta;
    if (gear < 1) gear = 1;
    if (gear > numGears) gear = numGears;
    await archerBle.sendData('HomeGear', gear);
    await archerBle.readData('HomeGear');
    return gear;
  },

  async adjustPwm(delta, overshoot = 0) {
    let pwm = this.getShort('CurrentPWM', 1960);
    if (overshoot !== 0) await archerBle.sendData('CurrentPWM', clampPwm(pwm + overshoot));
    pwm = clampPwm(pwm + delta + overshoot);
    await archerBle.sendData('CurrentPWM', pwm);
    await archerBle.readData('CurrentPWM');
  },

  onStateChange(cb) { return archerBle.onStateChange(cb); },
  onConnectionChange(cb) { return archerBle.onConnectionChange(cb); },
};
