import { useEffect, useMemo, useState } from "react";
import type { MacroItem } from "../../db/schema";
import { parseMacroYaml } from "../../macro/parser";
import { useTWithMaps } from "../../i18n";

interface MacroEditorProps {
  isOpen: boolean;
  macro: MacroItem | null;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    description: string;
    commands: string;
  }) => Promise<void>;
}

export function MacroEditor({
  isOpen,
  macro,
  onClose,
  onSave,
}: MacroEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [commands, setCommands] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const tHere = useTWithMaps({
    "zh-TW": {
      "Edit Macro": "編輯巨集",
      "Close": "關閉",
      "Name": "名稱",
      "Description": "描述",
      "Commands (YAML)": "指令 (YAML)",
      "Macro name is required.": "巨集名稱為必填項。",
      "Commands YAML is required.": "指令 YAML 為必填項。",
      "YAML validation:": "YAML 驗證：",
      "YAML validation: OK": "YAML 驗證：通過",
      "Saving...": "保存中...",
      "Save": "保存",
      "Cancel": "取消",
      "Macro name": "巨集名稱",
      "What this macro does": "此巨集的功能",
    },
    "en": {
      "Edit Macro": "Edit Macro",
      "Close": "Close",
      "Name": "Name",
      "Description": "Description",
      "Commands (YAML)": "Commands (YAML)",
      "Macro name is required.": "Macro name is required.",
      "Commands YAML is required.": "Commands YAML is required.",
      "YAML validation:": "YAML validation:",
      "YAML validation: OK": "YAML validation: OK",
      "Saving...": "Saving...",
      "Save": "Save",
      "Cancel": "Cancel",
      "Macro name": "Macro name",
      "What this macro does": "What this macro does",
    },
    ja: {
      "Edit Macro": "マクロを編集",
      "Close": "閉じる",
      "Name": "名前",
      "Description": "説明",
      "Commands (YAML)": "コマンド (YAML)",
      "Macro name is required.": "マクロ名は必須です。",
      "Commands YAML is required.": "コマンド YAML は必須です。",
      "YAML validation:": "YAML 検証：",
      "YAML validation: OK": "YAML 検証：OK",
      "Saving...": "保存中...",
      "Save": "保存",
      "Cancel": "キャンセル",
      "Macro name": "マクロ名",
      "What this macro does": "このマクロの機能",
    }
  });

  useEffect(() => {
    if (!isOpen || !macro) return;
    setName(macro.name ?? "");
    setDescription(macro.description ?? "");
    setCommands(macro.commands ?? "");
    setError("");
  }, [isOpen, macro?.taskId]);

  const validationError = useMemo(() => {
    if (!commands.trim()) {
      return tHere("Commands YAML is required.");
    }

    try {
      parseMacroYaml(commands);
      return "";
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }, [commands]);

  if (!isOpen || !macro) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(tHere("Macro name is required."));
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        description: description.trim(),
        commands,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{tHere("Edit Macro")}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            {tHere("Close")}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {tHere("Name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder={tHere("Macro name")}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {tHere("Description")}
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder={tHere("What this macro does")}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {tHere("Commands (YAML)")}
            </label>
            <textarea
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              rows={12}
              className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="- command: inputDialog"
            />
            {validationError ? (
              <p className="mt-2 text-sm text-red-600">
                {tHere("YAML validation:")} {validationError}
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-600">
                {tHere("YAML validation: OK")}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            disabled={isSaving}
          >
            {tHere("Cancel")}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? tHere("Saving...") : tHere("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
