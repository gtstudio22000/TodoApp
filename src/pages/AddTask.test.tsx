import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@emotion/react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import AddTask from "./AddTask";
import { UserContext } from "../contexts/UserContext";
import { defaultUser } from "../constants/defaultUser";
import type { User } from "../types/user";

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

const getToggle = () => screen.getByRole("checkbox", { name: "Recurring task" });
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
    expect(screen.queryByLabelText("Start date")).toBeNull();
    expect(screen.queryByLabelText("End date")).toBeNull();
  });

  it("Toggling ON reveals recurrence options", async () => {
    const user = userEvent.setup();
    renderAddTask();

    await user.click(getToggle());

    const frequency = await screen.findByRole("combobox", { name: /frequency/i });
    expect(frequency).toBeTruthy();
    expect(screen.getByLabelText("Start date")).toBeTruthy();
    expect(screen.getByLabelText("End date")).toBeTruthy();

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
    await user.type(screen.getByLabelText("Start date"), "2025-08-01");
    await user.type(screen.getByLabelText("End date"), "2025-12-31");
    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe(
      "2025-08-01",
    );

    await user.click(getToggle());
    await waitFor(() => expect(queryPanelControl()).toBeNull());

    // Turning it back ON shows empty values: the state was cleared, not just hidden.
    await user.click(getToggle());
    expect(
      ((await screen.findByLabelText("Start date")) as HTMLInputElement).value,
    ).toBe("");
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("combobox", { name: /frequency/i }).textContent).not.toContain(
      "Monthly",
    );
  });
});

describe("Recurrence metadata is persisted on submit", () => {
  const renderWithUser = () => {
    const setUser = vi.fn();
    render(
      <MemoryRouter>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeProvider theme={emotionTheme}>
            <UserContext.Provider value={{ user: defaultUser, setUser }}>
              <AddTask />
            </UserContext.Provider>
          </ThemeProvider>
        </MuiThemeProvider>
      </MemoryRouter>,
    );
    return setUser;
  };

  const savedUser = (setUser: ReturnType<typeof vi.fn>): User => {
    expect(setUser).toHaveBeenCalledTimes(1);
    const updater = setUser.mock.calls[0][0] as (prev: User) => User;
    return updater({ ...defaultUser, tasks: [] });
  };

  beforeEach(() => {
    sessionStorage.clear();
  });

  it("Happy path — recurring task is saved with correct metadata", async () => {
    const user = userEvent.setup();
    const setUser = renderWithUser();

    await user.type(screen.getByLabelText(/^Task Name/), "Weekly team standup");
    await user.click(getToggle());
    await user.click(await screen.findByRole("combobox", { name: /frequency/i }));
    await user.click(await screen.findByRole("option", { name: "Weekly" }));
    await user.type(screen.getByLabelText("Start date"), "2025-08-04");
    await user.type(screen.getByLabelText("End date"), "2025-12-29");
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    const { tasks } = savedUser(setUser);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      name: "Weekly team standup",
      isRecurring: true,
      frequency: "Weekly",
      startDate: "2025-08-04",
      endDate: "2025-12-29",
    });
  });

  it("One-time task saved without recurrence metadata", async () => {
    const user = userEvent.setup();
    const setUser = renderWithUser();

    await user.type(screen.getByLabelText(/^Task Name/), "Buy groceries");
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    const { tasks } = savedUser(setUser);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe("Buy groceries");
    for (const key of ["isRecurring", "frequency", "startDate", "endDate"]) {
      expect(Object.hasOwn(tasks[0], key)).toBe(false);
    }
  });
});
