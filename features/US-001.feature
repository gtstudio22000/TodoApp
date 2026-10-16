Feature: Recurrence Toggle on Task Creation Form
  As a user I want to flag tasks as recurring at creation time

  Background:
    Given the user is authenticated in the TodoApp
    And the user opens the Add Task page

  Scenario: Toggle appears and defaults to OFF on dialog open
    Then the recurrence toggle is visible on the Add Task page
    And the recurrence toggle is in the OFF position
    And the recurrence options panel is not visible

  Scenario: Toggling ON reveals recurrence options
    When the user clicks the recurrence toggle to turn it ON
    Then the recurrence options panel appears below the toggle
    And the panel contains a frequency selector with options 'Daily', 'Weekly', 'Monthly', 'Yearly'
    And the panel contains a start date picker
    And the panel contains an end date picker

  Scenario: Toggling OFF hides and clears recurrence options
    Given the user has turned the recurrence toggle ON
    And the user has selected frequency 'Monthly' and entered a start date of '2025-08-01' and end date of '2025-12-31'
    When the user clicks the recurrence toggle to turn it OFF
    Then the recurrence options panel is no longer visible
    And the previously selected frequency, start date, and end date are cleared

  Scenario: Happy path — recurring task is saved with correct metadata
    Given the user has entered task name 'Weekly team standup'
    And the user has turned the recurrence toggle ON
    And the user has selected frequency 'Weekly', start date '2025-08-04', and end date '2025-12-29'
    When the user clicks the 'Create Task' button
    Then the user is taken back to the task list
    And the task 'Weekly team standup' is added to the task list
    And the task record is saved with recurrence flag ON, frequency 'Weekly', start date '2025-08-04', and end date '2025-12-29'
    And only one task instance is created

  Scenario: One-time task saved without recurrence metadata
    Given the user has entered task name 'Buy groceries'
    And the recurrence toggle remains OFF
    When the user clicks the 'Create Task' button
    Then the user is taken back to the task list
    And the task 'Buy groceries' is added to the task list
    And the task record has no recurrence flag, no frequency, no start date, and no end date stored
