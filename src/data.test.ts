// 以下の名前・識別子・配置はすべて架空の検証データです。
import { describe, it, expect } from "vitest";
import {
  type Event,
  type Circle,
  sorted,
  parseData,
  updateCircle,
  validLink,
} from "./data";
const c = (id: string, day = "1日目", hall = "東", priority = 3): Circle => ({
  id,
  name: id,
  day,
  hall,
  priority,
  locationRaw: " A-01a ",
  link: "",
  placement: null,
});
const event: Event = {
  id: "event",
  name: "テスト開催回",
  days: ["1日目", "2日目"],
  halls: ["東", "西"],
  circles: [
    c("z", "2日目", "東", 5),
    c("b", "1日目", "西", 5),
    c("d"),
    c("a", "1日目", "東", 5),
    c("c"),
  ],
  maps: [],
  routes: { "1日目": ["a", "c"] },
};
describe("訪問手帳の保存契約", () => {
  it("日目→ホール→優先度降順→名前で混在データを整理する", () => {
    expect(sorted(event).map((c) => c.id)).toEqual(["a", "c", "d", "b", "z"]);
  });
  it("同名同順位でもIDで順序を一定にする", () => {
    expect(
      sorted({
        ...event,
        circles: [
          { ...c("b"), name: "同名" },
          { ...c("a"), name: "同名" },
        ],
      }).map((c) => c.id),
    ).toEqual(["a", "b"]);
  });
  it("編集を反映し日目変更時にルートから除外する", () => {
    const updated = updateCircle(event, {
      ...event.circles[3],
      name: "変更後",
      day: "2日目",
    });
    expect(updated.circles.find((c) => c.id === "a")?.name).toBe("変更後");
    expect(updated.routes["1日目"]).toEqual(["c"]);
  });
  it("保存と書き出しのJSONを情報を失わず読み戻す", () => {
    const data = { version: 1, events: [event] };
    expect(parseData(JSON.stringify(data))).toEqual(data);
    expect(
      parseData(JSON.stringify(data)).events[0].circles[0].locationRaw,
    ).toBe(" A-01a ");
  });
  it("不正な優先度・候補・必須項目・リンク・重複IDを拒否する", () => {
    for (const patch of [
      { priority: 0 },
      { priority: 6 },
      { day: "3日目" },
      { hall: "北" },
      { name: " " },
      { locationRaw: "" },
      { link: "javascript:alert(1)" },
      { id: "b" },
    ])
      expect(() =>
        parseData(
          JSON.stringify({
            version: 1,
            events: [
              {
                ...event,
                circles: event.circles.map((c, i) =>
                  i === 0 ? { ...c, ...patch } : c,
                ),
              },
            ],
          }),
        ),
      ).toThrow();
  });
  it("確認済み座標とルートを保持し場所変更時のみ座標を解除する", () => {
    const mapped: Event = {
      ...event,
      maps: [
        {
          id: "map",
          hall: "東",
          asset: "official-map.png",
          coordinateSystem: "normalized",
          source: "official",
        },
      ],
      circles: [
        {
          ...c("a"),
          placement: {
            mapId: "map",
            x: 0.2,
            y: 0.3,
            status: "confirmed",
            source: "manual",
          },
        },
      ],
      routes: { "1日目": ["a"] },
    };
    expect(
      parseData(JSON.stringify({ version: 1, events: [mapped] })).events[0],
    ).toEqual(mapped);
    expect(
      updateCircle(mapped, { ...mapped.circles[0], priority: 5 }).circles[0]
        .placement,
    ).not.toBeNull();
    expect(
      updateCircle(mapped, { ...mapped.circles[0], locationRaw: "B-01" })
        .circles[0].placement,
    ).toBeNull();
  });
  it("範囲外座標と存在しない訪問先を拒否する", () => {
    expect(() =>
      parseData(
        JSON.stringify({
          version: 1,
          events: [{ ...event, routes: { "1日目": ["missing"] } }],
        }),
      ),
    ).toThrow();
  });
  it("URLとXユーザー名だけをリンクとして受け付ける", () => {
    expect(validLink("@fiction_test01")).toBe(true);
    expect(validLink("https://circle-a.example.invalid")).toBe(true);
    expect(validLink("javascript:alert(1)")).toBe(false);
  });
});
