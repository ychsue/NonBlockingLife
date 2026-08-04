import type { ProductTourConfig } from "./productTourTypes";

export const TOURS_LIST: ProductTourConfig[] = [
  {
    id: "inbox-new-task",
    version: 1,
    title: "Create a task in Inbox",
    requiredSheet: "inbox",
    steps: [
      {
        id: "inbox-add",
        title: "Add a task",
        content: "Tap the add button to create a new task.",
        target: "[data-tour='inbox-add-button']",
        placement: "bottom",
        waitForElement: true,
        spotlightPadding: 8,
      },
      {
        id: "inbox-title",
        title: "Enter a title",
        content: "Type a title for the task and then save it.",
        target: "[data-tour='inbox-title-input']",
        placement: "bottom",
        waitForElement: true,
        spotlightPadding: 8,
      },
      {
        id: "inbox-save",
        title: "Save the task",
        content: "Tap save to finish creating the task.",
        target: "[data-tour='inbox-save-button']",
        placement: "bottom",
        waitForElement: true,
        spotlightPadding: 8,
      },
    ],
  },
];
