export interface LastReadInfo {
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  savedAt: number;
}

function storageKey(novelId: number) {
  return `novel-last-read-${novelId}`;
}

export function getLastRead(novelId: number): LastReadInfo | null {
  try {
    const raw = localStorage.getItem(storageKey(novelId));
    if (!raw) return null;
    return JSON.parse(raw) as LastReadInfo;
  } catch {
    return null;
  }
}

export function saveLastRead(novelId: number, info: Omit<LastReadInfo, "savedAt">) {
  try {
    const data: LastReadInfo = { ...info, savedAt: Date.now() };
    localStorage.setItem(storageKey(novelId), JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
}

export function clearLastRead(novelId: number) {
  try {
    localStorage.removeItem(storageKey(novelId));
  } catch {
    // ignore
  }
}
