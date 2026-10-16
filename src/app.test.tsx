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
  await user.type(screen.getByLabelText(/^URL/), "@circle");
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
  await user.type(dialog.getByLabelText("Xの表示名"), "92M 2日目東ユ 42ab");
  await user.click(dialog.getByRole("button", { name: "読み取る" }));
  expect(localStorage.getItem(key)).toBe(before);
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^サークル名/) as HTMLInputElement).value).toBe(
    "",
  );
  expect((dialog.getByLabelText(/^参加日目/) as HTMLSelectElement).value).toBe(
    "2日目",
  );
  expect((dialog.getByLabelText(/^場所/) as HTMLInputElement).value).toBe(
    "ユ-42ab",
  );
  expect(localStorage.getItem(key)).toBe(before);
  await user.click(
    dialog.getByLabelText("名前候補を確認し、サークル名にも使う"),
  );
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  await user.clear(dialog.getByLabelText(/^サークル名/));
  await user.type(dialog.getByLabelText(/^サークル名/), "確認したサークル名");
  // 上書き未選択では、確認済みの手入力を保持。
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^サークル名/) as HTMLInputElement).value).toBe(
    "確認したサークル名",
  );
  await user.click(dialog.getByLabelText("入力済み項目の上書きを許可する"));
  await user.click(
    dialog.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect((dialog.getByLabelText(/^サークル名/) as HTMLInputElement).value).toBe(
    "92M",
  );
  await user.clear(dialog.getByLabelText(/^サークル名/));
  await user.type(dialog.getByLabelText(/^サークル名/), "確認したサークル名");
  await user.clear(dialog.getByLabelText(/^場所/));
  await user.type(dialog.getByLabelText(/^場所/), "ユ-43ab");
  await user.click(dialog.getByRole("button", { name: "登録する" }));
  const saved = parseData(localStorage.getItem(key)!).events[0].circles[0];
  expect(saved).toMatchObject({
    name: "確認したサークル名",
    day: "2日目",
    hall: "東",
    locationRaw: "ユ-43ab",
    priority: 3,
    link: "",
  });
  document.body.innerHTML = '<div id="root"></div>';
  vi.resetModules();
  await import("./main");
  expect(await screen.findByText("確認したサークル名")).toBeTruthy();
  expect(screen.getByText("ユ-43ab")).toBeTruthy();
});
