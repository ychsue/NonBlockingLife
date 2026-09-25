import { useEffect, useState } from "react";
import { db, ProjectItem } from "../db/schema";
import { ProjectTreeView } from "./ProjectTreeView";
import _ from "lodash";
import { useAppStore } from "../store/appStore";
import { DownArrowIcon } from "./svgIcons";

export interface ProjectTreeSelectorProps {
  /** 目前選中的 Project IDs (支援多選) */
  iniSelectedIds: string[];

  /** 當選取變更時觸發 (回傳目前勾選的所有 Project IDs) */
  onChange: (selectedIds: string[]) => void;

  /** 是否允許 CRUD (新增/刪除/改名/拖拉)，預設為 true */
  allowEdit?: boolean;

  /** 顯示用的佔位字串 */
  placeholder?: string;

  /** 最大外顯 Tag 數量，超出顯示 +N */
  maxDisplayTags?: number;

  className?: string;
}

export function ProjectTreeSelector(props: ProjectTreeSelectorProps) {
  const {
    iniSelectedIds,
    onChange,
    allowEdit = true,
    placeholder = "請選擇專案",
    maxDisplayTags = 3,
    className,
  } = props;
  const [selectedIds, setSelectedIds] = useState<string[]>(iniSelectedIds);
  const [selectedProjects, setSelectedProjects] = useState<ProjectItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const projects = useAppStore((state) => state.projects);

  // 這個是必要的，這樣當外部的 iniSelectedIds 改變時，內部的 selectedIds 也會同步更新
  useEffect(() => {
    setSelectedIds((prev) => {
      const unchanged = _.isEqual(prev, iniSelectedIds);
      return unchanged ? prev : iniSelectedIds;
    });
  }, [iniSelectedIds]);

  useEffect(() => {
      const filteredProjects = projects.filter((p) => selectedIds.includes(p.id));
      setSelectedProjects(filteredProjects.filter((p): p is ProjectItem => !!p));
  }, [selectedIds, projects]);

  const visibleProjects = selectedProjects.slice(0, maxDisplayTags);
  const extraCount = selectedProjects.length - maxDisplayTags;

  return (
    <div className={`w-full ${className ?? ""}`}>
      {/* 觸發外殼 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsDialogOpen(true)}
        className="group flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 shadow-xs transition-all hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {selectedProjects.length > 0 ? (
          <>
            {visibleProjects.map((project) => (
              <span
                key={project.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-2xs transition-colors hover:bg-gray-100"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: project.color || "#3b82f6" }}
                />
                {project.name}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                +{extraCount}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-400">{placeholder}</span>
        )}

        <div className="ml-auto text-gray-400 group-hover:text-gray-600">
          <DownArrowIcon />
        </div>
      </div>

      {/* 彈窗對話框 */}
      {isDialogOpen && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDialogOpen(false);
          }}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ProjectTreeView
              iniSelectedIds={selectedIds}
              onConfirm={({ items, selectedIds: newSelectedIds }) => {
                setSelectedIds(newSelectedIds);
                setSelectedProjects(
                  items
                    .map((item) =>
                      newSelectedIds.includes(item.id) ? item : null,
                    )
                    .filter((p): p is ProjectItem => !!p),
                );
                onChange(newSelectedIds);
                setIsDialogOpen(false);
              }}
              onCancel={() => setIsDialogOpen(false)}
              allowEdit={allowEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
