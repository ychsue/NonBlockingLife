import { en } from "../../i18n/en";
import { ja } from "../../i18n/ja";
import { zhTW } from "../../i18n/zh-TW";
import type { SupportedLocale } from "../../i18n";
import type { ProductTourConfig } from "./productTourTypes";

const localeMaps = {
  en,
  "zh-TW": zhTW,
  ja,
} as const;

export function getToursList(locale: SupportedLocale = "en"): ProductTourConfig[] {
  const map = localeMaps[locale] ?? en;

  return [
    {
      id: "inbox-new-task",
      version: 1,
      title: map["tour.inboxNewTask.title"],
      description: map["tour.inboxNewTask.description"],
      requiredSheet: "inbox",
      steps: [
        {
          id: "inbox-add",
          title: map["tour.inboxNewTask.step1.title"],
          content: map["tour.inboxNewTask.step1.content"],
          target: "[data-tour='inbox-add-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "inbox-title",
          title: map["tour.inboxNewTask.step2.title"],
          content: map["tour.inboxNewTask.step2.content"],
          target: "[data-tour='inbox-title-input']",
          placement: "bottom",
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "inbox-save",
          title: map["tour.inboxNewTask.step3.title"],
          content: map["tour.inboxNewTask.step3.content"],
          target: "[data-tour='inbox-save-button']",
          placement: "bottom",
          waitForElement: true,
          spotlightPadding: 8,
        },
      ],
    },
  ];
}
