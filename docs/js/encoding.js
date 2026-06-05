export function encodeByte(value) {
  return new Uint8Array([value & 0xff]);
}

export function encodeShort(value) {
  const buf = new ArrayBuffer(2);
  new DataView(buf).setInt16(0, value, false);
  return new Uint8Array(buf);
}

export function encodeInt(value) {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setInt32(0, value, false);
  return new Uint8Array(buf);
}

export function encodeDate(date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return new TextEncoder().encode(`${yy}${mm}${dd}`);
}

export function decodeByte(data) {
  return data.getUint8(0);
}

export function decodeShort(data) {
  return data.getInt16(0, false);
}

export function decodeInt(data) {
  const val = data.getInt32(0, false);
  return val === -1 ? 0 : val;
}

export function decodeString(data, key) {
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (key === 'RemoteFiremwareVersion') {
    const def = [0x30, 0xff, 0xff, 0xff, 0xff];
    if (bytes.length >= 5 && def.every((b, i) => bytes[i] === b)) {
      return 'No Paired Remote';
    }
  }
  return 'v' + new TextDecoder().decode(bytes);
}

export function decodeDate(data) {
  const str = new TextDecoder().decode(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  if (str === '000000') return null;
  const yy = parseInt(str.slice(0, 2), 10);
  const mm = parseInt(str.slice(2, 4), 10) - 1;
  const dd = parseInt(str.slice(4, 6), 10);
  return new Date(2000 + yy, mm, dd);
}

export function extractVersionNumber(versionString) {
  const match = versionString.match(/\d+\.\d+/);
  return match ? match[0] : '0.0';
}

export function extractMainVersion(versionNumber) {
  const parts = versionNumber.split('.');
  return parts.length > 0 ? parseInt(parts[0], 10) || 0 : 0;
}

export function pwmToDisplay(pwm) {
  return 2000 - pwm;
}

export function clampPwm(pwm) {
  if (pwm < 1000) return 1000;
  if (pwm > 2000) return 2000;
  return pwm;
}
