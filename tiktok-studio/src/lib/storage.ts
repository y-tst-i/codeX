import type { AudioClip } from "./audio";
import type { Idea } from "./ideas";
import type { ApiSettings, Concept, Script, VoiceSettings } from "./types";

const SETTINGS_KEY = "tms.settings.v1";
const PROJECT_KEY = "tms.project.v1";
const IDEAS_KEY = "tms.ideas.v1";

export interface ProjectState {
  concept: Concept;
  script: Script | null;
  voice: VoiceSettings;
  html: string;
}

export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量オーバー等。作業は続けられるので無視する
  }
}

export const loadSettings = () => loadJson<ApiSettings>(SETTINGS_KEY);
export const saveSettings = (settings: ApiSettings) => saveJson(SETTINGS_KEY, settings);
export const loadProject = () => loadJson<ProjectState>(PROJECT_KEY);
export const saveProject = (project: ProjectState) => saveJson(PROJECT_KEY, project);
/** ネタ帳はアカウント単位で持つ（新規プロジェクトでも消さない） */
export const loadIdeas = () => loadJson<Idea[]>(IDEAS_KEY) ?? [];
export const saveIdeas = (ideas: Idea[]) => saveJson(IDEAS_KEY, ideas);

/* 音声クリップは大きいのでIndexedDBに置く（キー: シーンID） */

const DB_NAME = "tms-audio";
const STORE = "clips";
/** 画像キャラの画像（キー: "表情:口"） */
const IMAGE_STORE = "characterImages";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

interface StoredClip {
  sampleRate: number;
  samples: ArrayBuffer;
  /** どのテキスト・声で作ったか。変わったら作り直しが必要 */
  signature: string;
}

export async function saveClip(sceneId: string, clip: AudioClip, signature: string): Promise<void> {
  const db = await openDb();
  const value: StoredClip = { sampleRate: clip.sampleRate, samples: clip.samples.slice().buffer, signature };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, sceneId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadClips(sceneIds: string[]): Promise<Record<string, { clip: AudioClip; signature: string }>> {
  const db = await openDb();
  const result: Record<string, { clip: AudioClip; signature: string }> = {};
  await Promise.all(
    sceneIds.map(
      (id) =>
        new Promise<void>((resolve) => {
          const request = db.transaction(STORE).objectStore(STORE).get(id);
          request.onsuccess = () => {
            const value = request.result as StoredClip | undefined;
            if (value) {
              result[id] = {
                clip: { sampleRate: value.sampleRate, samples: new Int16Array(value.samples) },
                signature: value.signature
              };
            }
            resolve();
          };
          request.onerror = () => resolve();
        })
    )
  );
  db.close();
  return result;
}

export async function clearClips(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function saveCharacterImage(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteCharacterImage(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function loadCharacterImages(keys: string[]): Promise<Record<string, Blob>> {
  const db = await openDb();
  const result: Record<string, Blob> = {};
  await Promise.all(
    keys.map(
      (key) =>
        new Promise<void>((resolve) => {
          const request = db.transaction(IMAGE_STORE).objectStore(IMAGE_STORE).get(key);
          request.onsuccess = () => {
            if (request.result instanceof Blob) result[key] = request.result;
            resolve();
          };
          request.onerror = () => resolve();
        })
    )
  );
  db.close();
  return result;
}

/* ---------------- 引っ越し（バックアップ）用：ストアの中身をまるごと読み書き ---------------- */

export const AUDIO_STORE = STORE;
export const CHARACTER_IMAGE_STORE = IMAGE_STORE;

/** ストアの中身を [キー, 値] の一覧で取り出す */
export async function dumpStore(store: string): Promise<[string, unknown][]> {
  const db = await openDb();
  const entries: [string, unknown][] = [];
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve();
      entries.push([String(cursor.key), cursor.value]);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
  db.close();
  return entries;
}

/** ストアを空にして、渡した中身で置き換える */
export async function replaceStore(store: string, entries: [string, unknown][]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    os.clear();
    for (const [key, value] of entries) os.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
