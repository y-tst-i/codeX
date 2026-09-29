import { useRef, useState } from "react";
import { clipDuration, clipToWav, encodeWav, type AudioClip } from "../lib/audio";
import { synthesize } from "../lib/geminiTts";
import { VOICES, VOICE_DIRECTIONS } from "../lib/knowledge";
import { speakText } from "../lib/script";
import type { ApiSettings, Script, Timeline, VoiceSettings } from "../lib/types";
import { Field, Notice, StepNav, downloadBlob, formatSeconds } from "./common";

export type ClipMap = Record<string, { clip: AudioClip; signature: string }>;

export function clipSignature(voice: VoiceSettings, text: string): string {
  return [voice.model, voice.voiceName, voice.direction, text].join("|");
}

interface Props {
  script: Script;
  voice: VoiceSettings;
  settings: ApiSettings;
  clips: ClipMap;
  timeline: Timeline;
  mixed: { samples: Float32Array; sampleRate: number } | null;
  onVoiceChange: (voice: VoiceSettings) => void;
  onClip: (sceneId: string, clip: AudioClip, signature: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function VoiceStep({ script, voice, settings, clips, timeline, mixed, onVoiceChange, onClip, onBack, onNext }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isFresh = (sceneId: string, text: string) => clips[sceneId]?.signature === clipSignature(voice, text);
  const readyCount = script.scenes.filter((scene) => isFresh(scene.id, speakText(scene))).length;
  const allReady = readyCount === script.scenes.length;

  const play = (blob: Blob) => {
    audioRef.current?.pause();
    const audio = new Audio(URL.createObjectURL(blob));
    audioRef.current = audio;
    void audio.play();
  };

  const generate = async (sceneIds: string[]) => {
    if (!settings.geminiKey) {
      setError("Gemini APIキーが未設定です（⚙ 設定）");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    try {
      for (const [n, id] of sceneIds.entries()) {
        const scene = script.scenes.find((s) => s.id === id);
        if (!scene) continue;
        const text = speakText(scene);
        setBusy(id);
        setStatus(`音声を生成中… ${n + 1}/${sceneIds.length}`);
        const clip = await synthesize(
          { apiKey: settings.geminiKey, model: voice.model, voiceName: voice.voiceName, direction: voice.direction, text, signal: controller.signal },
          setStatus
        );
        onClip(id, clip, clipSignature(voice, text));
      }
      setStatus("完了しました");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  };

  const missing = script.scenes.filter((scene) => !isFresh(scene.id, speakText(scene))).map((scene) => scene.id);

  return (
    <>
      <h1>③ 音声（Gemini TTS）</h1>
      <p className="lead">シーンごとに音声を作り、その実際の長さでタイムラインを確定させます。これで映像と声が1フレーム単位で揃います。</p>

      <div className="card stack">
        <div className="grid-2">
          <Field label="声">
            <select value={voice.voiceName} onChange={(e) => onVoiceChange({ ...voice, voiceName: e.target.value })}>
              {VOICES.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} — {v.trait}
                </option>
              ))}
            </select>
          </Field>
          <Field label="TTSモデル">
            <input value={voice.model} onChange={(e) => onVoiceChange({ ...voice, model: e.target.value })} />
          </Field>
        </div>
        <Field label="演技の指示（Geminiに自然文で伝えます）">
          <textarea value={voice.direction} onChange={(e) => onVoiceChange({ ...voice, direction: e.target.value })} />
        </Field>
        <div className="chips">
          {VOICE_DIRECTIONS.map((preset) => (
            <button key={preset.label} className="chip" type="button" onClick={() => onVoiceChange({ ...voice, direction: preset.text })}>
              {preset.label}
            </button>
          ))}
        </div>
        <span className="meta">
          🔒 ここで選んだ声と演技指示は「アカウントの声」として保存され、新しい動画にも自動で引き継がれます（声はアカウントの「顔」なので、決めたら変えないのがおすすめ）。
          決めるときは、まず1シーン目だけ生成して聴き比べてください。
        </span>
      </div>

      {!settings.geminiKey ? (
        <Notice kind="warn" title="Gemini APIキーが未設定です">
          {" "}音声なしでも先へ進めます（尺は文字数から推定）。ただし声と映像をぴったり合わせるには音声生成がおすすめです。
        </Notice>
      ) : null}
      {error ? <Notice kind="error" title="エラー">{" " + error}</Notice> : null}

      <div className="row" style={{ margin: "16px 0 10px" }}>
        <button className="btn primary" type="button" disabled={Boolean(busy) || missing.length === 0 || !settings.geminiKey} onClick={() => generate(missing)}>
          {missing.length === script.scenes.length ? "全シーンの音声を生成" : `未生成・変更された${missing.length}シーンを生成`}
        </button>
        {busy ? (
          <button className="btn" type="button" onClick={() => abortRef.current?.abort()}>
            中止
          </button>
        ) : null}
        <button className="btn" type="button" disabled={!mixed} onClick={() => mixed && play(encodeWav(mixed.samples, mixed.sampleRate))}>
          ▶ 通しで聴く
        </button>
        <button className="btn" type="button" disabled={!mixed} onClick={() => mixed && downloadBlob(encodeWav(mixed.samples, mixed.sampleRate), "narration.wav")}>
          WAVを保存
        </button>
        <span className="meta">
          {readyCount}/{script.scenes.length} 完了 {status && `— ${status}`}
        </span>
      </div>

      <TimelineBar timeline={timeline} />

      <div className="stack" style={{ marginTop: 14 }}>
        {timeline.scenes.map((scene) => {
          const entry = clips[scene.id];
          const fresh = isFresh(scene.id, speakText(scene));
          return (
            <div className="scene row" key={scene.id}>
              <span className={`badge ${fresh ? "ok" : entry ? "warn" : ""}`}>#{scene.index + 1}</span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div>{scene.narration}</div>
                <div className="meta">
                  {scene.speechStart.toFixed(2)}s〜{scene.speechEnd.toFixed(2)}s（{fresh && entry ? `実測 ${formatSeconds(clipDuration(entry.clip))}` : entry ? "テキストか声が変わりました：再生成してください" : "推定"}）
                </div>
              </div>
              <button className="btn small" type="button" disabled={!entry} onClick={() => entry && play(clipToWav(entry.clip))}>
                ▶
              </button>
              <button className="btn small" type="button" disabled={Boolean(busy) || !settings.geminiKey} onClick={() => generate([scene.id])}>
                {busy === scene.id ? "生成中…" : entry ? "作り直す" : "生成"}
              </button>
            </div>
          );
        })}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextLabel={allReady ? "モーションづくりへ →" : "音声なし/一部推定のまま進む →"} />
    </>
  );
}

const ROLE_COLORS: Record<string, string> = { hook: "#ff3d7f", body: "#c6ff3d", twist: "#ffd400", cta: "#5ec8ff", loop: "#b79cff" };

export function TimelineBar({ timeline, time }: { timeline: Timeline; time?: number }) {
  if (timeline.duration <= 0) return null;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="timeline-bar">
        {timeline.scenes.map((scene) => (
          <div
            key={scene.id}
            title={scene.narration}
            style={{
              left: `${(scene.start / timeline.duration) * 100}%`,
              width: `${((scene.end - scene.start) / timeline.duration) * 100}%`,
              background: ROLE_COLORS[scene.role] ?? "#888",
              opacity: scene.timingSource === "audio" ? 1 : 0.55
            }}
          >
            {scene.index + 1}
          </div>
        ))}
        {time !== undefined ? (
          <div style={{ left: `${(time / timeline.duration) * 100}%`, width: 2, background: "#fff", border: 0 }} />
        ) : null}
      </div>
      <span className="meta">総尺 {formatSeconds(timeline.duration)}（薄い色＝推定タイミング）</span>
    </div>
  );
}
