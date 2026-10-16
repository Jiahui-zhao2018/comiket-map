// 以下の名前・識別子・配置はすべて架空の検証データです。
import { describe, it, expect } from "vitest";
import { readDisplayName as read, applyRecognition } from "./displayName";
describe("X表示名のローカル解析", () => {
  it.each([
    ["架空サークルA@1日目南a-44ab", "架空サークルA", "1日目", "南", "a-44ab"],
    ["架空サークルB 2日目東ユ 42ab", "架空サークルB", "2日目", "東", "ユ-42ab"],
    [
      "架空サークルA＠１ 日 目　南 a － ４４ab",
      "架空サークルA",
      "1日目",
      "南",
      "a-44ab",
    ],
    ["作者 ２日目 東 Ａ—０１ab", "作者", "2日目", "東", "Ａ-01ab"],
  ])("指定例と表記揺れ: %s", (raw, name, day, area, location) => {
    const result = read(raw, ["1日目", "2日目"], ["南", "東"]);
    expect(result.name).toBe(name);
    expect(result.days).toEqual([day]);
    expect(result.placements).toEqual([{ area, location }]);
    expect(result.values).toEqual({ name, day, hall: area, location });
    expect(result.raw).toBe(raw);
  });
  it("情報なし・日目のみの表示名を扱う", () => {
    expect(read("ただの名前", ["1日目"], ["東"]).values).toEqual({
      name: "ただの名前",
    });
    expect(read("作者@1日目", ["1日目"], ["東"]).values).toEqual({
      name: "作者",
      day: "1日目",
    });
  });
  it("複数の日目・配置を黙って採用しない", () => {
    const r = read(
      "作者 1日目東A-01a / 2日目南B-02b",
      ["1日目", "2日目"],
      ["東", "南"],
    );
    expect(r.values.day).toBeUndefined();
    expect(r.values.hall).toBeUndefined();
    expect(r.values.location).toBeUndefined();
    expect(r.placements).toHaveLength(2);
  });
  it.each([
    "作者 東A-01a/02b",
    "作者 東A-01・02",
    "作者 東A-01a・B-02cd",
    "作者 東A-01/東B-02",
  ])("複数配置と省略表記でも確定しない: %s", (raw) => {
    expect(read(raw, ["1日目"], ["東"]).values.location).toBeUndefined();
  });
  it("開催回にない日目と複数候補のホールを設定しない", () => {
    const r = read("作者 3日目東A-01a", ["1日目", "2日目"], ["東1", "東2"]);
    expect(r.values.day).toBeUndefined();
    expect(r.values.hall).toBeUndefined();
    expect(r.values.location).toBe("A-01a");
    expect(r.messages.join()).toContain("東1、東2");
  });
  it("開催候補の全角数字は照合し、具体的ホールが一つだけなら使う", () => {
    expect(
      read("作者 1日目東A-01a", ["１日目"], ["東１ホール", "南"]).values,
    ).toMatchObject({ day: "１日目", hall: "東１ホール" });
    expect(
      read("作者 東A-01a", ["1日目"], ["東洋"]).values.hall,
    ).toBeUndefined();
  });
  it("ブロックのケース・文字種は同一視しない", () => {
    expect(read("作者 東a-01a", [], ["東"]).values.location).toBe("a-01a");
    expect(read("作者 東Ａ-01a", [], ["東"]).values.location).toBe("Ａ-01a");
  });
  it("認識値は上書きし、未認識・未確定値は保持する", () => {
    const current = {
      name: "架空の手入力",
      day: "2日目",
      hall: "西",
      location: "原文",
    };
    expect(
      applyRecognition(current, { name: "架空サークルA", location: "a-44ab" }),
    ).toEqual({ ...current, name: "架空サークルA", location: "a-44ab" });
    expect(applyRecognition(current, {})).toEqual(current);
    const ambiguous = read(
      "架空サークルA 1日目東A-01a / 2日目南B-02b",
      ["1日目", "2日目"],
      ["東", "南"],
    );
    expect(applyRecognition(current, ambiguous.values)).toEqual({
      ...current,
      name: "架空サークルA",
    });
  });
});
