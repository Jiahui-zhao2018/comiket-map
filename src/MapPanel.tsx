import { useEffect, useRef, useState } from "react";
import { type Event, type Circle, linkUrl } from "./data";
import {
  autoPlace,
  clearPlacement,
  resolvePlacement,
  importMapPackage,
  safeAsset,
} from "./placement";
export function MapPanel({
  event,
  onSave,
}: {
  event: Event;
  onSave: (e: Event) => boolean;
}) {
  const [day, setDay] = useState(event.days[0]),
    [hall, setHall] = useState(event.halls[0]),
    [chosenMap, setChosenMap] = useState("");
  const [selected, setSelected] = useState(""),
    [mode, setMode] = useState(false),
    [draft, setDraft] = useState<{ x: number; y: number } | null>(null),
    [message, setMessage] = useState(""),
    [imageError, setImageError] = useState("");
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);
  const plane = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(1000 / 700),
    [box, setBox] = useState({ width: 600, height: 480 }),
    [assetSource, setAssetSource] = useState<"sample" | "official">("sample");
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () =>
      setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [event.maps, day, hall, chosenMap]);
  const maps = event.maps.filter(
    (m) => m.hall === hall && (m.day === undefined || m.day === day),
  );
  const map =
    maps.length === 1 ? maps[0] : maps.find((m) => m.id === chosenMap);
  const circles = event.circles.filter((c) => c.day === day && c.hall === hall);
  const circle = circles.find((c) => c.id === selected);
  function reset() {
    setView({ zoom: 1, x: 0, y: 0 });
    setMode(false);
    setDraft(null);
    setSelected("");
    setImageError("");
  }
  function persist(next: Event) {
    if (onSave(next)) {
      setMessage("配置とマップを保存しました");
      return true;
    }
    return false;
  }
  function choose(c: Circle) {
    setSelected(c.id);
    setMode(false);
    setDraft(null);
  }
  async function upload(file?: File, kind = "package") {
    if (!file) return;
    try {
      if (file.size > 3 * 1024 * 1024)
        throw Error("3MB以下のファイルを使用してください。");
      if (kind === "package") {
        persist(importMapPackage(event, await file.text(), day, hall));
      } else {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw Error("PNG・JPEG・WebPを選んでください。");
        const asset = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(Error("画像を読み込めません。"));
          r.readAsDataURL(file);
        });
        persist({
          ...event,
          maps: [
            ...event.maps,
            {
              id: crypto.randomUUID(),
              day,
              hall,
              asset,
              coordinateSystem: "normalized",
              source: assetSource,
            },
          ],
        });
      }
      reset();
    } catch (e) {
      setMessage(
        "設定できません：" +
          (e instanceof Error ? e.message : "形式を確認してください。"),
      );
    }
  }
  return (
    <section className="map-panel">
      <h2>サークルマップ</h2>
      <div className="map-controls">
        <label>
          マップの日目
          <select
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setChosenMap("");
              reset();
            }}
          >
            {event.days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          マップのホール
          <select
            value={hall}
            onChange={(e) => {
              setHall(e.target.value);
              setChosenMap("");
              reset();
            }}
          >
            {event.halls.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </label>
        {maps.length > 1 && (
          <label>
            表示マップ
            <select
              value={chosenMap}
              onChange={(e) => {
                setChosenMap(e.target.value);
                reset();
              }}
            >
              <option value="">複数あります。選択してください</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}（{m.source}）
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <details>
        <summary>マップ・確認済み配置データの設定</summary>
        <p>
          現在の日目・ホールに設定します。画像はローカルファイルを保存。JSONはREADMEの形式を使用してください。公式配置の推測は行いません。画像のみでは自動配置できません。
        </p>
        <label>
          画像区分
          <select
            value={assetSource}
            onChange={(e) =>
              setAssetSource(e.target.value as "sample" | "official")
            }
          >
            <option value="sample">架空・説明用地図</option>
            <option value="official">公式資料（利用者が出所を確認）</option>
          </select>
        </label>
        <label>
          ホール画像を追加（利用権限のある資料）
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              void upload(e.target.files?.[0], "image");
              e.target.value = "";
            }}
          />
        </label>
        <label>
          確認済みマップ設定JSONを追加
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </details>
      {message && <p role="status">{message}</p>}
      {!map ? (
        <div className="empty">
          <h3>
            {maps.length ? "表示するマップを選んでください" : "マップ未設定"}
          </h3>
          <p>
            上の設定からホール画像または確認済みマップ設定JSONを追加してください。架空地図はサイドバーの「架空サンプル開催回を追加」で試せます。
          </p>
        </div>
      ) : (
        <>
          <p className={map.source === "sample" ? "sample-banner" : "hint"}>
            {map.source === "sample"
              ? "架空のサンプル地図・配置です。実際の会場では使用しないでください。"
              : "利用者が設定した地図です。位置は資料と照合してください。"}
            {map.day === undefined ? "（旧形式：同じ背景を各日目に使用）" : ""}
          </p>
          <div className="map-controls">
            <button
              onClick={() =>
                setView((v) => ({ ...v, zoom: Math.min(4, v.zoom + 0.25) }))
              }
            >
              拡大
            </button>
            <button
              onClick={() =>
                setView((v) => ({ ...v, zoom: Math.max(1, v.zoom - 0.25) }))
              }
            >
              縮小
            </button>
            <button onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>
              全体表示
            </button>
            <button onClick={() => persist(autoPlace(event))}>
              既存サークルを自動照合
            </button>
            <button
              onClick={() => {
                if (confirm("このマップと対応する配置・座標を削除しますか？")) {
                  persist({
                    ...event,
                    maps: event.maps.filter((m) => m.id !== map.id),
                    placementData: event.placementData?.filter(
                      (r) => r.mapId !== map.id,
                    ),
                    circles: event.circles.map((c) =>
                      c.placement?.mapId === map.id
                        ? { ...c, placement: null }
                        : c,
                    ),
                  });
                  reset();
                }
              }}
            >
              このマップを削除
            </button>
          </div>
          <p className="hint">
            通常はドラッグで移動・マーカーで詳細表示。配置にはサークルを選んで「位置を指定・修正」を押してください。
            {mode
              ? "【位置指定中】地図クリックで仮位置を指定し、保存してください。"
              : ""}
          </p>
          <div
            ref={viewport}
            className={"map-viewport" + (mode ? " placing" : "")}
            role="region"
            aria-label="ホール地図"
            tabIndex={0}
            onKeyDown={(e) => {
              const delta = 40;
              if (e.key === "Escape") {
                setMode(false);
                setDraft(null);
              } else if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                setView((v) => ({
                  ...v,
                  x:
                    v.x +
                    (e.key === "ArrowLeft"
                      ? delta
                      : e.key === "ArrowRight"
                        ? -delta
                        : 0),
                  y:
                    v.y +
                    (e.key === "ArrowUp"
                      ? delta
                      : e.key === "ArrowDown"
                        ? -delta
                        : 0),
                }));
              }
            }}
            onPointerDown={(e) => {
              if (
                mode ||
                e.button !== 0 ||
                (e.target as HTMLElement).closest("button")
              )
                return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                vx: view.x,
                vy: view.y,
              };
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const dx = e.clientX - d.x,
                dy = e.clientY - d.y;
              setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <div
              ref={plane}
              className="map-plane"
              style={{
                width: Math.min(box.width, box.height * ratio),
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              }}
              onClick={(e) => {
                if (!mode || !plane.current || !circle || imageError) return;
                const r = plane.current.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width,
                  y = (e.clientY - r.top) / r.height;
                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) setDraft({ x, y });
              }}
            >
              {safeAsset(map.asset) ? (
                <img
                  src={map.asset}
                  alt={`${day} ${hall}のホール地図`}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setRatio(img.naturalWidth / img.naturalHeight);
                      setImageError("");
                    }
                  }}
                  onError={() =>
                    setImageError(
                      "画像を表示できません。設定ファイルに画像データを含めるか参照先を確認してください。",
                    )
                  }
                />
              ) : (
                <p role="alert">
                  この画像参照は表示できません。ローカル画像を設定してください。
                </p>
              )}
              {circles
                .filter((c) => c.placement?.mapId === map.id)
                .map((c) => (
                  <button
                    key={c.id}
                    className="map-marker"
                    style={{
                      left: `${c.placement!.x * 100}%`,
                      top: `${c.placement!.y * 100}%`,
                    }}
                    aria-label={`${c.name}の詳細（優先度${c.priority}）`}
                    onClick={(e) => {
                      e.stopPropagation();
                      choose(c);
                    }}
                  >
                    ★{c.priority}
                  </button>
                ))}
              {mode && draft && (
                <span
                  className="draft-marker"
                  style={{
                    left: `${draft.x * 100}%`,
                    top: `${draft.y * 100}%`,
                  }}
                >
                  ＋
                </span>
              )}
            </div>
          </div>
          {imageError && <p role="alert">{imageError}</p>}
        </>
      )}
      <div className="map-bottom">
        <div>
          <h3>この日目・ホールのサークル（{circles.length}）</h3>
          <p>
            同じ位置のマーカーが重なっていても、下の各サークルから詳細を開けます。
          </p>
          {circles.map((c) => (
            <button className="map-circle" key={c.id} onClick={() => choose(c)}>
              {c.name} · ★{c.priority} ·{" "}
              {c.placement
                ? `配置済み（${c.placement.source}）`
                : c.autoPlacementDisabled
                  ? "未配置（自動照合停止）"
                  : resolvePlacement(event, c).status}
            </button>
          ))}
          {!circles.length && (
            <p>
              この条件のサークルはありません。上部の登録ボタンから追加してください。
            </p>
          )}
        </div>
        {circle && (
          <section className="map-detail" aria-label="サークル詳細">
            <h3>{circle.name}</h3>
            <dl>
              <dt>日目</dt>
              <dd>{circle.day}</dd>
              <dt>ホール</dt>
              <dd>{circle.hall}</dd>
              <dt>場所（原文）</dt>
              <dd className="raw-input">{circle.locationRaw}</dd>
              <dt>優先度</dt>
              <dd>{circle.priority} / 5</dd>
              <dt>登録リンク</dt>
              <dd>
                {circle.link ? (
                  <a
                    href={linkUrl(circle.link)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {circle.link}
                  </a>
                ) : (
                  "未登録"
                )}
              </dd>
            </dl>
            <button
              disabled={!map || !!imageError || !safeAsset(map.asset)}
              onClick={() => {
                setMode(true);
                setDraft(null);
              }}
            >
              位置を指定・修正
            </button>
            <button
              onClick={() => {
                if (persist(clearPlacement(event, circle.id))) {
                  setMode(false);
                  setDraft(null);
                }
              }}
            >
              配置を解除
            </button>
            {circle.autoPlacementDisabled && (
              <button
                onClick={() =>
                  persist(
                    autoPlace({
                      ...event,
                      circles: event.circles.map((c) =>
                        c.id === circle.id
                          ? { ...c, autoPlacementDisabled: false }
                          : c,
                      ),
                    }),
                  )
                }
              >
                自動照合を再開
              </button>
            )}
            {mode && (
              <div>
                <p>
                  地図上で位置を指定してください。保存するまで変更されません。
                </p>
                <button
                  disabled={
                    !draft || !map || !!imageError || !safeAsset(map.asset)
                  }
                  onClick={() => {
                    if (
                      draft &&
                      map &&
                      persist({
                        ...event,
                        circles: event.circles.map((c) =>
                          c.id === circle.id
                            ? {
                                ...c,
                                autoPlacementDisabled: false,
                                placement: {
                                  mapId: map.id,
                                  ...draft,
                                  status: "confirmed",
                                  source: "manual",
                                },
                              }
                            : c,
                        ),
                      })
                    ) {
                      setMode(false);
                      setDraft(null);
                    }
                  }}
                >
                  この位置を保存
                </button>
                <button
                  onClick={() => {
                    setMode(false);
                    setDraft(null);
                  }}
                >
                  位置指定をキャンセル
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}
