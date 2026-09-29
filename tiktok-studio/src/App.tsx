import { useEffect, useMemo, useState } from "react";
import { clipDuration, mixClips, type AudioClip } from "./lib/audio";
import { EXPORT_SAMPLE_RATE } from "./lib/exporter";
import { brandOf, newProject, restoreSettings } from "./lib/project";
import { speakText } from "./lib/script";
import { clearClips, loadClips, loadIdeas, loadProject, loadSettings, saveClip, saveIdeas, saveProject, saveSettings, type ProjectState } from "./lib/storage";
import type { Idea } from "./lib/ideas";
import { buildTimeline } from "./lib/timeline";
import type { ApiSettings, Concept, VoiceSettings } from "./lib/types";
import { ConceptStep } from "./components/ConceptStep";
import { ExportStep } from "./components/ExportStep";
import { GuideStep } from "./components/GuideStep";
import { MotionStep } from "./components/MotionStep";
import { ScriptStep } from "./components/ScriptStep";
import { SettingsStep } from "./components/SettingsStep";
import { VoiceStep, clipSignature, type ClipMap } from "./components/VoiceStep";

type StepId = "guide" | "concept" | "script" | "voice" | "motion" | "export" | "settings";

export function App() {
  const [settings, setSettings] = useState<ApiSettings>(() => restoreSettings(loadSettings(), loadProject()));
  const [project, setProject] = useState<ProjectState>(() => loadProject() ?? newProject(settings));
  const [clips, setClips] = useState<ClipMap>({});
  const [ideas, setIdeas] = useState<Idea[]>(loadIdeas);
  const [step, setStep] = useState<StepId>(() => (loadProject() ? "concept" : "guide"));

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveProject(project), [project]);
  useEffect(() => saveIdeas(ideas), [ideas]);

  // 保存済みの音声を復元
  const sceneIds = project.script?.scenes.map((scene) => scene.id) ?? [];
  const sceneKey = sceneIds.join(",");
  useEffect(() => {
    if (sceneIds.length === 0) return;
    loadClips(sceneIds)
      .then((stored) => setClips((current) => ({ ...stored, ...current })))
      .catch(() => undefined);
    // シーン構成が変わったときだけ読み直す
  }, [sceneKey]);

  const scenes = project.script?.scenes ?? [];
  const freshClips = scenes.map((scene) => {
    const entry = clips[scene.id];
    return entry && entry.signature === clipSignature(project.voice, speakText(scene)) ? entry.clip : undefined;
  });
  const durationsKey = freshClips.map((clip) => (clip ? clipDuration(clip).toFixed(4) : "-")).join(",");

  const timeline = useMemo(
    () => buildTimeline(scenes, freshClips.map((clip) => (clip ? clipDuration(clip) : undefined))),
    [project.script, durationsKey]
  );

  const mixed = useMemo(() => {
    const placements = timeline.scenes
      .map((scene, i) => ({ clip: freshClips[i], at: scene.speechStart }))
      .filter((p): p is { clip: AudioClip; at: number } => Boolean(p.clip));
    if (placements.length === 0) return null;
    return { samples: mixClips(placements, timeline.duration, EXPORT_SAMPLE_RATE), sampleRate: EXPORT_SAMPLE_RATE };
  }, [timeline]);

  const onClip = (sceneId: string, clip: AudioClip, signature: string) => {
    setClips((current) => ({ ...current, [sceneId]: { clip, signature } }));
    void saveClip(sceneId, clip, signature).catch(() => undefined);
  };

  // 声を変えたら、それがアカウントの声になる（次の動画にも引き継ぐ）
  const changeVoice = (voice: VoiceSettings) => {
    setProject((current) => ({ ...current, voice }));
    setSettings((current) => ({ ...current, accountVoice: voice }));
  };

  // ジャンル・見た目を変えたら、それがアカウントの「らしさ」になる
  const changeConcept = (concept: Concept) => {
    setProject((current) => ({ ...current, concept }));
    setSettings((current) => ({ ...current, accountBrand: brandOf(concept) }));
  };

  const reset = () => {
    void clearClips();
    setClips({});
    setProject(newProject(settings));
    setStep("concept");
  };

  const done: Record<StepId, boolean> = {
    guide: false,
    concept: Boolean(project.concept.topic.trim()),
    script: Boolean(project.script?.scenes.length),
    voice: scenes.length > 0 && freshClips.every(Boolean),
    motion: Boolean(project.html.trim()),
    export: false,
    settings: Boolean(settings.anthropicKey || settings.geminiKey)
  };

  const nav: { id: StepId; label: string; num: string }[] = [
    { id: "concept", label: "企画", num: "1" },
    { id: "script", label: "台本", num: "2" },
    { id: "voice", label: "音声", num: "3" },
    { id: "motion", label: "モーション", num: "4" },
    { id: "export", label: "プレビュー・書き出し", num: "5" }
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          TikTok <span>Motion</span> Studio
        </div>
        <button className={`nav-item ${step === "guide" ? "active" : ""}`} type="button" onClick={() => setStep("guide")}>
          <span className="nav-num">📈</span>アカウントの育て方
        </button>
        <div className="nav-sep" />
        {nav.map((item) => (
          <button key={item.id} type="button" className={`nav-item ${step === item.id ? "active" : ""} ${done[item.id] ? "done" : ""}`} onClick={() => setStep(item.id)}>
            <span className="nav-num">{done[item.id] ? "✓" : item.num}</span>
            {item.label}
          </button>
        ))}
        <div className="nav-sep" />
        <button className={`nav-item ${step === "settings" ? "active" : ""}`} type="button" onClick={() => setStep("settings")}>
          <span className="nav-num">⚙</span>設定・APIキー
        </button>
        <div className="sidebar-foot">作業内容はこのブラウザに自動保存されます。</div>
      </aside>

      <main className="main">
        {step === "guide" ? <GuideStep /> : null}
        {step === "settings" ? <SettingsStep settings={settings} onChange={setSettings} onReset={reset} /> : null}
        {step === "concept" ? (
          <ConceptStep concept={project.concept} settings={settings} ideas={ideas} onIdeas={setIdeas} onChange={changeConcept} onNext={() => setStep("script")} />
        ) : null}
        {step === "script" ? (
          <ScriptStep
            concept={project.concept}
            script={project.script}
            settings={settings}
            onChange={(script) => setProject((current) => ({ ...current, script }))}
            onBack={() => setStep("concept")}
            onNext={() => setStep("voice")}
          />
        ) : null}
        {step === "voice" && project.script ? (
          <VoiceStep
            script={project.script}
            voice={project.voice}
            settings={settings}
            clips={clips}
            timeline={timeline}
            mixed={mixed}
            onVoiceChange={changeVoice}
            onClip={onClip}
            onBack={() => setStep("script")}
            onNext={() => setStep("motion")}
          />
        ) : null}
        {step === "motion" && project.script ? (
          <MotionStep
            concept={project.concept}
            script={project.script}
            timeline={timeline}
            settings={settings}
            html={project.html}
            onHtml={(html) => setProject((current) => ({ ...current, html }))}
            onBack={() => setStep("voice")}
            onNext={() => setStep("export")}
          />
        ) : null}
        {step === "export" ? <ExportStep html={project.html} script={project.script} timeline={timeline} mixed={mixed} onBack={() => setStep("motion")} /> : null}
        {(step === "voice" || step === "motion") && !project.script ? <p className="lead">先に②台本を作ってください。</p> : null}
      </main>
    </div>
  );
}
