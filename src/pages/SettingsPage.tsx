import { useState } from "react";
import {
  Brain, Server, Search, FolderOpen, Shield, Palette, Save, RotateCcw, Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../stores/settingsStore";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import i18n from "../i18n";
import type { AppSettings } from "../types";

const SECTIONS = [
  { id: "ai",        icon: Brain,     labelKey: "settings.ai"        },
  { id: "ollama",    icon: Server,    labelKey: "settings.ollama"    },
  { id: "search",    icon: Search,    labelKey: "settings.search"    },
  { id: "files",     icon: FolderOpen,labelKey: "settings.files"     },
  { id: "security",  icon: Shield,    labelKey: "settings.security"  },
  { id: "interface", icon: Palette,   labelKey: "settings.interface" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("ai");
  const [saved, setSaved] = useState(false);

  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  function handleSave() {
    setSaved(true);
    toast.success(t("settings.saved"));
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex h-full">
      {/* Section nav */}
      <div className="w-48 shrink-0 border-r border-border-1 py-4">
        <h1 className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          {t("settings.title")}
        </h1>
        {SECTIONS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={clsx(
              "flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors",
              activeSection === id
                ? "bg-surface-3 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-2"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {activeSection === "ai"        && <AISettingsSection />}
          {activeSection === "ollama"    && <OllamaSettingsSection />}
          {activeSection === "search"    && <SearchSection />}
          {activeSection === "files"     && <FilesSection />}
          {activeSection === "security"  && <SecuritySection />}
          {activeSection === "interface" && <InterfaceSection />}

          {/* Save / Reset */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-border-1">
            <button
              onClick={() => {
                resetToDefaults();
                toast.success(t("settings.reset"));
              }}
              className="btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              {t("settings.reset")}
            </button>
            <button onClick={handleSave} className="btn-primary ml-auto">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {t("settings.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-zinc-200 mb-5">{children}</h2>;
}

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm text-zinc-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({
  value, onChange, label,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-1">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        onClick={onChange}
        className={clsx(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          value ? "bg-arkium-600" : "bg-surface-4"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            value ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

// ─── Section components — each subscribes only to what it needs ───────────────

function AISettingsSection() {
  const { t } = useTranslation();
  const ai = useSettingsStore((s) => s.ai);
  const updateAI = useSettingsStore((s) => s.updateAI);

  return (
    <div>
      <SectionTitle>{t("settings.ai")}</SectionTitle>

      <Field label={t("settings.model")}>
        <input
          value={ai.defaultModel}
          onChange={(e) => updateAI({ defaultModel: e.target.value })}
          className="input-field"
          placeholder="e.g. llama3.2, mistral, phi3"
        />
      </Field>

      <Field label={`${t("settings.temperature")}: ${ai.temperature.toFixed(1)}`}>
        <input
          type="range" min="0" max="2" step="0.1"
          value={ai.temperature}
          onChange={(e) => updateAI({ temperature: parseFloat(e.target.value) })}
          className="w-full accent-arkium-500"
        />
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>Focused (0.0)</span>
          <span>Balanced (0.7)</span>
          <span>Creative (2.0)</span>
        </div>
      </Field>

      <Field label={`${t("settings.context_length")}: ${ai.numCtx.toLocaleString()}`}>
        <input
          type="range" min="512" max="32768" step="512"
          value={ai.numCtx}
          onChange={(e) => updateAI({ numCtx: parseInt(e.target.value) })}
          className="w-full accent-arkium-500"
        />
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>512</span>
          <span>4096</span>
          <span>32768</span>
        </div>
      </Field>

      <Field label="System Prompt">
        <textarea
          value={ai.systemPrompt}
          onChange={(e) => updateAI({ systemPrompt: e.target.value })}
          rows={4}
          className="input-field resize-y"
        />
      </Field>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{t("settings.streaming")}</span>
        <button
          onClick={() => updateAI({ streaming: !ai.streaming })}
          className={clsx(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            ai.streaming ? "bg-arkium-600" : "bg-surface-4"
          )}
        >
          <span
            className={clsx(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              ai.streaming ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
    </div>
  );
}

function OllamaSettingsSection() {
  const { t } = useTranslation();
  const ollama = useSettingsStore((s) => s.ollama);
  const updateOllama = useSettingsStore((s) => s.updateOllama);

  return (
    <div>
      <SectionTitle>{t("settings.ollama")}</SectionTitle>

      <Field
        label={t("settings.ollama_url")}
        hint="Default: http://localhost:11434"
      >
        <input
          value={ollama.apiUrl}
          onChange={(e) => updateOllama({ apiUrl: e.target.value })}
          className="input-field"
          placeholder="http://localhost:11434"
        />
      </Field>

      <Field label={t("settings.ollama_timeout")}>
        <input
          type="number"
          value={ollama.timeoutSeconds}
          onChange={(e) =>
            updateOllama({ timeoutSeconds: parseInt(e.target.value) })
          }
          className="input-field"
          min="30"
          max="3600"
        />
      </Field>
    </div>
  );
}

function SearchSection() {
  const { t } = useTranslation();
  const search = useSettingsStore((s) => s.search);
  const updateSearch = useSettingsStore((s) => s.updateSearch);

  return (
    <div>
      <SectionTitle>{t("settings.search")}</SectionTitle>

      <Field label={t("settings.search_engine")}>
        <select
          value={search.engine}
          onChange={(e) =>
            updateSearch({
              engine: e.target.value as AppSettings["search"]["engine"],
            })
          }
          className="input-field"
        >
          <option value="duckduckgo">DuckDuckGo</option>
          <option value="brave">Brave Search</option>
          <option value="searxng">SearXNG</option>
        </select>
      </Field>

      <Field label={`${t("settings.max_results")}: ${search.maxResults}`}>
        <input
          type="range" min="3" max="20" step="1"
          value={search.maxResults}
          onChange={(e) => updateSearch({ maxResults: parseInt(e.target.value) })}
          className="w-full accent-arkium-500"
        />
      </Field>

      <Field label={t("settings.search_language")}>
        <select
          value={search.language}
          onChange={(e) => updateSearch({ language: e.target.value })}
          className="input-field"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </Field>
    </div>
  );
}

function FilesSection() {
  const { t } = useTranslation();
  const files = useSettingsStore((s) => s.files);
  const updateFiles = useSettingsStore((s) => s.updateFiles);

  return (
    <div>
      <SectionTitle>{t("settings.files")}</SectionTitle>

      <Field label={t("settings.working_dir")}>
        <input
          value={files.workingDirectory}
          onChange={(e) => updateFiles({ workingDirectory: e.target.value })}
          className="input-field"
          placeholder="Leave empty to use home directory"
        />
      </Field>

      <Field label={`Max file size: ${files.maxFileSizeMB} MB`}>
        <input
          type="range" min="1" max="100" step="1"
          value={files.maxFileSizeMB}
          onChange={(e) =>
            updateFiles({ maxFileSizeMB: parseInt(e.target.value) })
          }
          className="w-full accent-arkium-500"
        />
      </Field>
    </div>
  );
}

function SecuritySection() {
  const { t } = useTranslation();
  const security = useSettingsStore((s) => s.security);
  const updateSecurity = useSettingsStore((s) => s.updateSecurity);

  return (
    <div>
      <SectionTitle>{t("settings.security")}</SectionTitle>

      <Toggle
        value={security.confirmCommands}
        onChange={() =>
          updateSecurity({ confirmCommands: !security.confirmCommands })
        }
        label={t("settings.confirm_commands")}
      />
      <Toggle
        value={security.confirmDeletions}
        onChange={() =>
          updateSecurity({ confirmDeletions: !security.confirmDeletions })
        }
        label={t("settings.confirm_deletions")}
      />
      <Toggle
        value={security.readOnlyMode}
        onChange={() =>
          updateSecurity({ readOnlyMode: !security.readOnlyMode })
        }
        label={t("settings.read_only")}
      />

      {security.readOnlyMode && (
        <div className="mt-3 p-3 bg-yellow-950/30 border border-yellow-800/40 rounded-lg">
          <p className="text-xs text-yellow-400">
            ⚠️ Read-only mode active — AI cannot modify, create, or delete files.
          </p>
        </div>
      )}
    </div>
  );
}

function InterfaceSection() {
  const { t } = useTranslation();
  const iface = useSettingsStore((s) => s.interface);
  const updateInterface = useSettingsStore((s) => s.updateInterface);

  return (
    <div>
      <SectionTitle>{t("settings.interface")}</SectionTitle>

      <Field label={t("settings.theme")}>
        <div className="flex gap-2">
          {(["dark", "light", "system"] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateInterface({ theme })}
              className={clsx(
                "flex-1 py-2 text-sm rounded-lg border transition-colors capitalize",
                iface.theme === theme
                  ? "border-arkium-500 bg-arkium-900/30 text-arkium-300"
                  : "border-border-1 bg-surface-2 text-zinc-400 hover:border-border-2"
              )}
            >
              {t(`settings.theme_${theme}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("settings.language")}>
        <select
          value={iface.language}
          onChange={(e) => {
            updateInterface({ language: e.target.value });
            i18n.changeLanguage(e.target.value);
          }}
          className="input-field"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
        </select>
      </Field>

      <Field label="Font Size">
        <select
          value={iface.fontSize}
          onChange={(e) =>
            updateInterface({
              fontSize: e.target.value as AppSettings["interface"]["fontSize"],
            })
          }
          className="input-field"
        >
          <option value="small">Small</option>
          <option value="medium">Medium (default)</option>
          <option value="large">Large</option>
        </select>
      </Field>
    </div>
  );
}
