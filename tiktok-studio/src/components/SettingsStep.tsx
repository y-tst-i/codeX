import { CLAUDE_MODELS, TTS_MODELS } from "../lib/knowledge";
import type { ApiSettings } from "../lib/types";
import { BackupPanel } from "./BackupPanel";
import { Field, Notice } from "./common";

interface Props {
  settings: ApiSettings;
  onChange: (settings: ApiSettings) => void;
  onReset: () => void;
}

export function SettingsStep({ settings, onChange, onReset }: Props) {
  const set = <K extends keyof ApiSettings>(key: K, value: ApiSettings[K]) => onChange({ ...settings, [key]: value });

  return (
    <>
      <h1>⚙ 設定</h1>
      <p className="lead">APIキーがなくても、プロンプトをコピーしてclaude.aiに貼る方法で全部使えます。キーを入れると、ボタン1つで生成できるようになります。</p>

      <div className="card stack">
        <Field label="Anthropic APIキー（台本・映像の生成）" hint="https://console.anthropic.com で発行">
          <input type="password" value={settings.anthropicKey} onChange={(e) => set("anthropicKey", e.target.value.trim())} placeholder="sk-ant-..." autoComplete="off" />
        </Field>
        <div className="grid-2">
          <Field label="Claudeのモデル">
            <select value={settings.claudeModel} onChange={(e) => set("claudeModel", e.target.value)}>
              {CLAUDE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="考える深さ（effort）" hint="高いほど丁寧・高品質だが時間と料金が増える">
            <select value={settings.effort} onChange={(e) => set("effort", e.target.value as ApiSettings["effort"])}>
              <option value="medium">medium（速い）</option>
              <option value="high">high（おすすめ）</option>
              <option value="xhigh">xhigh（こだわる）</option>
              <option value="max">max（最大）</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card stack">
        <Field label="Gemini APIキー（日本語ナレーション）" hint="https://aistudio.google.com で発行">
          <input type="password" value={settings.geminiKey} onChange={(e) => set("geminiKey", e.target.value.trim())} placeholder="AIza..." autoComplete="off" />
        </Field>
        <Field label="Geminiのプラン" hint="AI Studioの「レート制限」画面で上限を確認できます">
          <select
            value={(settings.ttsRpm ?? 3) > 0 ? "free" : "paid"}
            onChange={(e) =>
              onChange(
                e.target.value === "free"
                  ? { ...settings, ttsRpm: 3, ttsDailyLimit: 10 }
                  : { ...settings, ttsRpm: 0, ttsDailyLimit: 0 }
              )
            }
          >
            <option value="free">無料枠（1分3回・1日10回）</option>
            <option value="paid">有料（支払い情報を設定済み）</option>
          </select>
        </Field>
        <Field label="TTSモデルの初期値" hint="新しいモデルが出たら、③音声の画面でモデル名を直接書き換えられます">
          <select value={settings.ttsModel} onChange={(e) => set("ttsModel", e.target.value)}>
            {TTS_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Notice kind="warn" title="APIキーの扱い">
        <ul>
          <li>キーはこのPCのブラウザ（localStorage）にだけ保存され、AnthropicとGoogleのAPIへ直接送られます。</li>
          <li>このツールを公開サーバーに置かないでください（自分のPCで動かす前提の作りです）。</li>
          <li>各社の管理画面で利用上限（予算アラート）を設定しておくと安心です。</li>
        </ul>
      </Notice>

      <div style={{ marginTop: 20 }}>
        <BackupPanel />
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn danger" type="button" onClick={() => confirm("企画・台本・音声・HTMLをすべて消して新しく始めますか？（APIキー・アカウントの声・ジャンルと見た目の設定は残ります）") && onReset()}>
          プロジェクトを新規作成（全消去）
        </button>
      </div>
    </>
  );
}
