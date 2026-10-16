export type Circle = {
  id: string;
  name: string;
  priority: number;
  day: string;
  hall: string;
  locationRaw: string;
  link: string;
  placement: null | {
    mapId: string;
    x: number;
    y: number;
    status: "confirmed";
    source: "manual" | "pdf";
  };
};
export type Event = {
  id: string;
  name: string;
  days: string[];
  halls: string[];
  circles: Circle[];
  maps: {
    id: string;
    hall: string;
    asset: string;
    coordinateSystem: "normalized";
    source: "official" | "sample";
  }[];
  routes: Record<string, string[]>;
};
export type Data = { version: 1; events: Event[] };
export const emptyData: Data = { version: 1, events: [] };
export const key = "comiket-circle-note-v1";
export function sorted(e: Event) {
  return [...e.circles].sort(
    (a, b) =>
      e.days.indexOf(a.day) - e.days.indexOf(b.day) ||
      e.halls.indexOf(a.hall) - e.halls.indexOf(b.hall) ||
      b.priority - a.priority ||
      a.name.localeCompare(b.name, "ja") ||
      a.id.localeCompare(b.id),
  );
}
const obj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
export function validLink(v: string) {
  if (!v) return true;
  if (/^@[a-zA-Z0-9_]{1,15}$/.test(v)) return true;
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
}
export function linkUrl(v: string) {
  return v.startsWith("@") ? "https://x.com/" + v.slice(1) : v;
}
export function parseData(text: string): Data {
  const d: unknown = JSON.parse(text);
  const fail = () => {
    throw new Error(
      "対応する形式（version: 1）のJSONを選んでください。日目・ホール・優先度・位置情報も確認してください。",
    );
  };
  if (!obj(d) || d.version !== 1 || !Array.isArray(d.events)) return fail();
  const ids = new Set<string>();
  for (const e of d.events) {
    if (!obj(e) || !str(e.id) || ids.has(e.id) || !str(e.name)) return fail();
    ids.add(e.id);
    for (const k of ["days", "halls"])
      if (
        !Array.isArray(e[k]) ||
        !e[k].length ||
        !e[k].every(str) ||
        new Set(e[k]).size !== e[k].length
      )
        return fail();
    if (!Array.isArray(e.circles) || !Array.isArray(e.maps) || !obj(e.routes))
      return fail();
    const mids = new Set<string>();
    for (const m of e.maps) {
      if (
        !obj(m) ||
        !str(m.id) ||
        mids.has(m.id) ||
        !e.halls.includes(m.hall) ||
        !str(m.asset) ||
        m.coordinateSystem !== "normalized" ||
        !["official", "sample"].includes(m.source)
      )
        return fail();
      mids.add(m.id);
    }
    const cids = new Set<string>();
    for (const c of e.circles) {
      if (
        !obj(c) ||
        !str(c.id) ||
        cids.has(c.id) ||
        !str(c.name) ||
        !Number.isInteger(c.priority) ||
        c.priority < 1 ||
        c.priority > 5 ||
        !e.days.includes(c.day) ||
        !e.halls.includes(c.hall) ||
        !str(c.locationRaw) ||
        typeof c.link !== "string" ||
        !validLink(c.link)
      )
        return fail();
      cids.add(c.id);
      if (c.placement !== null) {
        const p = c.placement;
        if (
          !obj(p) ||
          !mids.has(p.mapId) ||
          e.maps.find((m: any) => m.id === p.mapId)?.hall !== c.hall ||
          p.status !== "confirmed" ||
          !["manual", "pdf"].includes(p.source) ||
          typeof p.x !== "number" ||
          typeof p.y !== "number" ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > 1 ||
          p.y < 0 ||
          p.y > 1
        )
          return fail();
      }
    }
    for (const [day, route] of Object.entries(e.routes)) {
      if (
        !e.days.includes(day) ||
        !Array.isArray(route) ||
        new Set(route).size !== route.length ||
        !route.every((id) =>
          e.circles.some((c: any) => c.id === id && c.day === day),
        )
      )
        return fail();
    }
  }
  return d as Data;
}
export function updateCircle(e: Event, c: Circle): Event {
  const previous = e.circles.find((x) => x.id === c.id);
  const moved =
    previous &&
    (previous.day !== c.day ||
      previous.hall !== c.hall ||
      previous.locationRaw !== c.locationRaw);
  return {
    ...e,
    circles: previous
      ? e.circles.map((x) =>
          x.id === c.id ? { ...c, placement: moved ? null : c.placement } : x,
        )
      : [...e.circles, c],
    routes: Object.fromEntries(
      Object.entries(e.routes).map(([day, ids]) => [
        day,
        ids.filter((id) => id !== c.id || day === c.day),
      ]),
    ),
  };
}
