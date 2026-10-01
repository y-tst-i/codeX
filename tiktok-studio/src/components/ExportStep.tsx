import { useEffect, useRef, useState } from "react";
import { encodeWav } from "../lib/audio";
import { EXPORT_SAMPLE_RATE, exportVideo } from "../lib/exporter";
import { VIDEO } from "../lib/knowledge";
import { isDeterministic, loadGraphic, type HostExtras, type LoadedGraphic } from "../lib/mg";
import { DEFAULT_AUDIO, SFX_LABELS, autoCues, decodeBgm, mixAll, renderSfx, sanitizeCues, type AudioSettings, type SfxCue } from "../lib/sfx";
import { deleteAsset, loadAssets, saveAsset } from "../lib/storage";
import type { ApiSettings, Script, Timeline } from "../lib/types";
import { CopyButton, Notice, StepNav, downloadBlob, formatSeconds } from "./common";
import { TimelineBar } from "./VoiceStep";

interface Props {
  extras: HostExtras;
  html: string;
  script: Script | null;
  timeline: Timeline;
  mixed: { samples: Float32Array; sampleRate: number } | null;
  settings: ApiSettings;
  onSettingsChange: (settings: ApiSettings) => void;
  onBack: () => void;
}

const CHECKLIST = [
  "最初の1秒で指が止まるか？（音なしで見ても意味が伝わるか）",
  "字幕・大事な文字がTikTokのボタンや投稿文に隠れていないか（セーフエリア表示で確認）",
  "TikTokでの投稿時に「AI生成コンテンツ」ラベルをオンにする（AI音声・AI映像を使っているため）",
  "音量小さめでトレンドの楽曲を重ねる（TikTokアプリの編集画面で。ナレーションが主役）",
  "カバー画像を設定し、カバーテキストを入れる",
  "投稿文にキーワード＋問いかけ、ハッシュタグは3〜5個",
  "投稿後1時間はコメントに返信する（初速の反応が大事）"
];

