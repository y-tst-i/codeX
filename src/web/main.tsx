import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HostApp } from "./host-app.js";
import "./styles.css";

function Placeholder() {
  return (
    <main className="loading">
      <h1>ISLAND 7</h1>
      <p>この画面はGATE 3で実装します。現在は進行管理画面を優先しています。</p>
      <a href="/host">進行管理画面を開く</a>
    </main>
  );
}

const element = document.getElementById("root");
if (!element) throw new Error("root要素が見つかりません。");
createRoot(element).render(
  <StrictMode>
    {window.location.pathname === "/host" ? <HostApp /> : <Placeholder />}
  </StrictMode>
);
