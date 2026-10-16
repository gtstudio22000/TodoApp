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
