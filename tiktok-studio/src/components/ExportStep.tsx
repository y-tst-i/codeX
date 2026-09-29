import { useEffect, useMemo, useRef, useState } from "react";
import { encodeWav } from "../lib/audio";
import { exportVideo } from "../lib/exporter";
import { VIDEO } from "../lib/knowledge";
import { loadGraphic, type LoadedGraphic } from "../lib/mg";
import type { Script, Timeline } from "../lib/types";
import { CopyButton, Notice, StepNav, downloadBlob, formatSeconds } from "./common";
import { TimelineBar } from "./VoiceStep";

interface Props {
  html: string;
  script: Script | null;
  timeline: Timeline;
  mixed: { samples: Float32Array; sampleRate: number } | null;
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

export function ExportStep({ html, script, timeline, mixed, onBack }: Props) {
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
  const [videoUrl, setVideoUrl] = useState("");
  const [videoExt, setVideoExt] = useState<"mp4" | "webm">("mp4");
  const abortRef = useRef<AbortController | null>(null);

  const duration = mixed ? timeline.duration : graphic?.mg.duration ?? timeline.duration;
  const audioUrl = useMemo(() => (mixed ? URL.createObjectURL(encodeWav(mixed.samples, mixed.sampleRate)) : ""), [mixed]);
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // HTMLを読み込む
  useEffect(() => {
    let disposed = false;
    let loaded: LoadedGraphic | null = null;
    setGraphic(null);
    setLoadError("");
    if (!html.trim()) return;
    loadGraphic(html)
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
  }, [html]);

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

  // 再生ループ：音声があれば音声の再生位置を時計にする（ズレない）
  useEffect(() => {
    if (!graphic) return;
    if (!playing) {
      draw(time);
      return;
    }
    let raf = 0;
    const startedAt = performance.now() - time * 1000;
    const tick = () => {
      const audio = audioRef.current;
      let t = audio && mixed ? audio.currentTime : (performance.now() - startedAt) / 1000;
      if (t >= duration) {
        t = 0;
        if (audio && mixed) audio.currentTime = 0;
        else {
          setPlaying(false);
          setTime(0);
          return;
        }
      }
      draw(t);
      setTime(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graphic, playing]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (playing) {
      audio?.pause();
      setPlaying(false);
    } else {
      if (audio && mixed) {
        audio.currentTime = time;
        void audio.play();
      }
      setPlaying(true);
    }
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
      const { blob, extension } = await exportVideo({ graphic, duration, fps: VIDEO.fps, audio: mixed, onProgress: setExportProgress, signal: controller.signal });
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
            <b>MP4に書き出す</b>
            <span className="meta">1フレームずつ描いてエンコードするので、重い演出でもコマ落ちしません（尺 {formatSeconds(duration)}）。Chrome / Edge 推奨。</span>
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
