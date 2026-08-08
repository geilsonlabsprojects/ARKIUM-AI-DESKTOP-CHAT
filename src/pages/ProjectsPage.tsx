import { useState } from "react";
import {
  Briefcase, Plus, FolderOpen, Archive, Trash2, Edit2, Brain, RefreshCw,
  Folder, FileText, Clock, Tag, Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { clsx } from "clsx";
import type { Project, FileEntry } from "../types";
import { useProjectStore } from "../stores/projectStore";
import { useChatStore } from "../stores/chatStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { useSettingsStore } from "../stores/settingsStore";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, addProject, deleteProject, updateProject, setActiveProject } = useProjectStore();
  const { addConversation, addMessage, setActiveConversationId } = useChatStore();
  const { ai: aiSettings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [creatingZip, setCreatingZip] = useState<string | null>(null);

  const filtered = projects.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleOpenProject() {
    const selected = await open({ directory: true });
    if (!selected || typeof selected !== "string") return;

    const name = selected.split(/[\\/]/).pop() || "Project";
    const now = new Date().toISOString();

    const project: Project = {
      id: crypto.randomUUID(),
      name,
      path: selected,
      description: "",
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastOpened: now,
    };

    addProject(project);
    setActiveProject(project.id);
    toast.success(`Project opened: ${name}`);
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;

    const selected = await open({ directory: true });
    if (!selected || typeof selected !== "string") return;

    const projectPath = `${selected}/${newProjectName.trim()}`;
    try {
      await invoke("create_directory_cmd", { path: projectPath, recursive: true });
    } catch (e) {
      toast.error(`Failed to create project directory: ${e}`);
      return;
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      path: projectPath,
      description: "",
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastOpened: now,
    };

    addProject(project);
    setActiveProject(project.id);
    setNewProjectName("");
    setShowNewForm(false);
    toast.success(`Project created: ${project.name}`);
  }

  async function handleAnalyze(project: Project) {
    setAnalyzingId(project.id);

    try {
      // Get file listing
      const files = await invoke<FileEntry[]>("list_directory_contents", {
        path: project.path,
        showHidden: false,
      });

      const fileList = files
        .slice(0, 50)
        .map((f) => `${f.isDir ? "📁" : "📄"} ${f.name} (${f.isDir ? "dir" : formatBytes(f.size)})`)
        .join("\n");

      const prompt = `Analyze this project and provide a detailed assessment:

Project: ${project.name}
Path: ${project.path}

Files and directories:
${fileList}

Please provide:
1. Project type and technology stack (based on file names)
2. Overall structure assessment
3. Potential improvements
4. Missing common files (README, .gitignore, etc.)
5. Security considerations`;

      // Create chat with analysis
      const convId = crypto.randomUUID();
      const now = new Date().toISOString();

      addConversation({
        id: convId,
        title: `Analyze: ${project.name}`,
        model: aiSettings.defaultModel,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      });

      addMessage({
        id: crypto.randomUUID(),
        conversationId: convId,
        role: "user",
        content: prompt,
        createdAt: now,
      });

      setActiveConversationId(convId);
      navigate(`/chat/${convId}`);
    } catch (e) {
      toast.error(`Failed to analyze project: ${e}`);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleExportZip(project: Project) {
    const outputPath = await save({
      defaultPath: `${project.name}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!outputPath) return;

    setCreatingZip(project.id);
    try {
      const result = await invoke<{ path: string; files_count: number; size: number }>(
        "create_zip_archive",
        { sourcePath: project.path, outputPath, compressionLevel: 6 }
      );
      toast.success(`ZIP created: ${result.files_count} files`);
    } catch (e) {
      toast.error(`Failed to create ZIP: ${e}`);
    } finally {
      setCreatingZip(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-1">
        <h1 className="text-lg font-semibold text-zinc-100">{t("projects.title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowNewForm(!showNewForm)} className="btn-secondary">
            <Plus className="w-4 h-4" />
            {t("projects.new")}
          </button>
          <button onClick={handleOpenProject} className="btn-primary">
            <FolderOpen className="w-4 h-4" />
            {t("projects.open")}
          </button>
        </div>
      </div>

      {/* New Project Form */}
      {showNewForm && (
        <div className="px-6 py-3 border-b border-border-1 bg-surface-2">
          <div className="flex gap-2 max-w-md">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              placeholder={t("projects.name")}
              className="input-field flex-1"
              autoFocus
            />
            <button onClick={handleCreateProject} className="btn-primary">Create</button>
            <button onClick={() => setShowNewForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      {projects.length > 3 && (
        <div className="px-6 py-3 border-b border-border-1">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search")}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 mb-1">{t("projects.no_projects")}</p>
            <p className="text-xs text-zinc-600">{t("projects.no_projects_hint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isAnalyzing={analyzingId === project.id}
                isCreatingZip={creatingZip === project.id}
                onOpen={() => {
                  updateProject(project.id, { lastOpened: new Date().toISOString() });
                  setActiveProject(project.id);
                }}
                onAnalyze={() => handleAnalyze(project)}
                onExportZip={() => handleExportZip(project)}
                onDelete={() => {
                  if (window.confirm(`Delete project "${project.name}"?`)) {
                    deleteProject(project.id);
                    toast.success("Project removed");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project, isAnalyzing, isCreatingZip,
  onOpen, onAnalyze, onExportZip, onDelete,
}: {
  project: Project;
  isAnalyzing: boolean;
  isCreatingZip: boolean;
  onOpen: () => void;
  onAnalyze: () => void;
  onExportZip: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-5 bg-surface-2 border border-border-1 hover:border-border-2 rounded-xl transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border-1 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-zinc-100 truncate">{project.name}</h3>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{project.path}</p>
            {project.description && (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
              {project.lastOpened && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(project.lastOpened), { addSuffix: true })}
                </span>
              )}
              {project.tags.length > 0 && (
                <div className="flex gap-1">
                  {project.tags.map((tag) => (
                    <span key={tag} className="bg-surface-3 px-1.5 py-0.5 rounded text-zinc-500">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-1">
        <button onClick={onAnalyze} disabled={isAnalyzing} className="btn-secondary text-xs flex-1 justify-center">
          <Brain className={clsx("w-3.5 h-3.5", isAnalyzing && "animate-pulse")} />
          {isAnalyzing ? "Analyzing..." : t("projects.analyze")}
        </button>
        <button onClick={onExportZip} disabled={isCreatingZip} className="btn-secondary text-xs flex-1 justify-center">
          <Archive className={clsx("w-3.5 h-3.5", isCreatingZip && "animate-spin")} />
          {t("projects.export")}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