export function ExportStep({ extras, html, script, timeline, mixed: voiceMix, settings, onSettingsChange, onBack }: Props) {
  const audioSettings: AudioSettings = { ...DEFAULT_AUDIO, ...settings.audio };
  const setAudio = (patch: Partial<AudioSettings>) => onSettingsChange({ ...settings, audio: { ...audioSettings, ...patch } });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [graphic, setGraphic] = useState<LoadedGraphic | null>(null);
  const [loadError, setLoadError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showSafe, setShowSafe] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState("");
  const [motionBlur, setMotionBlur] = useState(true);
  const [blurNote, setBlurNote] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoExt, setVideoExt] = useState<"mp4" | "webm">("mp4");
  const abortRef = useRef<AbortController | null>(null);

  const duration = voiceMix ? timeline.duration : graphic?.mg.duration ?? timeline.duration;
  // 効果音のきっかけ：HTMLが MG.sfx を持っていればそれを、無ければタイムラインから自動で
  const htmlCues = graphic ? sanitizeCues((graphic.mg as { sfx?: unknown }).sfx, duration) : [];
  const cues: SfxCue[] = htmlCues.length > 0 ? htmlCues : autoCues(timeline).filter((c) => c.t < duration);
  const cueKey = cues.map((c) => `${c.t.toFixed(3)}${c.type}${c.volume ?? 1}`).join(",");
  // BGM（素材として保存してあるもの）
  const [bgm, setBgm] = useState<Float32Array | null>(null);
  const [bgmError, setBgmError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setBgm(null);
    if (!audioSettings.bgmKey) return;
    void loadAssets(audioSettings.bgmKey)
      .then(async (assets) => {
        const blob = assets[audioSettings.bgmKey!];
        if (!blob) throw new Error("BGMファイルが見つかりません。もう一度選んでください");
        const data = await decodeBgm(blob, EXPORT_SAMPLE_RATE);
        if (!cancelled) setBgm(data);
      })
      .catch((e: Error) => !cancelled && setBgmError(e.message));
    return () => {
      cancelled = true;
    };
  }, [audioSettings.bgmKey]);
  // 声＋BGM＋効果音をまとめた最終の音
  const [mixed, setMixed] = useState<{ samples: Float32Array; sampleRate: number } | null>(voiceMix);
  useEffect(() => {
    let cancelled = false;
    const sampleRate = voiceMix?.sampleRate ?? EXPORT_SAMPLE_RATE;
    const useSfx = audioSettings.sfx && cues.length > 0;
    if (!voiceMix && !bgm && !useSfx) {
      setMixed(null);
      return;
    }
    void (async () => {
      const sfx = useSfx ? await Promise.all(cues.map(async (cue) => ({ cue, samples: await renderSfx(cue.type, sampleRate) }))) : [];
      const samples = mixAll({ voice: voiceMix?.samples ?? null, sampleRate, duration, bgm, sfx, settings: audioSettings });
      if (!cancelled) setMixed({ samples, sampleRate });
    })();
    return () => {
      cancelled = true;
    };
  }, [voiceMix, bgm, cueKey, duration, audioSettings.sfx, audioSettings.sfxVolume, audioSettings.bgmVolume, audioSettings.duck]);

  const chooseBgm = async (file: File | undefined) => {
    if (!file) return;
    setBgmError("");
    try {
      await decodeBgm(file, EXPORT_SAMPLE_RATE);
      if (audioSettings.bgmKey) await deleteAsset(audioSettings.bgmKey);
      const key = `bgm:${file.name}`;
      await saveAsset(key, file);
      setAudio({ bgmKey: key, bgmName: file.name });
    } catch {
      setBgmError("この音声ファイルは読めませんでした（mp3 / wav / m4a などを選んでください）");
    }
  };
  // 音声のURLは effect の中で作って片付ける（開発モードで effect が2回走っても、使用中のURLを消さないため）
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  useEffect(() => {
    if (!mixed) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(encodeWav(mixed.samples, mixed.sampleRate));
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mixed]);

  // HTMLを読み込む
  useEffect(() => {
    let disposed = false;
    let loaded: LoadedGraphic | null = null;
    setGraphic(null);
    setLoadError("");
    if (!html.trim()) return;
    loadGraphic(html, extras)
      .then((result) => {
        if (disposed) return result.dispose();
        loaded = result;
        setGraphic(result);
      })
      .catch((error: Error) => !disposed && setLoadError(error.message));
    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, [html, extras]);

  const draw = (t: number) => {
    const canvas = canvasRef.current;
    if (!graphic || !canvas) return;
    try {
      graphic.mg.render(t);
      canvas.getContext("2d")?.drawImage(graphic.canvas, 0, 0, canvas.width, canvas.height);
    } catch {
      // 描画エラーは動作チェック側で表示する
    }
  };

  /** 音声を t 秒から鳴らす。鳴らせなければ false（映像だけ再生する） */
  const startAudio = (t: number): boolean => {
    const audio = audioRef.current;
    if (!audio || !mixed) return false;
    audio.currentTime = t;
    audio.play().catch(() => setAudioError("音声を再生できませんでした。映像だけ再生しています（書き出しには音声が入ります）"));
    return true;
  };

  // 再生ループ：音声が鳴っていれば音声の再生位置を時計にする（ズレない）。鳴っていなければ内部の時計で進める
  useEffect(() => {
    if (!graphic) return;
    if (!playing) {
      draw(time);
      return;
    }
    let raf = 0;
    let clockStart = performance.now() - time * 1000;
    const tick = () => {
      const audio = audioRef.current;
      const audioRunning = Boolean(audio && mixed && !audio.paused && !audio.ended);
      let t = audioRunning ? audio!.currentTime : (performance.now() - clockStart) / 1000;
      if (t >= duration - 1 / 60 || (audio && mixed && audio.ended)) {
        // 最後まで来たら頭に戻ってループ
        t = 0;
        clockStart = performance.now();
        startAudio(0);
      }
      draw(t);
      setTime(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graphic, playing]);

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    setAudioError("");
    // 最後の位置で押されたら頭から
    const from = time >= duration - 0.1 ? 0 : time;
    setTime(from);
    startAudio(from);
    setPlaying(true);
  };

  const seek = (t: number) => {
    setTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
    if (!playing) draw(t);
  };

  const runExport = async () => {
    if (!graphic) return;
    audioRef.current?.pause();
    setPlaying(false);
    setExporting(true);
    setExportError("");
    setExportProgress(0);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // 前のフレームの状態に頼るHTMLは、1フレームを何度も描くと動きが速くなるので、ブラーをかけない
      const blurOk = motionBlur && isDeterministic(graphic, duration);
      setBlurNote(motionBlur && !blurOk ? "このHTMLは同じ時刻でも毎回少し違う絵になるため、モーションブラーなしで書き出しました" : "");
      const { blob, extension } = await exportVideo({
        graphic,
        duration,
        fps: VIDEO.fps,
        audio: mixed,
        onProgress: setExportProgress,
        signal: controller.signal,
        motionBlurSamples: blurOk ? 4 : 1
      });
      setVideoUrl(URL.createObjectURL(blob));
      setVideoExt(extension);
      // 日本語のファイル名は環境によって「download」に化けるので、日時の英数字名にする
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      downloadBlob(blob, `tiktok-${stamp}.${extension}`);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  };

  const { safe } = VIDEO;
  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <>
      <h1>⑤ プレビュー＆書き出し</h1>
      <p className="lead">声と映像を合わせて確認し、TikTokにそのまま投稿できるMP4（1080×1920・30fps・H.264＋AAC）に書き出します。</p>

      {!html.trim() ? <Notice kind="warn">先に④でHTMLを用意してください。</Notice> : null}
      {loadError ? <Notice kind="error" title="HTMLを読み込めません">{" " + loadError}</Notice> : null}
      {!mixed ? <Notice kind="warn">音声がありません。無音の動画として書き出します。</Notice> : null}
      {audioError ? <Notice kind="warn">{audioError}</Notice> : null}

      <div className="preview-wrap" style={{ marginTop: 14 }}>
        <div className="stack">
          <div className="phone">
            <canvas ref={canvasRef} width={VIDEO.width} height={VIDEO.height} />
            {showSafe ? (
              <div className="safe-overlay">
                <div className="zone" style={{ left: 0, right: 0, top: 0, height: pct(safe.top, VIDEO.height) }} />
                <div className="zone" style={{ left: 0, right: 0, bottom: 0, height: pct(VIDEO.height - safe.bottom, VIDEO.height) }} />
                <div className="zone" style={{ right: 0, top: pct(safe.top, VIDEO.height), bottom: pct(VIDEO.height - safe.bottom, VIDEO.height), width: pct(VIDEO.width - safe.right, VIDEO.width) }} />
                <span className="label" style={{ left: 6, bottom: 6 }}>投稿文・アカウント名</span>
                <span className="label" style={{ right: 4, top: "45%" }}>ボタン</span>
              </div>
            ) : null}
          </div>
          {audioUrl ? <audio ref={audioRef} src={audioUrl} preload="auto" /> : null}
          <div className="row">
            <button className="btn primary" type="button" disabled={!graphic} onClick={togglePlay}>
              {playing ? "❚❚ 一時停止" : "▶ 再生"}
            </button>
            <label className="row meta">
              <input type="checkbox" style={{ width: "auto" }} checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} /> セーフエリア表示
            </label>
            <span className="spacer" />
            <span className="meta">
              {time.toFixed(2)} / {duration.toFixed(2)}s
            </span>
          </div>
          <input type="range" min={0} max={duration} step={1 / VIDEO.fps} value={Math.min(time, duration)} onChange={(e) => seek(Number(e.target.value))} />
        </div>

        <div className="stack">
          <TimelineBar timeline={timeline} time={time} />
          <div className="card stack">
            <b>🎵 効果音・BGM</b>
            <label className="row meta">
              <input type="checkbox" style={{ width: "auto" }} checked={audioSettings.sfx} onChange={(e) => setAudio({ sfx: e.target.checked })} />
              効果音を入れる（{htmlCues.length > 0 ? `映像の指定どおり ${htmlCues.length}個` : `シーンの切り替わり・文字の登場などに自動で ${cues.length}個`}）
            </label>
            {audioSettings.sfx ? (
              <label className="row meta">
                効果音の音量
                <input type="range" min={0} max={1.5} step={0.05} value={audioSettings.sfxVolume} onChange={(e) => setAudio({ sfxVolume: Number(e.target.value) })} style={{ width: 160 }} />
                {Math.round(audioSettings.sfxVolume * 100)}%
              </label>
            ) : null}
            {audioSettings.sfx && cues.length > 0 ? (
              <span className="meta">
                使う音：{[...new Set(cues.map((c) => SFX_LABELS[c.type]))].join("・")}
              </span>
            ) : null}
            <div className="row meta" style={{ flexWrap: "wrap" }}>
              BGM：
              <b>{audioSettings.bgmName ?? "なし"}</b>
              <label className="btn small" style={{ cursor: "pointer" }}>
                {audioSettings.bgmName ? "変える" : "曲を選ぶ"}
                <input type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => void chooseBgm(e.target.files?.[0])} />
              </label>
              {audioSettings.bgmKey ? (
                <button
                  className="btn small ghost"
                  type="button"
                  onClick={async () => {
                    await deleteAsset(audioSettings.bgmKey!);
                    setAudio({ bgmKey: undefined, bgmName: undefined });
                  }}
                >
                  外す
                </button>
              ) : null}
            </div>
            {audioSettings.bgmKey ? (
              <>
                <label className="row meta">
                  BGMの音量
                  <input type="range" min={0} max={0.8} step={0.01} value={audioSettings.bgmVolume} onChange={(e) => setAudio({ bgmVolume: Number(e.target.value) })} style={{ width: 160 }} />
                  {Math.round(audioSettings.bgmVolume * 100)}%
                </label>
                <label className="row meta">
                  声が鳴っている間BGMを下げる
                  <input type="range" min={0} max={0.95} step={0.05} value={audioSettings.duck} onChange={(e) => setAudio({ duck: Number(e.target.value) })} style={{ width: 160 }} />
                  {Math.round(audioSettings.duck * 100)}%
                </label>
              </>
            ) : null}
            {bgmError ? <Notice kind="error">{bgmError}</Notice> : null}
            <span className="meta">
              BGMはフリー音源サイト等の規約を守って使ってください。TikTokのアプリでトレンド曲を付けるなら、ここではBGMなしでOK（効果音だけ入れる）。
            </span>
          </div>

          <div className="card stack">
            <b>MP4に書き出す</b>
            <span className="meta">1フレームずつ描いてエンコードするので、重い演出でもコマ落ちしません（尺 {formatSeconds(duration)}）。Chrome / Edge 推奨。</span>
            <label className="row meta">
              <input type="checkbox" style={{ width: "auto" }} checked={motionBlur} onChange={(e) => setMotionBlur(e.target.checked)} />
              モーションブラー（速い動きが自然にブレて、映像らしくなる。書き出し時間は約3〜4倍）
            </label>
            {blurNote ? <span className="meta">{blurNote}</span> : null}
            <div className="row">
              <button className="btn pink" type="button" disabled={!graphic || exporting} onClick={runExport}>
                {exporting ? `書き出し中… ${Math.round(exportProgress * 100)}%` : "MP4を書き出す"}
              </button>
              {exporting ? (
                <button className="btn" type="button" onClick={() => abortRef.current?.abort()}>
                  中止
                </button>
              ) : null}
            </div>
            {exporting ? (
              <div className="progress">
                <i style={{ width: `${exportProgress * 100}%` }} />
              </div>
            ) : null}
            {exportError ? <Notice kind="error" title="書き出しエラー">{" " + exportError}</Notice> : null}
            {videoUrl ? (
              <Notice kind="ok" title={`✓ ${videoExt.toUpperCase()}で書き出しました（ダウンロードフォルダに保存）`}>
                {videoExt === "webm" ? <div className="meta">このブラウザはMP4(H.264)の書き出しに未対応のためWebMにしました。TikTokはWebMも投稿できますが、Chrome/EdgeならMP4になります。</div> : null}
                <video src={videoUrl} controls style={{ width: 180, display: "block", marginTop: 8, borderRadius: 10 }} />
              </Notice>
            ) : null}
          </div>

          {script ? (
            <div className="card stack">
              <b>投稿キット</b>
              <div className="row">
                <span className="meta">カバー文字：</span>
                <b>{script.coverText}</b>
                <CopyButton text={script.coverText} />
              </div>
              <textarea readOnly value={`${script.caption}\n\n${script.hashtags.join(" ")}`} />
              <div className="row">
                <CopyButton text={`${script.caption}\n\n${script.hashtags.join(" ")}`} label="投稿文＋タグをコピー" />
              </div>
            </div>
          ) : null}

          <div className="card">
            <b>投稿前チェックリスト</b>
            <ul>
              {CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} />
    </>
  );
}
