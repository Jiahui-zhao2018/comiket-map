// @vitest-environment jsdom
import React, { useState } from "react";
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayNameAssist } from "./DisplayNameAssist";
it("曖昧なホールと存在しない日目を設定せず、原文と不足項目を表示する", async () => {
  const user = userEvent.setup();
  function Fixture() {
    const [values, setValues] = useState({
      name: "",
      day: "",
      hall: "",
      location: "",
    });
    return (
      <>
        <DisplayNameAssist
          days={["1日目"]}
          halls={["東1", "東2"]}
          values={values}
          onChange={setValues}
        />
        <output data-testid="values">{JSON.stringify(values)}</output>
      </>
    );
  }
  render(<Fixture />);
  await user.type(screen.getByLabelText("Xの表示名"), "作者 2日目東ユ 42ab");
  await user.click(screen.getByRole("button", { name: "読み取る" }));
  expect(screen.getByText("作者 2日目東ユ 42ab")).toBeTruthy();
  expect(screen.getByText(/東1、東2/)).toBeTruthy();
  expect(screen.getByText(/開催回の候補に一意に一致しません/)).toBeTruthy();
  await user.click(
    screen.getByRole("button", { name: "候補をフォームに反映" }),
  );
  expect(JSON.parse(screen.getByTestId("values").textContent!)).toEqual({
    name: "",
    day: "",
    hall: "",
    location: "ユ-42ab",
  });
});
