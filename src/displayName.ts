/** Numeric/separator normalization only: block script and case are significant. */
export const normalize = (s: string) =>
  s
    .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10))
    .replace(/[‐‑‒–—―−－﹣]/g, "-");
export type Fields = {
  name: string;
  day: string;
  hall: string;
  location: string;
};
export type Recognition = {
  raw: string;
  name: string;
  days: string[];
  placements: { area: string; location: string }[];
  values: Partial<Fields>;
  messages: string[];
};
export function readDisplayName(
  raw: string,
  days: string[],
  halls: string[],
): Recognition {
  const text = normalize(raw);
  const dayMatches = [...text.matchAll(/([0-9]+)\s*日\s*目/g)];
  // Never fold block case or kana width; no venue-specific equivalence rules are known.
  const matches = [
    ...text.matchAll(
      /(?<![A-Za-zＡ-Ｚａ-ｚ0-9])([東西南北])?\s*([A-Za-zＡ-Ｚａ-ｚア-ヶｦ-ﾟ])\s*-?\s*([0-9]{1,2})\s*([aAbBａＡｂＢ]{1,2})?(?![A-Za-zＡ-Ｚａ-ｚ0-9日])/g,
    ),
  ];
  const placements = matches.map((m) => ({
    area: m[1] || "",
    location: `${m[2]}-${m[3]}${m[4] || ""}`,
  }));
  const first = Math.min(
    ...dayMatches.map((m) => m.index!),
    ...matches.map((m) => m.index!),
    text.length,
  );
  // Transformations above preserve UTF-16 length, so the original name remains intact.
  const name = raw
    .slice(0, first)
    .replace(/[\s@＠|｜・:：]+$/u, "")
    .trim();
  const result: Recognition = {
    raw,
    name,
    days: dayMatches.map((m) => `${m[1]}日目`),
    placements,
    values: {},
    messages: [],
  };
  if (name) result.values.name = name;
  if (!dayMatches.length)
    result.messages.push("日目を認識できません。参加日目を選択してください。");
  else if (dayMatches.length > 1)
    result.messages.push(
      "複数の日目があります。日目は反映しません。参加日目を選択してください。",
    );
  else {
    const candidates = days.filter(
      (d) => normalize(d).replace(/\s/g, "") === result.days[0],
    );
    if (candidates.length === 1) result.values.day = candidates[0];
    else
      result.messages.push(
        `「${result.days[0]}」は開催回の候補に一意に一致しません。参加日目を選択してください。`,
      );
  }
  if (!matches.length)
    result.messages.push(
      "配置を認識できません。ホール・場所を手入力してください（対応例：東A-01a）。",
    );
  else if (
    matches.length > 1 ||
    /[\/／,、&＆+＋・と]\s*(?:[東西南北]\s*)?(?:[A-Za-zＡ-Ｚａ-ｚア-ヶｦ-ﾟ]\s*-?\s*)?[0-9]{1,2}/.test(
      text,
    )
  )
    result.messages.push(
      "複数の配置があります。ホール・場所は反映しません。利用する配置を手入力してください。",
    );
  else {
    result.values.location = placements[0].location;
    const area = placements[0].area;
    // Area prefixes such as 東1/東2 are only choices, never guessed concrete halls.
    const candidates = area
      ? halls.filter((h) =>
          new RegExp(`^${area}(?:[0-9]+(?:ホール)?|ホール(?:[0-9]+)?)?$`).test(
            normalize(h).replace(/\s/g, ""),
          ),
        )
      : [];
    if (candidates.length === 1) result.values.hall = candidates[0];
    else
      result.messages.push(
        area
          ? `エリア「${area}」からホールを確定できません${candidates.length ? `（候補：${candidates.join("、")}）` : ""}。ホールを選択してください。`
          : "エリアを認識できません。ホールを選択してください。",
      );
  }
  return result;
}
export function applyRecognition(current: Fields, values: Partial<Fields>) {
  const next = { ...current };
  for (const k of ["name", "day", "hall", "location"] as const) {
    if (values[k]) next[k] = values[k];
  }
  return next;
}
