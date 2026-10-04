// Bookmarks and preferences in localStorage. Every access tolerates blocked storage
// (private windows, previews): reads fall back to an empty set, writes report false.
export const KEYS = { papers: "iros26.stars", workshops: "iros26.workshop-stars", theme: "iros26.theme" };

export function loadSet(key, storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage).getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set();
  }
}

export function saveSet(key, set, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify([...set]));
    return true;
  } catch {
    return false;
  }
}
