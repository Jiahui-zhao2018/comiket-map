import { useState } from "react";
import {
  type Fields,
  type Recognition,
  readDisplayName,
  applyRecognition,
} from "./displayName";
export function DisplayNameAssist({
  days,
  halls,
  values,
  onChange,
}: {
  days: string[];
  halls: string[];
  values: Fields;
  onChange: (values: Fields) => void;
}) {
  const [raw, setRaw] = useState(""),
    [result, setResult] = useState<Recognition | null>(null),
    [status, setStatus] = useState("");
  return (
    <section className="display-assist" aria-label="X表示名から入力補助">
      <h3>Xの表示名から入力補助</h3>
      <p>
        貼り付けた文字列だけを読み取ります。Xへのアクセスや保存は行いません。入力例の名前・配置は架空です。
      </p>
      <label>
        Xの表示名
        <input
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setResult(null);
            setStatus("");
          }}
          placeholder="架空の例：架空サークルA@1日目南a-44ab"
        />
      </label>
      <button
        type="button"
        disabled={!raw.trim()}
        onClick={() => {
          setResult(readDisplayName(raw, days, halls));
          setStatus("");
        }}
      >
        読み取る
      </button>
      {result && (
        <div className="recognition">
          <p>
            元の入力：<span className="raw-input">{result.raw}</span>
          </p>
          <dl>
            <dt>名前候補（要確認）</dt>
            <dd>{result.name || "認識できません"}</dd>
            <dt>日目候補</dt>
            <dd>{result.days.join(" / ") || "認識できません"}</dd>
            <dt>エリア・場所候補</dt>
            <dd>
              {result.placements
                .map((p) => `${p.area || "エリア不明"} / ${p.location}`)
                .join("、") || "認識できません"}
            </dd>
          </dl>
          <p>
            反映ボタンで名前候補も上書きします。人物名とサークル名は同一とは限らないため、フォームで確認・修正してください。ブロックの文字種・大小文字は変換していません。
          </p>
          {result.messages.length > 0 && (
            <ul>
              {result.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              onChange(applyRecognition(values, result.values));
              setStatus(
                "認識できた項目を上書きしました。未認識・未確定の項目は元の値を保持しました。フォームで内容を確認・修正してから登録してください。まだ保存していません。",
              );
            }}
          >
            候補をフォームに反映
          </button>
          {status && <p role="status">{status}</p>}
        </div>
      )}
    </section>
  );
}
