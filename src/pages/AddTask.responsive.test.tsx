import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

const NARROW_VIEWPORT = "320px";

const renderNarrow = () =>
  render(
    <div style={{ width: NARROW_VIEWPORT }} data-testid="viewport">
      <MemoryRouter>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeProvider theme={emotionTheme}>
            <AddTask />
          </ThemeProvider>
        </MuiThemeProvider>
      </MemoryRouter>
    </div>,
  );

const openRecurrencePanel = async () => {
  const user = userEvent.setup();
  renderNarrow();
  await user.click(screen.getByRole("checkbox", { name: "Recurring task" }));
  const frequency = await screen.findByRole("combobox", { name: /frequency/i });
  const panel = frequency.closest<HTMLElement>("div[class*='RecurrencePanel']");
  if (!panel) throw new Error("RecurrencePanel not found");
  const switchLabel = screen
    .getByRole("checkbox", { name: "Recurring task" })
    .closest<HTMLElement>("label");
  if (!switchLabel) throw new Error("RecurrenceSwitchLabel not found");
  return { frequency, panel, switchLabel };
};

describe("Recurrence options panel stacks vertically on narrow viewports", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("Recurrence options panel stacks vertically on narrow viewports", async () => {
    const { frequency, panel } = await openRecurrencePanel();
    const start = screen.getByLabelText("Start date");
    const end = screen.getByLabelText("End date");

    expect(
      frequency.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const styles = getComputedStyle(panel);
    expect(styles.width).toBe("100%");
    expect(styles.maxWidth).toBe("400px");
    expect(styles.boxSizing).toBe("border-box");
  });

  it("Recurrence options panel renders without horizontal overflow at 320px", async () => {
    const { panel, switchLabel } = await openRecurrencePanel();

    for (const element of [panel, switchLabel]) {
      const styles = getComputedStyle(element);
      expect(styles.width).toBe("100%");
      expect(styles.maxWidth).toBe("400px");
      expect(styles.boxSizing).toBe("border-box");
    }
    for (const control of panel.querySelectorAll<HTMLElement>("input, select, [role='combobox']")) {
      const width = getComputedStyle(control).width;
      expect(width.endsWith("px") ? parseFloat(width) : 0).toBeLessThanOrEqual(320);
    }
  });

  it("Recurrence inputs fill the panel instead of the default 400px", async () => {
    const { panel } = await openRecurrencePanel();

    const roots = panel.querySelectorAll<HTMLElement>(".MuiOutlinedInput-root");
    expect(roots.length).toBeGreaterThanOrEqual(3);
    for (const root of roots) {
      expect(getComputedStyle(root).width).toBe("100%");
    }
  });

  it("Recurrence controls are spaced with flex gap so nothing exceeds 320px", async () => {
    const { frequency, panel } = await openRecurrencePanel();

    const stack = frequency.closest<HTMLElement>(".MuiStack-root");
    if (!stack || !panel.contains(stack)) throw new Error("Recurrence stack not found");
    const styles = getComputedStyle(stack);
    expect(styles.display).toBe("flex");
    expect(styles.flexDirection).toBe("column");
    expect(styles.gap).toBe("16px");
    for (const child of stack.children) {
      expect(getComputedStyle(child).marginTop).not.toBe("16px");
    }
  });
});
