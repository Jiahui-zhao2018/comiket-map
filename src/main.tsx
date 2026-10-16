import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type Data,
  type Event,
  type Circle,
  key,
  emptyData,
  parseData,
  sorted,
  validLink,
  linkUrl,
  updateCircle,
} from "./data";
import "./style.css";
import { DisplayNameAssist } from "./DisplayNameAssist";
const uid = () => crypto.randomUUID();
function App() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return { data: raw ? parseData(raw) : emptyData, error: "" };
    } catch {
      return {
        data: emptyData,
        error:
          "保存データを読み込めませんでした。元データを保護するため保存を停止しています。バックアップJSONを読み戻してください。",
      };
    }
  });
  const [data, setData] = useState<Data>(initial.data),
    [selected, select] = useState(initial.data.events[0]?.id || ""),
    [error, setError] = useState(initial.error),
    [notice, setNotice] = useState(""),
    [blocked, setBlocked] = useState(!!initial.error);
  const [eventOpen, setEventOpen] = useState(false),
    [edit, setEdit] = useState<Circle | null | undefined>(undefined),
    [query, setQuery] = useState(""),
    [day, setDay] = useState(""),
    [hall, setHall] = useState("");
  const event = data.events.find((e) => e.id === selected);
  function save(next: Data) {
    try {
      if (blocked)
        throw Error(
          "保存データ保護中です。バックアップJSONを読み戻してから操作してください。",
        );
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      setError("");
      setNotice("このブラウザーに保存しました");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "保存できません。ブラウザーの空き容量を確認してください。",
      );
      return false;
    }
  }
  function saveEvent(e: Event) {
    return save({
      ...data,
      events: data.events.map((x) => (x.id === e.id ? e : x)),
    });
  }
  function changeEvent(id: string) {
    select(id);
    setDay("");
    setHall("");
    setQuery("");
    setEdit(undefined);
  }
  function exportData() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download =
      "circle-note-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      const next = parseData(await file.text());
      if (
        !confirm(
          "現在の全開催回をファイルの内容で置き換えます。必要なら先に書き出してください。読み戻しますか？",
        )
      )
        return;
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      setBlocked(false);
      changeEvent(next.events[0]?.id || "");
      setError("");
      setNotice("JSONを読み戻して保存しました");
    } catch (e) {
      setError(
        "読み戻しできませんでした。" + (e instanceof Error ? e.message : ""),
      );
    }
  }
  const circles = event
    ? sorted(event).filter(
        (c) =>
          (!day || c.day === day) &&
          (!hall || c.hall === hall) &&
          `${c.name} ${c.locationRaw}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
    : [];
  return (
    <>
      <header>
        <a className="brand" href=".">
          <span className="logo">C</span>Circle Note
          <small>コミケの訪問手帳</small>
        </a>
        <span className="local">● 端末内に保存</span>
      </header>
      <div className="layout">
        <aside>
          <div className="eyebrow">YOUR EVENTS</div>
          <h2>開催回</h2>
          <nav>
            {data.events.map((e) => (
              <button
                className={e.id === selected ? "active" : ""}
                key={e.id}
                onClick={() => changeEvent(e.id)}
              >
                <span>▦　{e.name}</span>
                <small>{e.circles.length}</small>
              </button>
            ))}
          </nav>
          <button className="add-event" onClick={() => setEventOpen(true)}>
            ＋ 開催回を追加
          </button>
          <div className="side-note">
            <strong>自分のペースで、巡ろう。</strong>
            <p>気になるサークルを集めて、当日の楽しみを少しずつ。</p>
          </div>
          <div className="backup">
            <div className="eyebrow">BACKUP</div>
            <button onClick={exportData}>↓ JSONを書き出す</button>
            <label className="import">
              ↑ JSONを読み戻す
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  void importData(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <p>
              端末間の移動にも使えます。定期的なバックアップをおすすめします。
            </p>
          </div>
        </aside>
        <main>
          <div className="eyebrow">CIRCLE COLLECTION</div>
          <div className="page-title">
            <div>
              <h1>{event?.name || "訪問したい場所を、ひとつずつ。"}</h1>
              <p>サークルを整理して、当日の「行きたい」を見える形に。</p>
            </div>
            {event && (
              <button className="primary" onClick={() => setEdit(null)}>
                ＋ サークルを登録
              </button>
            )}
          </div>
          <div className="tabs">
            <span className="current">サークル一覧</span>
            <span>
              マップ <small>準備中</small>
            </span>
            <span>
              訪問ルート <small>準備中</small>
            </span>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              ✓ {notice}
            </div>
          )}
          {event ? (
            <>
              <section className="stats">
                <div>
                  <span>登録サークル</span>
                  <strong>
                    {event.circles.length}
                    <small> サークル</small>
                  </strong>
                </div>
                <div>
                  <span>優先度 5</span>
                  <strong>
                    {event.circles.filter((c) => c.priority === 5).length}
                    <small> サークル</small>
                  </strong>
                </div>
                <div>
                  <span>未配置</span>
                  <strong>
                    {event.circles.filter((c) => !c.placement).length}
                    <small> サークル</small>
                  </strong>
                </div>
              </section>
              <section className="collection">
                <div className="section-title">
                  <h2>
                    サークル一覧 <span>{circles.length}</span>
                  </h2>
                  <small>日目 → ホール → 優先度順</small>
                </div>
                <div className="filters">
                  <input
                    aria-label="サークル検索"
                    placeholder="⌕ サークル名・場所で検索"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label="日目フィルター"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    <option value="">すべての日目</option>
                    {event.days.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    aria-label="ホールフィルター"
                    value={hall}
                    onChange={(e) => setHall(e.target.value)}
                  >
                    <option value="">すべてのホール</option>
                    {event.halls.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                {circles.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>サークル名 / リンク</th>
                          <th>日目・ホール</th>
                          <th>場所</th>
                          <th>優先度</th>
                          <th>配置</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {circles.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <strong>{c.name}</strong>
                              {c.link && (
                                <a
                                  href={linkUrl(c.link)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {c.link} ↗
                                </a>
                              )}
                            </td>
                            <td>
                              {c.day}
                              <small>{c.hall}</small>
                            </td>
                            <td className="location">{c.locationRaw}</td>
                            <td>
                              <span className={"priority p" + c.priority}>
                                ★ {c.priority}
                              </span>
                            </td>
                            <td>
                              <span className="placement">
                                {c.placement ? "確認済み" : "未配置"}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button onClick={() => setEdit(c)}>編集</button>
                                <button
                                  className="delete"
                                  aria-label={c.name + "を削除"}
                                  onClick={() => {
                                    if (
                                      confirm(`「${c.name}」を削除しますか？`)
                                    )
                                      saveEvent({
                                        ...event,
                                        circles: event.circles.filter(
                                          (x) => x.id !== c.id,
                                        ),
                                        routes: Object.fromEntries(
                                          Object.entries(event.routes).map(
                                            ([d, ids]) => [
                                              d,
                                              ids.filter((id) => id !== c.id),
                                            ],
                                          ),
                                        ),
                                      });
                                  }}
                                >
                                  削除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">
                    <div>▤</div>
                    <h3>
                      {event.circles.length
                        ? "条件に合うサークルがありません"
                        : "最初のサークルを登録しましょう"}
                    </h3>
                    <p>
                      {event.circles.length
                        ? "検索や絞り込みの条件を変えてください。"
                        : "サークル名と配置番号をメモして、訪問リストを作れます。"}
                    </p>
                    {!event.circles.length && (
                      <button className="primary" onClick={() => setEdit(null)}>
                        ＋ サークルを登録
                      </button>
                    )}
                  </div>
                )}
              </section>
              <p className="hint">
                ⓘ
                場所の入力原文を保存します。会場データとの対応が未確認のサークルは「未配置」です。
              </p>
            </>
          ) : (
            <section className="welcome">
              <span>▦</span>
              <h2>まずは開催回を作成</h2>
              <p>
                開催回の名前と、参加日目・ホールの候補を設定しましょう。
                <br />
                会場情報がまだなくても登録を始められます。
              </p>
              <button className="primary" onClick={() => setEventOpen(true)}>
                ＋ 開催回を追加
              </button>
            </section>
          )}
          <footer>
            Circle Note <span>あなたの「行きたい」を、大切に。</span>
          </footer>
        </main>
      </div>
      {eventOpen && (
        <Modal title="開催回を追加" close={() => setEventOpen(false)}>
          <EventForm
            submit={(e) => {
              if (save({ ...data, events: [...data.events, e] })) {
                changeEvent(e.id);
                setEventOpen(false);
              }
            }}
          />
        </Modal>
      )}
      {edit !== undefined && event && (
        <Modal
          title={edit ? "サークルを編集" : "サークルを登録"}
          close={() => setEdit(undefined)}
        >
          <CircleForm
            event={event}
            circle={edit}
            submit={(c) => {
              if (saveEvent(updateCircle(event, c))) setEdit(undefined);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overlay"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button aria-label="閉じる" onClick={close}>
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function EventForm({ submit }: { submit: (e: Event) => void }) {
  const [err, setErr] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name")).trim();
        const split = (k: string) =>
          String(f.get(k))
            .split(/[,、\n]/)
            .map((x) => x.trim())
            .filter(Boolean);
        const days = split("days"),
          halls = split("halls");
        if (!name || !days.length || !halls.length) {
          setErr("開催回名、日目、ホールをそれぞれ1つ以上入力してください。");
          return;
        }
        if (
          new Set(days).size !== days.length ||
          new Set(halls).size !== halls.length
        ) {
          setErr("日目・ホールの重複を取り除いてください。");
          return;
        }
        submit({
          id: uid(),
          name,
          days,
          halls,
          circles: [],
          maps: [],
          routes: {},
        });
      }}
    >
      <p>
        実際の開催回に合わせて入力してください。候補は入力順で一覧に並びます。
      </p>
      <label>
        開催回名 <b>必須</b>
        <input
          name="name"
          required
          autoFocus
          placeholder="例：コミックマーケット ○○"
        />
      </label>
      <label>
        日目 <b>必須</b>
        <textarea name="days" required placeholder="例：1日目、2日目" />
        <small>カンマ・読点・改行で区切ります。</small>
      </label>
      <label>
        ホール <b>必須</b>
        <textarea name="halls" required placeholder="例：東1、東2、西1" />
        <small>会場の正式な区分を入力してください。</small>
      </label>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button className="primary full">開催回を作成</button>
    </form>
  );
}
export function CircleForm({
  event,
  circle,
  submit,
}: {
  event: Event;
  circle: Circle | null;
  submit: (c: Circle) => void;
}) {
  const [err, setErr] = useState("");
  const [fields, setFields] = useState({
    name: circle?.name || "",
    day: circle?.day || "",
    hall: circle?.hall || "",
    location: circle?.locationRaw || "",
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const value = (k: string) => String(f.get(k) || "");
        const name = value("name").trim(),
          locationRaw = value("location"),
          link = value("link").trim(),
          priority = Number(value("priority"));
        if (!name || !locationRaw.trim()) {
          setErr("サークル名と場所は、空白以外の文字を入力してください。");
          return;
        }
        if (!validLink(link)) {
          setErr(
            "リンクは https:// で始まるURL、または @ユーザー名（英数字・_、15文字以内）を入力してください。",
          );
          return;
        }
        if (
          !event.days.includes(value("day")) ||
          !event.halls.includes(value("hall")) ||
          !Number.isInteger(priority) ||
          priority < 1 ||
          priority > 5
        ) {
          setErr("日目・ホールを候補から選び、優先度を1〜5にしてください。");
          return;
        }
        submit({
          id: circle?.id || uid(),
          name,
          priority,
          day: value("day"),
          hall: value("hall"),
          locationRaw,
          link,
          placement: circle?.placement || null,
        });
      }}
    >
      <DisplayNameAssist
        days={event.days}
        halls={event.halls}
        values={fields}
        onChange={setFields}
      />
      <label>
        サークル名 <b>必須</b>
        <input
          name="name"
          required
          autoFocus
          value={fields.name}
          onChange={(e) => setFields({ ...fields, name: e.target.value })}
          placeholder="サークル名を入力"
        />
      </label>
      <div className="form-grid">
        <label>
          参加日目 <b>必須</b>
          <select
            name="day"
            required
            value={fields.day}
            onChange={(e) => setFields({ ...fields, day: e.target.value })}
          >
            <option value="">日目を選択</option>
            {event.days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          ホール <b>必須</b>
          <select
            name="hall"
            required
            value={fields.hall}
            onChange={(e) => setFields({ ...fields, hall: e.target.value })}
          >
            <option value="">ホールを選択</option>
            {event.halls.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        場所 <b>必須</b>
        <input
          name="location"
          required
          value={fields.location}
          onChange={(e) => setFields({ ...fields, location: e.target.value })}
          placeholder="例：A-01a（入力した原文を保持します）"
        />
      </label>
      <label>
        優先度 <b>必須</b>
        <select name="priority" defaultValue={circle?.priority || 3}>
          {[5, 4, 3, 2, 1].map((p) => (
            <option key={p} value={p}>
              {p}
              {p === 5 ? " — 最優先" : p === 1 ? " — 低め" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        URL または Xの@ユーザー名 <small>任意</small>
        <input
          name="link"
          defaultValue={circle?.link}
          placeholder="https://… または @username"
        />
      </label>
      <p className="hint">
        場所は原文のまま保存します。日目・ホール・場所を変更すると、既存の位置確認は解除されます。
      </p>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button className="primary full">
        {circle ? "変更を保存" : "登録する"}
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
