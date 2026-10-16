// 以下の名前・識別子・配置はすべて架空の検証データです。
// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { key, parseData } from "./data";
it("開催回作成・登録・編集・再起動復元・JSON読み戻し・削除ができる", async () => {
  const user = userEvent.setup();
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await import("./main");
  await user.click(
    (await screen.findAllByRole("button", { name: "＋ 開催回を追加" }))[0],
  );
  await user.type(screen.getByLabelText(/開催回名/), "検証開催回");
  await user.type(screen.getByLabelText(/^日目/), "1日目、2日目");
  await user.type(screen.getByLabelText(/^ホール/), "東、西");
  await user.click(screen.getByRole("button", { name: "開催回を作成" }));
  await user.click(
    screen.getAllByRole("button", { name: "＋ サークルを登録" })[0],
  );
  await user.type(screen.getByLabelText(/^サークル名/), "テストサークル");
  await user.type(screen.getByLabelText(/^場所/), " A-01a ");
  await user.selectOptions(screen.getByLabelText(/^参加日目/), "1日目");
  await user.selectOptions(screen.getByLabelText(/^ホール 必須/), "東");
  await user.type(screen.getByLabelText(/^URL/), "不正URL");
  await user.click(screen.getByRole("button", { name: "登録する" }));
  expect(screen.getByRole("alert").textContent).toContain("https://");
  await user.clear(screen.getByLabelText(/^URL/));
  await user.type(
    screen.getByLabelText(/^URL/),
    "https://circle-a.example.invalid",
  );
  await user.click(screen.getByRole("button", { name: "登録する" }));
  expect(await screen.findByText("テストサークル")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "編集" }));
  await user.clear(screen.getByLabelText(/^サークル名/));
  await user.type(screen.getByLabelText(/^サークル名/), "編集済み");
  await user.click(screen.getByRole("button", { name: "変更を保存" }));
  expect(await screen.findByText("編集済み")).toBeTruthy();
  const createURL = vi.fn(() => "blob:backup");
  Object.defineProperty(URL, "createObjectURL", {
    value: createURL,
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await user.click(screen.getByRole("button", { name: "↓ JSONを書き出す" }));
  expect(createURL).toHaveBeenCalledOnce();
  const backup = localStorage.getItem(key)!;
  expect(parseData(backup).events[0].circles[0].locationRaw).toBe(" A-01a ");
  // 新しいモジュールとReactルートでアプリを開き直し、永続データから復元。
  document.body.innerHTML = '<div id="root"></div>';
  vi.resetModules();
  await import("./main");
  expect(await screen.findByText("編集済み")).toBeTruthy();
  const file = new File([backup], "backup.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => backup });
  fireEvent.change(document.querySelector("input[type=file]")!, {
    target: { files: [file] },
  });
  await screen.findByText(/JSONを読み戻して保存しました/);
  await user.click(screen.getByRole("button", { name: "編集済みを削除" }));
  await waitFor(() =>
    expect(
      within(document.querySelector("main")!).queryByText("編集済み"),
    ).toBeNull(),
  );
  expect(parseData(localStorage.getItem(key)!).events[0].circles).toHaveLength(
    0,
  );
  // 入力補助は保存せず、曖昧なホールを空欄にしたまま利用者が確認する。
  await user.click(
    screen.getAllByRole("button", { name: "＋ サークルを登録" })[0],
  );
  const dialog = within(screen.getByRole("dialog"));
  const before = localStorage.getItem(key);
  await user.type(
    dialog.getByLabelText("Xの表示名"),
    "架空サークルB 2日目東ユ 42ab",
  );
  await user.click(dialog.getByRole("button", { name: "読み取る" }));
  expect(localStorage.getItem(key)).toBe(before);
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^サークル名/) as HTMLInputElement).value).toBe(
    "架空サークルB",
  );
  expect((dialog.getByLabelText(/^参加日目/) as HTMLSelectElement).value).toBe(
    "2日目",
  );
  expect((dialog.getByLabelText(/^場所/) as HTMLInputElement).value).toBe(
    "ユ-42ab",
  );
  expect(localStorage.getItem(key)).toBe(before);
  await user.clear(dialog.getByLabelText(/^サークル名/));
  await user.type(dialog.getByLabelText(/^サークル名/), "架空の入力済み名");
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^サークル名/) as HTMLInputElement).value).toBe(
    "架空サークルB",
  );
  // 日目だけの候補では場所・ホールは保持し、保存しない。
  await user.clear(dialog.getByLabelText("Xの表示名"));
  await user.type(dialog.getByLabelText("Xの表示名"), "架空サークルC 1日目");
  await user.click(dialog.getByRole("button", { name: "読み取る" }));
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^場所/) as HTMLInputElement).value).toBe(
    "ユ-42ab",
  );
  expect(
    (dialog.getByLabelText(/^ホール 必須/) as HTMLSelectElement).value,
  ).toBe("東");
  expect(localStorage.getItem(key)).toBe(before);
  await user.click(dialog.getByRole("radio", { name: "優先度4" }));
  expect(dialog.getByText("現在の優先度：4 / 5（5が最高）")).toBeTruthy();
  await user.keyboard("{ArrowRight}");
  expect(
    (dialog.getByRole("radio", { name: "優先度5（最高）" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await user.clear(dialog.getByLabelText(/^サークル名/));
  await user.type(dialog.getByLabelText(/^サークル名/), "確認したサークル名");
  await user.clear(dialog.getByLabelText(/^場所/));
  await user.type(dialog.getByLabelText(/^場所/), "ユ-43ab");
  await user.click(dialog.getByRole("button", { name: "登録する" }));
  const saved = parseData(localStorage.getItem(key)!).events[0].circles[0];
  expect(saved).toMatchObject({
    name: "確認したサークル名",
    day: "1日目",
    hall: "東",
    locationRaw: "ユ-43ab",
    priority: 5,
    link: "",
  });
  document.body.innerHTML = '<div id="root"></div>';
  vi.resetModules();
  await import("./main");
  expect(await screen.findByText("確認したサークル名")).toBeTruthy();
  expect(screen.getByText("ユ-43ab")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "編集" }));
  expect(
    (screen.getByRole("radio", { name: "優先度5（最高）" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await user.keyboard("{ArrowLeft}");
  await user.click(screen.getByRole("radio", { name: "優先度2" }));
  await user.click(screen.getByRole("button", { name: "変更を保存" }));
  expect(
    parseData(localStorage.getItem(key)!).events[0].circles[0].priority,
  ).toBe(2);
});
