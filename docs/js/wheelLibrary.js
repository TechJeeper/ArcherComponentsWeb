const STORAGE_KEY = 'archer_saved_wheels';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(wheels) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wheels));
}

export function getWheels() {
  return load().sort((a, b) => a.date - b.date);
}

export function addWheel(name, numGears, pwmValues) {
  const wheels = load();
  const wheel = {
    id: Date.now(),
    name,
    numGears,
    gearInfo: pwmValues.join(','),
    date: Date.now(),
  };
  wheels.push(wheel);
  save(wheels);
  return wheel;
}

export function removeWheel(id) {
  save(load().filter((w) => w.id !== id));
}
