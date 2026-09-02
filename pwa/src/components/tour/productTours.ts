import { en } from "../../i18n/en";
import { ja } from "../../i18n/ja";
import { zhTW } from "../../i18n/zh-TW";
import type { SupportedLocale } from "../../i18n";
import { getAppType, type ProductTourConfig } from "./productTourTypes";
import { useResponsiveTable } from "../../hooks/useResponsiveTable";
import { getDeviceType } from "../../utils/shortcutUtils";

const localeMaps = {
  en,
  "zh-TW": zhTW,
  ja,
} as const;

export function getToursList(
  locale: SupportedLocale = "en",
  isMobile: boolean = false,
): ProductTourConfig[] {
  const map = localeMaps[locale] ?? en;

  const ideaTours: ProductTourConfig[] = [
    {
      id: "change-font-size",
      version: 1,
      title: map["tour.changeFontSize.title"],
      description: map["tour.changeFontSize.description"],
      steps: [
        {
          id: "tour-menu",
          title: map["tour.changeFontSize.step1.title"],
          content: map["tour.changeFontSize.step1.content"],
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
          id: "change-font-size-card",
          title: map["tour.changeFontSize.step4.title"],
          content: map["tour.changeFontSize.step4.content"],
          target: "[data-tour='change-font-size-card']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
      ],
    },
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
    {
      id: "set-reminder-offset",
      version: 1,
      title: map["tour.setReminderOffset.title"],
      description: map["tour.setReminderOffset.description"],
      app: "twa",
      steps: [
        {
          id: "open-scheduled",
          title: map["tour.setReminderOffset.step1.title"],
          content: map["tour.setReminderOffset.step1.content"],
          target: "[data-tour='scheduled-tab']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "scheduled-more-button",
          title: map["tour.setReminderOffset.step2.title"],
          content: map["tour.setReminderOffset.step2.content"],
          target: "[data-tour='scheduled-more-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
          device: "mobile",
        },
        {
          id: "check-alarm-sync-targets",
          title: map["tour.setReminderOffset.step3.title"],
          content: map["tour.setReminderOffset.step3.content"],
          target: "[data-tour='toggle-reminder-alarm-button']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "confirm-sync-targets-alarm",
          title: map["tour.setReminderOffset.step4.title"],
          content: map["tour.setReminderOffset.step4.content"],
          target: "[data-tour='confirm-sync-targets-alarm-button']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "add-a-scheduled-task",
          title: map["tour.setReminderOffset.step5.title"],
          content: map["tour.setReminderOffset.step5.content"],
          target: "[data-tour='add-scheduled-task-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "set-reminder-offset-step6",
          title: map["tour.setReminderOffset.step6.title"],
          content: map["tour.setReminderOffset.step6.content"],
          target: "[data-tour='edit-dialog-reminder-offset-input']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "set-reminder-offset-step7",
          title: map["tour.setReminderOffset.step7.title"],
          content: map["tour.setReminderOffset.step7.content"],
          target: "[data-tour='edit-dialog-next-run-input']",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "edit-dialog-save-button",
          title: map["tour.setReminderOffset.step8.title"],
          content: map["tour.setReminderOffset.step8.content"],
          target: "[data-tour='edit-dialog-save-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "show-alarms",
          title: map["tour.setReminderOffset.showAlarms.title"],
          content: map["tour.setReminderOffset.showAlarms.content"],
          target: "[data-tour='view-alarms-button']",
          placement: "bottom",
          hideFooterButton: true,
          waitForElement: true,
          spotlightPadding: 8,
        },
        {
          id: "update-alarms-button",
          title: map["tour.setReminderOffset.updateAlarms.title"],
          content: map["tour.setReminderOffset.updateAlarms.content"],
          target: "[data-tour='update-alarms-button']",
          // portalElement: ".alarm-queue-panel",
          placement: "bottom",
          hideFooterButton: false,
          waitForElement: true,
          spotlightPadding: 8,
        }
      ],
    },
  ];

  // Filter out steps that are not applicable to the current device type
  const currentApp = getAppType();
  const tours = ideaTours
    .filter((tour) => (tour.app ? tour.app === currentApp : true) || import.meta.env.DEV)
    .map((tour) => {
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
