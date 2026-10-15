import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@emotion/react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import AddTask from "./AddTask";

vi.mock("../components", () => ({
  ColorPicker: () => null,
  TopBar: () => null,
  CustomEmojiPicker: () => null,
}));

vi.mock("../components/CategorySelect", () => ({
  CategorySelect: () => null,
}));

const emotionTheme = {
  primary: "#b624ff",
  secondary: "#232e58",
  reduceMotion: "off",
} as unknown as Parameters<typeof ThemeProvider>[0]["theme"];

const renderAddTask = () =>
  render(
    <MemoryRouter>
      <MuiThemeProvider theme={createTheme()}>
        <ThemeProvider theme={emotionTheme}>
          <AddTask />
        </ThemeProvider>
      </MuiThemeProvider>
    </MemoryRouter>,
  );

const getToggle = () => screen.getByRole("checkbox", { name: "Recurring task toggle" });
const queryPanelControl = () => screen.queryByRole("combobox", { name: /frequency/i });

describe("Recurrence toggle on the Add Task page", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("Toggle appears and defaults to OFF on dialog open", async () => {
    renderAddTask();

    expect(getToggle()).toBeTruthy();
    expect((getToggle() as HTMLInputElement).checked).toBe(false);
    await waitFor(() => expect(queryPanelControl()).toBeNull());
    expect(screen.queryByLabelText("Recurrence start date")).toBeNull();
    expect(screen.queryByLabelText("Recurrence end date")).toBeNull();
  });

  it("Toggling ON reveals recurrence options", async () => {
    const user = userEvent.setup();
    renderAddTask();

    await user.click(getToggle());

    const frequency = await screen.findByRole("combobox", { name: /frequency/i });
    expect(frequency).toBeTruthy();
    expect(screen.getByLabelText("Recurrence start date")).toBeTruthy();
    expect(screen.getByLabelText("Recurrence end date")).toBeTruthy();

    await user.click(frequency);
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Daily", "Weekly", "Monthly", "Yearly"]);
  });

  it("Toggling OFF hides and clears recurrence options", async () => {
    const user = userEvent.setup();
    renderAddTask();

    await user.click(getToggle());
    await user.click(await screen.findByRole("combobox", { name: /frequency/i }));
    await user.click(await screen.findByRole("option", { name: "Monthly" }));
    await user.type(screen.getByLabelText("Recurrence start date"), "2025-08-01");
    await user.type(screen.getByLabelText("Recurrence end date"), "2025-12-31");
    expect((screen.getByLabelText("Recurrence start date") as HTMLInputElement).value).toBe(
      "2025-08-01",
    );

    await user.click(getToggle());
    await waitFor(() => expect(queryPanelControl()).toBeNull());

    // Turning it back ON shows empty values: the state was cleared, not just hidden.
    await user.click(getToggle());
    expect(
      ((await screen.findByLabelText("Recurrence start date")) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText("Recurrence end date") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("combobox", { name: /frequency/i }).textContent).not.toContain(
      "Monthly",
    );
  });
});
