import { CHARACTERISTICS, SERVICE_UUID } from './characteristics.js';
import {
  decodeByte, decodeDate, decodeInt, decodeShort, decodeString,
  encodeByte, encodeDate, encodeInt, encodeShort,
} from './encoding.js';

class ArcherBleManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristics = new Map();
    this.state = {};
    this.stateListeners = new Set();
    this.connectionListeners = new Set();
    this.commandQueue = [];
    this.processing = false;
    this.demoMode = false;
  }

  get isWebBluetoothAvailable() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  get connected() {
    return this.demoMode || (this.server?.connected ?? false);
  }

  get deviceName() {
    return this.device?.name ?? (this.demoMode ? 'Archer_Components (Demo)' : '');
  }

  getState() {
    return { ...this.state };
  }

  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onConnectionChange(listener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  notifyState(key, value) {
    this.state[key] = value;
    this.stateListeners.forEach((l) => l(key, value));
  }

  notifyConnection(connected) {
    this.connectionListeners.forEach((l) => l(connected));
  }

  parseValue(key, buffer) {
    const type = CHARACTERISTICS[key].type;
    switch (type) {
      case 'byte': return decodeByte(buffer);
      case 'short': return decodeShort(buffer);
      case 'int': return decodeInt(buffer);
      case 'string': return decodeString(buffer, key);
      case 'date': return decodeDate(buffer);
      default: return null;
    }
  }

  encodeValue(key, value) {
    const type = CHARACTERISTICS[key].type;
    switch (type) {
      case 'byte': return encodeByte(value);
      case 'short': return encodeShort(value);
      case 'int': return encodeInt(value);
      case 'date': return encodeDate(value);
      case 'string': return new TextEncoder().encode(String(value));
      default: return new Uint8Array();
    }
  }

  enqueue(fn) {
    this.commandQueue.push(fn);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift();
      try { await cmd(); } catch (e) { console.error('BLE command failed:', e); }
    }
    this.processing = false;
  }

  async connect() {
    if (!this.isWebBluetoothAvailable) {
      throw new Error('Web Bluetooth is not available in this browser');
    }
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    await this.attachDevice(device);
  }

  async connectDemo() {
    this.demoMode = true;
    this.device = { name: 'Archer_Components (Demo)' };
    this.state = {
      NumGears: 12, CurrentGear: 1, CurrentPWM: 1960, HomeGear: 6,
      BattRemote: 85, BattShifter: 72, AutoShutDown: 30, SwitchOrder: 0,
      LowPowerMode: 0, QuickShiftState: 0, QuickShiftUp: 2, QuickShiftDown: 2,
      QuickShiftDelay: 350, OvershootEnable: 0, OvershootDownDistance: 10,
      OvershootDownDelay: 100, OvershootUpDistance: 10, OvershootUpDelay: 100,
      ShifterFirmwareVersion: 'v1.2.0', RemoteFiremwareVersion: 'v1.0.5',
      ShiftCounter: 142, Odometer: 1250, ShiftBatteryVoltage: 3850,
      MotionThreshold: 12000, LastResetDate: new Date('2025-03-15'),
    };
    Object.entries(this.state).forEach(([key, value]) => this.notifyState(key, value));
    this.notifyConnection(true);
  }

  async attachDevice(device) {
    this.demoMode = false;
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      this.characteristics.clear();
      this.state = {};
      this.notifyConnection(false);
    });
    const server = await device.gatt.connect();
    this.server = server;
    const service = await server.getPrimaryService(SERVICE_UUID);
    this.characteristics.clear();
    for (const [key, def] of Object.entries(CHARACTERISTICS)) {
      try {
        const char = await service.getCharacteristic(def.uuid);
        this.characteristics.set(key, char);
      } catch { /* Gen 1 may lack some */ }
    }
    this.notifyConnection(true);
    const keys = [
      'NumGears', 'CurrentGear', 'CurrentPWM', 'BattRemote', 'BattShifter',
      'AutoShutDown', 'SwitchOrder', 'LowPowerMode', 'QuickShiftState',
      'QuickShiftUp', 'QuickShiftDown', 'QuickShiftDelay', 'HomeGear',
      'ShifterFirmwareVersion', 'RemoteFiremwareVersion',
    ];
    for (const key of keys) await this.readData(key);
  }

  async disconnect() {
    if (this.demoMode) {
      this.demoMode = false;
      this.state = {};
      this.notifyConnection(false);
      return;
    }
    if (this.server?.connected) this.server.disconnect();
  }

  readData(key) {
    return new Promise((resolve) => {
      this.enqueue(async () => {
        if (this.demoMode) { resolve(); return; }
        const char = this.characteristics.get(key);
        if (!char) { resolve(); return; }
        const value = await char.readValue();
        this.notifyState(key, this.parseValue(key, value));
        resolve();
      });
    });
  }

  sendData(key, value) {
    return new Promise((resolve) => {
      this.enqueue(async () => {
        if (this.demoMode) {
          this.notifyState(key, value instanceof Date ? value : value);
          resolve();
          return;
        }
        const char = this.characteristics.get(key);
        if (!char) { resolve(); return; }
        const bytes = this.encodeValue(key, value);
        await char.writeValue(new Uint8Array(bytes));
        resolve();
      });
    });
  }

  async readMultiple(keys) {
    for (const key of keys) await this.readData(key);
  }

  supportsCharacteristic(key) {
    return this.demoMode || this.characteristics.has(key);
  }
}

export const archerBle = new ArcherBleManager();
