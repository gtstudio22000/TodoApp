import { Category, RecurrenceFrequency, Task } from "../types/user";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  AddTaskButton,
  Container,
  RecurrenceSwitchLabel,
  RecurrencePanel,
  StyledInput,
} from "../styles";
import { AddTaskRounded, CancelRounded } from "@mui/icons-material";
import {
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
} from "@mui/material";
import { DESCRIPTION_MAX_LENGTH, TASK_NAME_MAX_LENGTH } from "../constants";
import { ColorPicker, TopBar, CustomEmojiPicker } from "../components";
import { UserContext } from "../contexts/UserContext";
import { useStorageState } from "../hooks/useStorageState";
import { useTheme } from "@emotion/react";
import { generateUUID, getFontColor, isDark, showToast } from "../utils";
import { ColorPalette } from "../theme/themeConfig";
import InputThemeProvider from "../contexts/InputThemeProvider";
import { CategorySelect } from "../components/CategorySelect";
import { useToasterStore } from "react-hot-toast";

const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ["Daily", "Weekly", "Monthly", "Yearly"];

const AddTask = () => {
  const { user, setUser } = useContext(UserContext);
  const theme = useTheme();
  const [name, setName] = useStorageState<string>("", "name", "sessionStorage");
  const [emoji, setEmoji] = useStorageState<string | null>(null, "emoji", "sessionStorage");
  const [color, setColor] = useStorageState<string>(theme.primary, "color", "sessionStorage");
  const [description, setDescription] = useStorageState<string>(
    "",
    "description",
    "sessionStorage",
  );
  const [deadline, setDeadline] = useStorageState<string>("", "deadline", "sessionStorage");
  const [nameError, setNameError] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useStorageState<Category[]>(
    [],
    "categories",
    "sessionStorage",
  );

  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [isDeadlineFocused, setIsDeadlineFocused] = useState<boolean>(false);

  const n = useNavigate();
  const { toasts } = useToasterStore();

  useEffect(() => {
    document.title = "Todo App - Add Task";
  }, []);

  useEffect(() => {
    if (name.length > TASK_NAME_MAX_LENGTH) {
      setNameError(`Name should be less than or equal to ${TASK_NAME_MAX_LENGTH} characters`);
    } else {
      setNameError("");
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      setDescriptionError(
        `Description should be less than or equal to ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    } else {
      setDescriptionError("");
    }
  }, [description.length, name.length]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    setName(newName);
    if (newName.length > TASK_NAME_MAX_LENGTH) {
      setNameError(`Name should be less than or equal to ${TASK_NAME_MAX_LENGTH} characters`);
    } else {
      setNameError("");
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = event.target.value;
    setDescription(newDescription);
    if (newDescription.length > DESCRIPTION_MAX_LENGTH) {
      setDescriptionError(
        `Description should be less than or equal to ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    } else {
      setDescriptionError("");
    }
  };

  const handleDeadlineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDeadline(event.target.value);
  };

  const handleRecurringChange = (checked: boolean) => {
    setIsRecurring(checked);
    if (!checked) {
      setFrequency("");
      setStartDate("");
      setEndDate("");
    }
  };

  const handleAddTask = () => {
    if (name === "") {
      showToast("Task name is required.", {
        type: "error",
        id: "task-name-required",
        preventDuplicate: true,
        visibleToasts: toasts,
      });
      return;
    }

    if (nameError !== "" || descriptionError !== "") {
      return; // Do not add the task if the name or description exceeds the maximum length
    }

    const newTask: Task = {
      id: generateUUID(),
      done: false,
      pinned: false,
      name,
      description: description !== "" ? description : undefined,
      emoji: emoji ? emoji : undefined,
      color,
      date: new Date(),
      deadline: deadline !== "" ? new Date(deadline) : undefined,
      category: selectedCategories ? selectedCategories : [],
      ...(isRecurring && frequency !== ""
        ? { isRecurring: true, frequency, startDate, endDate }
        : {}),
    };

    setUser((prevUser) => ({
      ...prevUser,
      tasks: [...prevUser.tasks, newTask],
    }));

    n("/");

    showToast(
      <div>
        Added task - <b>{newTask.name}</b>
      </div>,
      {
        icon: <AddTaskRounded />,
      },
    );

    const itemsToRemove = ["name", "color", "description", "emoji", "deadline", "categories"];
    itemsToRemove.map((item) => sessionStorage.removeItem(item));
  };

  return (
    <>
      <TopBar title="Add New Task" />
      <Container>
        <CustomEmojiPicker
          emoji={typeof emoji === "string" ? emoji : undefined}
          setEmoji={setEmoji}
          color={color}
          name={name}
          type="task"
        />
        {/* fix for input colors */}
        <InputThemeProvider>
          <StyledInput
            label="Task Name"
            name="name"
            placeholder="Enter task name"
            autoComplete="off"
            value={name}
            onChange={handleNameChange}
            required
            error={nameError !== ""}
            helpercolor={nameError && ColorPalette.red}
            helperText={
              name === ""
                ? undefined
                : !nameError
                  ? `${name.length}/${TASK_NAME_MAX_LENGTH}`
                  : nameError
            }
          />
          <StyledInput
            label="Task Description"
            name="name"
            placeholder="Enter task description"
            autoComplete="off"
            value={description}
            onChange={handleDescriptionChange}
            multiline
            rows={4}
            error={descriptionError !== ""}
            helpercolor={descriptionError && ColorPalette.red}
            helperText={
              description === ""
                ? undefined
                : !descriptionError
                  ? `${description.length}/${DESCRIPTION_MAX_LENGTH}`
                  : descriptionError
            }
          />
          <StyledInput
            label="Task Deadline"
            name="name"
            placeholder="Enter deadline date"
            type="datetime-local"
            value={deadline}
            onChange={handleDeadlineChange}
            onFocus={() => setIsDeadlineFocused(true)}
            onBlur={() => setIsDeadlineFocused(false)}
            hidetext={(!deadline || deadline === "") && !isDeadlineFocused} // fix for label overlapping with input
            sx={{
              colorScheme: isDark(theme.secondary) ? "dark" : "light",
            }}
            slotProps={{
              input: {
                startAdornment:
                  deadline && deadline !== "" ? (
                    <InputAdornment position="start">
                      <Tooltip title="Clear">
                        <IconButton color="error" onClick={() => setDeadline("")}>
                          <CancelRounded />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : undefined,
              },
            }}
          />

          <RecurrenceSwitchLabel
            label="Recurring task"
            control={
              <Switch
                checked={isRecurring}
                onChange={(_, checked) => handleRecurringChange(checked)}
              />
            }
          />
          <Collapse in={isRecurring} timeout={200} unmountOnExit>
            <RecurrencePanel>
              <Stack direction="column" spacing={2}>
                <FormControl>
                  <InputLabel id="recurrence-frequency-label">Frequency</InputLabel>
                  <Select
                    labelId="recurrence-frequency-label"
                    label="Frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  >
                    {RECURRENCE_FREQUENCIES.map((f) => (
                      <MenuItem key={f} value={f}>
                        {f}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <StyledInput
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <StyledInput
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </RecurrencePanel>
          </Collapse>

          {user.settings.enableCategories !== undefined && user.settings.enableCategories && (
            <div style={{ marginBottom: "14px" }}>
              <br />
              <CategorySelect
                selectedCategories={selectedCategories}
                onCategoryChange={(categories) => setSelectedCategories(categories)}
                width="400px"
                fontColor={getFontColor(theme.secondary)}
              />
            </div>
          )}
        </InputThemeProvider>
        <ColorPicker
          color={color}
          width="400px"
          onColorChange={(color) => {
            setColor(color);
          }}
          fontColor={getFontColor(theme.secondary)}
        />
        <AddTaskButton
          onClick={handleAddTask}
          disabled={
            name.length > TASK_NAME_MAX_LENGTH || description.length > DESCRIPTION_MAX_LENGTH
          }
        >
          Create Task
        </AddTaskButton>
      </Container>
    </>
  );
};

export default AddTask;
