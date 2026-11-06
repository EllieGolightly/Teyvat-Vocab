// Keep the original preference namespace so existing Pages installs retain data.
// Only local storage and console logging are needed in this standalone app.
function preferenceKey(key: string) {
  const appId = (globalThis as typeof globalThis & { appId?: string }).appId;
  return `__miaoda_${appId || '__global__'}__:${key}`;
}

export const scopedStorage = {
  getItem: (key: string) => localStorage.getItem(preferenceKey(key)),
  setItem: (key: string, value: string) => localStorage.setItem(preferenceKey(key), value),
};

export const logger = console;
