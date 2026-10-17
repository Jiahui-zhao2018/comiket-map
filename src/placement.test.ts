// All data in this file is fictional.
import { describe, it, expect } from "vitest";
import { type Event, type Circle, parseData, updateCircle } from "./data";
import {
  autoPlace,
  resolvePlacement,
  clearPlacement,
  importMapPackage,
} from "./placement";
const circle: Circle = {
  id: "c",
  name: "架空サークルA",
  day: "1日目",
  hall: "架空ホールA",
  locationRaw: " A-01a ",
  priority: 5,
  link: "",
  placement: null,
};
const event: Event = {
  id: "e",
  name: "架空開催回",
  days: ["1日目", "2日目"],
  halls: ["架空ホールA", "架空ホールB"],
  circles: [circle],
  maps: [
    {
      id: "map",
      day: "1日目",
      hall: "架空ホールA",
      asset: "data:image/png;base64,AAAA",
      source: "sample",
      coordinateSystem: "normalized",
    },
  ],
  routes: {},
  placementData: [
    {
      day: "1日目",
      hall: "架空ホールA",
      location: "A-01a",
      mapId: "map",
      x: 0.25,
      y: 0.3,
      confirmed: true,
    },
  ],
};
describe("確認済み配置データとの照合", () => {
  it("新規・既存を一意の対応位置へ配置し場所原文を保持する", () => {
    const next = autoPlace(event);
    expect(next.circles[0]).toMatchObject({
      locationRaw: " A-01a ",
      placement: { mapId: "map", x: 0.25, y: 0.3, source: "mapping" },
    });
    expect(
      autoPlace({
        ...event,
        circles: [circle, { ...circle, id: "other" }],
      }).circles.every((c) => c.placement),
    ).toBe(true);
  });
  it("対応なし・複数候補・ホール矛盾・マップ不一致で配置しない", () => {
    for (const e of [
      { ...event, placementData: [] },
      {
        ...event,
        placementData: [...event.placementData!, ...event.placementData!],
      },
      { ...event, circles: [{ ...circle, hall: "架空ホールB" }] },
      { ...event, maps: [] },
    ])
      expect(autoPlace(e).circles[0].placement).toBeNull();
    expect(
      resolvePlacement(
        { ...event, circles: [] },
        { ...circle, hall: "架空ホールB" },
      ).status,
    ).toContain("矛盾");
  });
  it("他の日目・開催回の対応を流用しない", () => {
    expect(
      autoPlace({ ...event, circles: [{ ...circle, day: "2日目" }] }).circles[0]
        .placement,
    ).toBeNull();
    expect(
      autoPlace({ ...event, id: "other", maps: [], placementData: [] })
        .circles[0].placement,
    ).toBeNull();
  });
  it("文字種・大小文字を勝手に同一視しない", () => {
    expect(
      resolvePlacement(event, { ...circle, locationRaw: "a-01a" }).placement,
    ).toBeUndefined();
    expect(
      resolvePlacement(event, { ...circle, locationRaw: "Ａ-01a" }).placement,
    ).toBeUndefined();
  });
  it("手動位置と手動解除を再照合で上書きしない", () => {
    const manual = {
      ...event,
      circles: [
        {
          ...circle,
          placement: {
            mapId: "map",
            x: 0.8,
            y: 0.8,
            source: "manual" as const,
            status: "confirmed" as const,
          },
        },
      ],
    };
    expect(autoPlace(manual).circles[0].placement?.x).toBe(0.8);
    expect(
      autoPlace(clearPlacement(manual, "c")).circles[0].placement,
    ).toBeNull();
  });
  it.each([
    { day: "2日目" },
    { hall: "架空ホールB" },
    { locationRaw: "B-01a" },
  ])("日目・ホール・場所の変更で古い配置を解除する: %s", (patch) => {
    const mapped = autoPlace(event);
    const updated = autoPlace(
      updateCircle(mapped, { ...mapped.circles[0], ...patch }),
    );
    expect(updated.circles[0].placement).toBeNull();
  });
  it("PNG資産・自動/手動位置・解除状態をJSON往復で保持する", () => {
    for (const e of [
      autoPlace(event),
      clearPlacement(autoPlace(event), "c"),
      {
        ...event,
        circles: [
          {
            ...circle,
            placement: {
              mapId: "map",
              x: 0.2,
              y: 0.4,
              status: "confirmed" as const,
              source: "manual" as const,
            },
          },
        ],
      },
    ])
      expect(
        parseData(JSON.stringify({ version: 1, events: [e] })).events[0],
      ).toEqual(e);
  });
  it("旧形式の配置なし・dayなしマップも受け付ける", () => {
    const legacy = structuredClone(event);
    delete legacy.placementData;
    delete legacy.maps[0].day;
    expect(
      parseData(JSON.stringify({ version: 1, events: [legacy] })).events[0]
        .circles[0].placement,
    ).toBeNull();
  });
  it("新形式の境界値・日目不一致・不正配置参照を拒否する", () => {
    for (const patch of [
      { x: -0.1 },
      { y: 1.01 },
      { x: "0.5" },
      { day: "2日目" },
      { mapId: "missing" },
      { confirmed: false },
    ])
      expect(() =>
        parseData(
          JSON.stringify({
            version: 1,
            events: [
              {
                ...event,
                maps: [{ ...event.maps[0], day: "1日目" }],
                placementData: [{ ...event.placementData![0], ...patch }],
              },
            ],
          }),
        ),
      ).toThrow();
  });
  it("設定JSONで既存サークルを配置し、スコープ不一致や重複IDを拒否する", () => {
    const base = { ...event, maps: [], placementData: [] };
    const text = JSON.stringify({
      map: { ...event.maps[0], day: "1日目" },
      placements: event.placementData,
    });
    expect(
      importMapPackage(base, text, "1日目", "架空ホールA").circles[0].placement,
    ).not.toBeNull();
    expect(() =>
      importMapPackage(base, text, "2日目", "架空ホールA"),
    ).toThrow();
    expect(() =>
      importMapPackage(event, text, "1日目", "架空ホールA"),
    ).toThrow();
  });
});
