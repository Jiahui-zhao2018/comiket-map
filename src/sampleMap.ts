import { type Event } from "./data";
// Entirely fictional; embedded raster survives JSON export and browser restarts.
export function createSampleEvent(): Event {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("サンプル画像を生成できません。");
  ctx.fillStyle = "#f4f6ed";
  ctx.fillRect(0, 0, 1000, 700);
  ctx.strokeStyle = "#b2c8b8";
  ctx.lineWidth = 6;
  ctx.strokeRect(25, 25, 950, 650);
  ctx.fillStyle = "#2c6250";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("FICTIONAL SAMPLE HALL — NOT AN OFFICIAL MAP", 65, 85);
  for (const [x, y, label] of [
    [250, 210, "A-01a"],
    [500, 210, "A-02a"],
    [700, 455, "B-01a"],
  ] as const) {
    ctx.fillStyle = "#d8e8d7";
    ctx.fillRect(x - 85, y - 35, 170, 70);
    ctx.fillStyle = "#345e48";
    ctx.fillText(label, x - 55, y + 10);
  }
  ctx.fillText("ENTRANCE (SAMPLE)", 380, 630);
  const id = crypto.randomUUID(),
    mapId = crypto.randomUUID();
  return {
    id,
    name: "架空サンプル開催回",
    days: ["1日目", "2日目"],
    halls: ["架空ホールA"],
    circles: [],
    routes: {},
    maps: [
      {
        id: mapId,
        day: "1日目",
        hall: "架空ホールA",
        asset: canvas.toDataURL("image/png"),
        coordinateSystem: "normalized",
        source: "sample",
      },
    ],
    placementData: [
      ["A-01a", 0.25, 0.3],
      ["A-02a", 0.5, 0.3],
      ["B-01a", 0.7, 0.65],
    ].map(([location, x, y]) => ({
      day: "1日目",
      hall: "架空ホールA",
      location: String(location),
      mapId,
      x: Number(x),
      y: Number(y),
      confirmed: true,
    })),
  };
}
