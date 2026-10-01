/**
 * 別のPCへの引っ越し用バックアップ。
 * 設定・作業中のプロジェクト・ネタ帳（localStorage）と、音声・キャラ画像（IndexedDB）を1つのZIPにまとめる。
 */
import { AUDIO_STORE, CHARACTER_IMAGE_STORE, dumpStore, replaceStore } from "./storage";

const PREFIX = "tms.";
const SETTINGS_KEY = "tms.settings.v1";
const SECRET_FIELDS = ["anthropicKey", "geminiKey"] as const;

interface Manifest {
  app: "tiktok-motion-studio";
  version: 1;
  createdAt: string;
  includesKeys: boolean;
  local: Record<string, string>;
  clips: { key: string; file: string; sampleRate: number; signature: string }[];
  images: { key: string; file: string; type: string }[];
}

/** 設定から APIキーを抜く（キーを含めないバックアップ用） */
export function stripKeys(settingsJson: string): string {
  try {
    const settings = JSON.parse(settingsJson) as Record<string, unknown>;
    for (const field of SECRET_FIELDS) settings[field] = "";
    return JSON.stringify(settings);
  } catch {
    return settingsJson;
  }
}

/** 引っ越し先にキーが入っていて、バックアップにキーが無いときは、引っ越し先のキーを残す */
export function mergeKeys(incomingJson: string, currentJson: string | null): string {
  try {
    const incoming = JSON.parse(incomingJson) as Record<string, unknown>;
    const current = currentJson ? (JSON.parse(currentJson) as Record<string, unknown>) : {};
    for (const field of SECRET_FIELDS) if (!incoming[field] && current[field]) incoming[field] = current[field];
    return JSON.stringify(incoming);
  } catch {
    return incomingJson;
  }
}

export async function exportBackup(includeKeys: boolean): Promise<{ blob: Blob; summary: string }> {
  const { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  const local: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const value = localStorage.getItem(key) ?? "";
    local[key] = key === SETTINGS_KEY && !includeKeys ? stripKeys(value) : value;
  }
  const clips: Manifest["clips"] = [];
  for (const [i, [key, value]] of (await dumpStore(AUDIO_STORE)).entries()) {
    const clip = value as { sampleRate: number; samples: ArrayBuffer; signature: string };
    const file = `clips/${i}.pcm`;
    files[file] = new Uint8Array(clip.samples);
    clips.push({ key, file, sampleRate: clip.sampleRate, signature: clip.signature });
  }
  const images: Manifest["images"] = [];
  for (const [i, [key, value]] of (await dumpStore(CHARACTER_IMAGE_STORE)).entries()) {
    if (!(value instanceof Blob)) continue;
    const file = `images/${i}.bin`;
    files[file] = new Uint8Array(await value.arrayBuffer());
    images.push({ key, file, type: value.type });
  }
  const manifest: Manifest = { app: "tiktok-motion-studio", version: 1, createdAt: new Date().toISOString(), includesKeys: includeKeys, local, clips, images };
  files["backup.json"] = strToU8(JSON.stringify(manifest));
  // 画像・音声はもともと圧縮されている／圧縮しても小さくならないので、速さ優先で無圧縮にする
  const zipped = zipSync(files, { level: 0 });
  return {
    blob: new Blob([zipped.slice()], { type: "application/zip" }),
    summary: `音声${clips.length}本・キャラ画像${images.length}枚・設定とプロジェクト`
  };
}

export async function importBackup(file: File): Promise<string> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const raw = files["backup.json"];
  if (!raw) throw new Error("このZIPはバックアップではありません（backup.json がありません）");
  const manifest = JSON.parse(strFromU8(raw)) as Manifest;
  if (manifest.app !== "tiktok-motion-studio") throw new Error("このツールのバックアップではありません");

  const clips: [string, unknown][] = manifest.clips.map((c) => {
    const bytes = files[c.file];
    if (!bytes) throw new Error(`バックアップが壊れています（${c.file} がありません）`);
    return [c.key, { sampleRate: c.sampleRate, samples: bytes.slice().buffer, signature: c.signature }];
  });
  const images: [string, unknown][] = manifest.images.map((img) => {
    const bytes = files[img.file];
    if (!bytes) throw new Error(`バックアップが壊れています（${img.file} がありません）`);
    return [img.key, new Blob([bytes.slice()], { type: img.type })];
  });
  await replaceStore(AUDIO_STORE, clips);
  await replaceStore(CHARACTER_IMAGE_STORE, images);
  for (const [key, value] of Object.entries(manifest.local)) {
    localStorage.setItem(key, key === SETTINGS_KEY ? mergeKeys(value, localStorage.getItem(key)) : value);
  }
  return `音声${clips.length}本・キャラ画像${images.length}枚・設定とプロジェクトを読み込みました`;
}
