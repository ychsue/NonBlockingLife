import { en } from "../../i18n/en";
import { ja } from "../../i18n/ja";
import { zhTW } from "../../i18n/zh-TW";
import type { SupportedLocale } from "../../i18n";
import type { ProductTourConfig } from "./productTourTypes";
import { useResponsiveTable } from "../../hooks/useResponsiveTable";

const localeMaps = {
  en,
  "zh-TW": zhTW,
  ja,
} as const;

export function getToursList(locale: SupportedLocale = "en", isMobile: boolean = false): ProductTourConfig[] {
  const map = localeMaps[locale] ?? en;

  const ideaTours: ProductTourConfig[] = [
    {
      id: "tour-replay",
      version: 1,
      title: map["tour.tourReplay.title"],
      description: map["tour.tourReplay.description"],
      steps: [
        {
          id: "tour-menu",
          title: map["tour.tourReplay.step1.title"],
          content: map["tour.tourReplay.step1.content"],
          target: "[data-tour='menu-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
          device: "mobile",
        },
        {
          id: "tour-more",
          title: map["tour.tourReplay.step2.title"],
          content: map["tour.tourReplay.step2.content"],
          target: "[data-tour='more-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "tour-settings",
          title: map["tour.tourReplay.step3.title"],
          content: map["tour.tourReplay.step3.content"],
          target: "[data-tour='more-settings-tab']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "tour-card",
          title: map["tour.tourReplay.step4.title"],
          content: map["tour.tourReplay.step4.content"],
          target: "[data-tour='more-settings-tours-card']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
      ],
    },
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
          target: "[data-tour='edit-dialog-title-input']",
          placement: "bottom",
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "inbox-save",
          title: map["tour.inboxNewTask.step3.title"],
          content: map["tour.inboxNewTask.step3.content"],
          target: "[data-tour='edit-dialog-save-button']",
          placement: "bottom",
          waitForElement: true,
          spotlightPadding: 8,
        },
      ],
    },
    {
      id: "android-timer-setup",
      version: 1,
      title: map["tour.androidTimerSetup.title"],
      description: map["tour.androidTimerSetup.description"],
      steps: [
        {
          id: "android-menu",
          title: map["tour.androidTimerSetup.step1.title"],
          content: map["tour.androidTimerSetup.step1.content"],
          target: "[data-tour='menu-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
          device: "mobile",
        },
        {
          id: "android-more",
          title: map["tour.androidTimerSetup.step2.title"],
          content: map["tour.androidTimerSetup.step2.content"],
          target: "[data-tour='more-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "android-settings",
          title: map["tour.androidTimerSetup.step3.title"],
          content: map["tour.androidTimerSetup.step3.content"],
          target: "[data-tour='more-settings-tab']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "android-set-timer",
          title: map["tour.androidTimerSetup.step4.title"],
          content: map["tour.androidTimerSetup.step4.content"],
          target: "[data-tour='android-timer-set-timer-option']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "android-selection-cache",
          title: map["tour.androidTimerSetup.step5.title"],
          content: map["tour.androidTimerSetup.step5.content"],
          target: "[data-tour='selection-cache-tab']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "android-complete",
          title: map["tour.androidTimerSetup.step6.title"],
          content: map["tour.androidTimerSetup.step6.content"],
          target: "[data-tour='selection-cache-intro']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
      ],
    },
  ];

  // Filter out steps that are not applicable to the current device type
  const tours = ideaTours.map((tour) => {
    tour.steps = tour.steps.filter((step) => {
      if (step.device === "mobile" && !isMobile) {
        return false;
      }
      return true;
    });
    return tour;
  });
  return tours;
}
