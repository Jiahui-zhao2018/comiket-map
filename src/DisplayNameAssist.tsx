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
    [overwrite, setOverwrite] = useState(false),
    [includeName, setIncludeName] = useState(false),
    [status, setStatus] = useState("");
  return (
    <section className="display-assist" aria-label="X表示名から入力補助">
      <h3>Xの表示名から入力補助</h3>
      <p>
        貼り付けた文字列だけを読み取ります。Xへのアクセスや保存は行いません。
      </p>
      <label>
        Xの表示名
        <input
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setResult(null);
            setStatus("");
            setIncludeName(false);
            setOverwrite(false);
          }}
          placeholder="例：晃田ヒカ@1日目南a-44ab"
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
            人物名とサークル名は同一とは限りません。ブロックの文字種・大小文字は変換していません。
          </p>
          {result.messages.length > 0 && (
            <ul>
              {result.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={includeName}
              onChange={(e) => setIncludeName(e.target.checked)}
            />
            名前候補を確認し、サークル名にも使う
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            入力済み項目の上書きを許可する
          </label>
          <button
            type="button"
            onClick={() => {
              const { next, kept } = applyRecognition(
                values,
                result.values,
                overwrite,
                includeName,
              );
              onChange(next);
              setStatus(
                `フォームに候補を反映しました。${kept.length ? "入力済み項目は保持しました。" : ""}不足項目を選び、内容を確認してから登録してください。まだ保存していません。`,
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
