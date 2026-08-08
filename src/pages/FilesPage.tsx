import { useEffect, useState } from "react";
import {
  Folder, File, ArrowLeft, Plus, Trash2, Archive, Upload, RefreshCw,
  FileText, Code, Image, Settings, ChevronRight, Search, Download,
  Brain, Loader2, FolderOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { clsx } from "clsx";
import type { FileEntry, FileMetadata } from "../types";
import toast from "react-hot-toast";

export default function FilesPage() {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingFile, setViewingFile] = useState<{ name: string; content: string } | null>(null);
  const [creatingZip, setCreatingZip] = useState(false);

  useEffect(() => {
    loadHomeDir();
  }, []);

  async function loadHomeDir() {
    try {
      const sysInfo = await invoke<{ home_dir: string }>("get_system_info");
      const homePath = sysInfo.home_dir || ".";
      setCurrentPath(homePath);
      loadDirectory(homePath);
    } catch {
      loadDirectory(".");
    }
  }

  async function loadDirectory(path: string) {
    setLoading(true);
    try {
      const result = await invoke<FileEntry[]>("list_directory_contents", {
        path,
        showHidden: false,
      });
      setEntries(result);
      setCurrentPath(path);
    } catch (e) {
      toast.error(`Failed to open directory: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  function navigateTo(path: string) {
    setPathHistory((prev) => [...prev, currentPath]);
    loadDirectory(path);
    setSelected(null);
  }

  function navigateBack() {
    const prev = pathHistory[pathHistory.length - 1];
    if (prev) {
      setPathHistory((h) => h.slice(0, -1));
      loadDirectory(prev);
    }
  }

  async function handleOpenFolder() {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      navigateTo(selected);
    }
  }

  async function handleViewFile(entry: FileEntry) {
    if (entry.isDir) {
      navigateTo(entry.path);
      return;
    }
    try {
      const content = await invoke<string>("read_file_content", { path: entry.path });
      setViewingFile({ name: entry.name, content });
    } catch (e) {
      toast.error(`Cannot read file: ${e}`);
    }
  }

  async function handleDelete(entry: FileEntry) {
    if (!window.confirm(`Delete "${entry.name}"?`)) return;
    try {
      if (entry.isDir) {
        await invoke("delete_directory_cmd", { path: entry.path, recursive: true });
      } else {
        await invoke("delete_file_cmd", { path: entry.path });
      }
      toast.success("Deleted successfully");
      loadDirectory(currentPath);
    } catch (e) {
      toast.error(`Failed to delete: ${e}`);
    }
  }

  async function handleCreateZip(entry: FileEntry) {
    const outputPath = await save({
      defaultPath: `${entry.name}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!outputPath) return;

    setCreatingZip(true);
    try {
      const result = await invoke<{ path: string; files_count: number; size: number }>(
        "create_zip_archive",
        { sourcePath: entry.path, outputPath, compressionLevel: 6 }
      );
      toast.success(`ZIP created: ${result.files_count} files, ${formatBytes(result.size)}`);
    } catch (e) {
      toast.error(`Failed to create ZIP: ${e}`);
    } finally {
      setCreatingZip(false);
    }
  }

  const filteredEntries = entries.filter((e) =>
    !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pathParts = currentPath.split(/[\\/]/).filter(Boolean);

  return (
    <div className="flex h-full">
      {/* File Browser */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-1">
          <button
            onClick={navigateBack}
            disabled={pathHistory.length === 0}
            className="btn-ghost p-1.5 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
            {pathParts.map((part, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                <button
                  onClick={() => {
                    const targetPath = pathParts.slice(0, i + 1).join("/");
                    navigateTo((currentPath.startsWith("/") ? "/" : "") + targetPath);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          <button onClick={handleOpenFolder} className="btn-secondary text-xs">
            <FolderOpen className="w-3.5 h-3.5" />
            Open
          </button>
          <button onClick={() => loadDirectory(currentPath)} className="btn-ghost p-1.5">
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search")}
              className="input-field pl-8 text-xs py-1.5"
            />
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-3 justify-center py-12 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Folder className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="text-sm">{t("files.no_files")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-1/50">
              {filteredEntries.map((entry) => (
                <FileRow
                  key={entry.path}
                  entry={entry}
                  selected={selected === entry.path}
                  onSelect={() => setSelected(entry.path)}
                  onOpen={() => handleViewFile(entry)}
                  onDelete={() => handleDelete(entry)}
                  onCreateZip={() => handleCreateZip(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File Viewer */}
      {viewingFile && (
        <div className="w-96 flex flex-col border-l border-border-1 bg-surface-1">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200 truncate max-w-48">
                {viewingFile.name}
              </span>
            </div>
            <button onClick={() => setViewingFile(null)} className="btn-ghost p-1">
              ✕
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
            {viewingFile.content}
          </pre>
        </div>
      )}
    </div>
  );
}

function FileRow({
  entry, selected, onSelect, onOpen, onDelete, onCreateZip,
}: {
  entry: FileEntry;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onCreateZip: () => void;
}) {
  const icon = entry.isDir ? (
    <Folder className="w-4 h-4 text-yellow-400" />
  ) : (
    <FileIcon name={entry.name} />
  );

  return (
    <div
      className={clsx(
        "group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
        selected ? "bg-surface-3" : "hover:bg-surface-2"
      )}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{entry.name}</p>
        <p className="text-xs text-zinc-600">
          {entry.isDir ? "Directory" : formatBytes(entry.size)}
          {entry.modified && ` • ${new Date(entry.modified).toLocaleDateString()}`}
        </p>
      </div>
      <div className="hidden group-hover:flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="btn-ghost py-1 px-2 text-xs">
          Open
        </button>
        <button onClick={(e) => { e.stopPropagation(); onCreateZip(); }} className="btn-ghost py-1 px-1">
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost py-1 px-1 hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const codeExts = ["js", "ts", "tsx", "jsx", "py", "rs", "java", "c", "cpp", "h", "go", "rb"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp"];

  if (codeExts.includes(ext)) return <Code className="w-4 h-4 text-blue-400" />;
  if (imageExts.includes(ext)) return <Image className="w-4 h-4 text-green-400" />;
  if (ext === "zip" || ext === "tar" || ext === "gz") return <Archive className="w-4 h-4 text-orange-400" />;
  if (ext === "json" || ext === "yaml" || ext === "yml") return <Settings className="w-4 h-4 text-purple-400" />;
  return <FileText className="w-4 h-4 text-zinc-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
