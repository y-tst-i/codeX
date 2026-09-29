import { useEffect, useRef, useState } from "react";
import { clipDuration, clipToWav, encodeWav, type AudioClip } from "../lib/audio";
import { SplitError, synthesize, synthesizeScript } from "../lib/geminiTts";
import { todayTtsCalls } from "../lib/usage";
import { VOICES, VOICE_DIRECTIONS } from "../lib/knowledge";
import { speakText } from "../lib/script";
import { estimateSpeechSeconds } from "../lib/timeline";
import type { ApiSettings, Script, Timeline, VoiceSettings } from "../lib/types";
import { Field, Notice, StepNav, downloadBlob, formatSeconds } from "./common";

export type ClipMap = Record<string, { clip: AudioClip; signature: string }>;

/** 音声の作り方を変えたら上げる（古い音声を「作り直しが必要」にするため） */
const TTS_FORMAT_VERSION = "v2";

export function clipSignature(voice: VoiceSettings, text: string): string {
  return [TTS_FORMAT_VERSION, voice.model, voice.voiceName, voice.direction, text].join("|");
}

interface Props {
  script: Script;
  voice: VoiceSettings;
  settings: ApiSettings;
  clips: ClipMap;
  timeline: Timeline;
  mixed: { samples: Float32Array; sampleRate: number } | null;
  onVoiceChange: (voice: VoiceSettings) => void;
  onSettingsChange: (settings: ApiSettings) => void;
  onClip: (sceneId: string, clip: AudioClip, signature: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function VoiceStep({ script, voice, settings, clips, timeline, mixed, onVoiceChange, onSettingsChange, onClip, onBack, onNext }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [usedToday, setUsedToday] = useState(todayTtsCalls);
  const [splitFailed, setSplitFailed] = useState(false);
  useEffect(() => {
    const update = () => setUsedToday(todayTtsCalls());
    window.addEventListener("tms-tts-usage", update);
    const timer = setInterval(update, 60_000);
    return () => {
      window.removeEventListener("tms-tts-usage", update);
      clearInterval(timer);
    };
  }, []);
  const mode = settings.ttsMode ?? "batch";
  const rpm = settings.ttsRpm ?? 3;
  const dailyLimit = settings.ttsDailyLimit ?? 10;

  const isFresh = (sceneId: string, text: string) => clips[sceneId]?.signature === clipSignature(voice, text);
  const readyCount = script.scenes.filter((scene) => isFresh(scene.id, speakText(scene))).length;
  const allReady = readyCount === script.scenes.length;

  const play = (blob: Blob) => {
    audioRef.current?.pause();
    const audio = new Audio(URL.createObjectURL(blob));
    audioRef.current = audio;
    void audio.play();
  };

  const begin = () => {
    if (!settings.geminiKey) {
      setError("Gemini APIキーが未設定です（⚙ 設定）");
      return null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setSplitFailed(false);
    return controller;
  };

  const finish = (dropped: number) =>
    setStatus(
      dropped > 0
        ? `完了しました（演技指示まで読み上げたため、指示なしで作り直した部分があります。気になる場合は演技指示を空にしてください）`
        : "完了しました"
    );

  const fail = (e: unknown) => {
    if (e instanceof SplitError) setSplitFailed(true);
    setError(e instanceof DOMException && e.name === "AbortError" ? "中止しました" : (e as Error).message);
    setStatus("");
  };

  /** シーンごとに1回ずつ作る */
  const generate = async (sceneIds: string[]) => {
    const controller = begin();
    if (!controller) return;
    let dropped = 0;
    try {
      for (const [n, id] of sceneIds.entries()) {
        const scene = script.scenes.find((s) => s.id === id);
        if (!scene) continue;
        const text = speakText(scene);
        setBusy(id);
        setStatus(`音声を生成中… ${n + 1}/${sceneIds.length}`);
        const { clip, directionDropped } = await synthesize(
          {
            apiKey: settings.geminiKey,
            model: voice.model,
            voiceName: voice.voiceName,
            direction: voice.direction,
            rpm,
            text,
            expectedSeconds: estimateSpeechSeconds(text),
            signal: controller.signal
          },
          setStatus
        );
        if (directionDropped) dropped += 1;
        onClip(id, clip, clipSignature(voice, text));
      }
      finish(dropped);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  };

  /** 全シーンをまとめて1回で作り、無音で切り分ける */
  const generateAll = async () => {
    const controller = begin();
    if (!controller) return;
    const texts = script.scenes.map(speakText);
    setBusy("all");
    try {
      const { clips: parts, directionDropped } = await synthesizeScript(
        {
          apiKey: settings.geminiKey,
          model: voice.model,
          voiceName: voice.voiceName,
          direction: voice.direction,
          rpm,
          texts,
          expectedSeconds: texts.map(estimateSpeechSeconds),
          signal: controller.signal
        },
        setStatus
      );
      script.scenes.forEach((scene, i) => {
        const part = parts[i];
        if (part) onClip(scene.id, part, clipSignature(voice, texts[i]!));
      });
      finish(directionDropped ? 1 : 0);
    } catch (e) {
      fail(e);
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

      {splitFailed ? (
        <Notice kind="warn" title="区切りがうまくいきませんでした">
          <div className="row" style={{ marginTop: 6 }}>
            <span className="meta">シーンごとに作る方式ならシーン数ぶんの回数を使いますが、確実に区切れます。</span>
            <button className="btn small" type="button" onClick={() => onSettingsChange({ ...settings, ttsMode: "scene" })}>
              シーンごとに作る方式に切り替える
            </button>
          </div>
        </Notice>
      ) : null}

      <div className="card stack" style={{ marginTop: 16 }}>
        <div className="row">
          <b>作り方</b>
          <label className="row meta">
            <input type="radio" style={{ width: "auto" }} checked={mode === "batch"} onChange={() => onSettingsChange({ ...settings, ttsMode: "batch" })} />
            まとめて1回で作る（無料枠向け・おすすめ）
          </label>
          <label className="row meta">
            <input type="radio" style={{ width: "auto" }} checked={mode === "scene"} onChange={() => onSettingsChange({ ...settings, ttsMode: "scene" })} />
            シーンごとに作る（{script.scenes.length}回使う）
          </label>
        </div>
        <span className="meta">
          今日のGemini使用：<b>{usedToday}{dailyLimit > 0 ? ` / ${dailyLimit}回` : "回"}</b>
          {dailyLimit > 0 ? "（日本時間の16〜17時ごろリセット）" : ""}
          {rpm > 0 ? `・1分に${rpm}回を超えないよう自動で間隔をあけます` : ""}
        </span>
      </div>

      <div className="row" style={{ margin: "16px 0 10px" }}>
        {mode === "batch" ? (
          <button className="btn primary" type="button" disabled={Boolean(busy) || missing.length === 0 || !settings.geminiKey} onClick={generateAll}>
            {missing.length === script.scenes.length ? "全シーンをまとめて生成（1回分）" : `全シーンをまとめて作り直す（1回分・変更${missing.length}シーン）`}
          </button>
        ) : (
          <button className="btn primary" type="button" disabled={Boolean(busy) || missing.length === 0 || !settings.geminiKey} onClick={() => generate(missing)}>
            {missing.length === script.scenes.length ? `全シーンの音声を生成（${missing.length}回分）` : `未生成・変更された${missing.length}シーンを生成`}
          </button>
        )}
        {missing.length > 1 && script.scenes[0] && missing.includes(script.scenes[0].id) ? (
          <button className="btn" type="button" disabled={Boolean(busy) || !settings.geminiKey} onClick={() => generate([script.scenes[0]!.id])}>
            まず1シーン目だけ試す（1回分）
          </button>
        ) : null}
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
