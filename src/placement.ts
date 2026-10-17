import { type Circle, type Event, parseData } from "./data";
// A deliberately conservative key. No block case/kana folding or guessed hall.
export const locationKey = (s: string) => s.trim();
export function resolvePlacement(e: Event, c: Circle) {
  const rows = (e.placementData || []).filter(
    (r) =>
      r.confirmed &&
      r.day === c.day &&
      locationKey(r.location) === locationKey(c.locationRaw),
  );
  if (!rows.length) return { status: "対応なし" as const };
  if (rows.some((r) => r.hall !== c.hall))
    return { status: "ホール矛盾・要確認" as const };
  if (rows.length !== 1) return { status: "複数候補・要確認" as const };
  const r = rows[0],
    map = e.maps.find(
      (m) =>
        m.id === r.mapId &&
        m.hall === c.hall &&
        (m.day === undefined || m.day === c.day),
    );
  if (!map) return { status: "マップ不一致・要確認" as const };
  return {
    status: "一致" as const,
    placement: {
      mapId: r.mapId,
      x: r.x,
      y: r.y,
      status: "confirmed" as const,
      source: "mapping" as const,
    },
  };
}
export function autoPlace(e: Event): Event {
  return {
    ...e,
    circles: e.circles.map((c) => {
      if (
        c.autoPlacementDisabled ||
        (c.placement && c.placement.source !== "mapping")
      )
        return c;
      const result = resolvePlacement(e, c);
      return { ...c, placement: result.placement || null };
    }),
  };
}
export function clearPlacement(e: Event, id: string): Event {
  return {
    ...e,
    circles: e.circles.map((c) =>
      c.id === id ? { ...c, placement: null, autoPlacementDisabled: true } : c,
    ),
  };
}
export const safeAsset = (s: string) =>
  /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s) ||
  /^\/?[a-zA-Z0-9_/-]+\.(png|jpg|jpeg|webp|svg)$/.test(s);
export function importMapPackage(
  e: Event,
  text: string,
  day: string,
  hall: string,
): Event {
  const p = JSON.parse(text);
  if (
    !p?.map ||
    p.map.day !== day ||
    p.map.hall !== hall ||
    !safeAsset(p.map.asset) ||
    !Array.isArray(p.placements) ||
    e.maps.some((m) => m.id === p.map.id)
  )
    throw Error(
      "日目・ホール・画像・一意なマップID・placements配列を確認してください。",
    );
  if (
    p.placements.some(
      (r: any) => r.mapId !== p.map.id || r.day !== day || r.hall !== hall,
    )
  )
    throw Error("配置データの日目・ホール・マップIDを揃えてください。");
  const next = {
    ...e,
    maps: [...e.maps, p.map],
    placementData: [...(e.placementData || []), ...p.placements],
  };
  parseData(JSON.stringify({ version: 1, events: [next] }));
  return autoPlace(next);
}
