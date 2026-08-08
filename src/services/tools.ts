import { invoke } from "@tauri-apps/api/core";
import { searchWeb, fetchUrlContent } from "./websearch";
import { useSettingsStore } from "../stores/settingsStore";
import { useAppStore } from "../stores/appStore";
import type { ToolDefinition } from "../types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "web_search",
    description: "Search the internet for current information",
    parameters: {
      query: { type: "string", required: true, description: "Search query" },
      engine: {
        type: "string",
        required: false,
        description: "Search engine: duckduckgo, brave, searxng",
      },
    },
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "web_fetch",
    description: "Fetch and extract text content from a URL",
    parameters: {
      url: { type: "string", required: true, description: "URL to fetch" },
    },
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "read_file",
    description: "Read the content of a file",
    parameters: {
      path: { type: "string", required: true, description: "File path" },
    },
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "write_file",
    description: "Write or create a file",
    parameters: {
      path: { type: "string", required: true, description: "File path" },
      content: { type: "string", required: true, description: "File content" },
      create_dirs: {
        type: "boolean",
        required: false,
        description: "Create parent directories",
      },
    },
    requiresPermission: true,
    riskLevel: "medium",
  },
  {
    name: "list_directory",
    description: "List files and directories",
    parameters: {
      path: { type: "string", required: true, description: "Directory path" },
      show_hidden: {
        type: "boolean",
        required: false,
        description: "Show hidden files",
      },
    },
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "create_directory",
    description: "Create a directory",
    parameters: {
      path: { type: "string", required: true, description: "Directory path" },
      recursive: {
        type: "boolean",
        required: false,
        description: "Create parents",
      },
    },
    requiresPermission: true,
    riskLevel: "low",
  },
  {
    name: "delete_file",
    description: "Delete a file",
    parameters: {
      path: { type: "string", required: true, description: "File path to delete" },
    },
    requiresPermission: true,
    riskLevel: "high",
  },
  {
    name: "create_zip",
    description: "Create a ZIP archive from a file or directory",
    parameters: {
      source_path: { type: "string", required: true, description: "Source path" },
      output_path: { type: "string", required: true, description: "Output ZIP path" },
    },
    requiresPermission: true,
    riskLevel: "low",
  },
  {
    name: "system_info",
    description: "Get system information (OS, CPU, RAM)",
    parameters: {},
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "ollama_models",
    description: "List available Ollama models",
    parameters: {},
    requiresPermission: false,
    riskLevel: "low",
  },
  {
    name: "terminal",
    description: "Execute a shell command (requires user confirmation)",
    parameters: {
      command: { type: "string", required: true, description: "Command to execute" },
      args: { type: "array", required: false, description: "Command arguments" },
      cwd: { type: "string", required: false, description: "Working directory" },
    },
    requiresPermission: true,
    riskLevel: "high",
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  _conversationId?: string
): Promise<unknown> {
  const security = useSettingsStore.getState().security;
  const app = useAppStore.getState();
  const toolDef = TOOL_DEFINITIONS.find((t) => t.name === name);

  if (toolDef?.requiresPermission) {
    if (security.readOnlyMode && isWriteOperation(name)) {
      throw new Error(
        "Read-only mode is enabled. Write operations are not allowed."
      );
    }
    const granted = await requestToolPermission(name, input, toolDef.riskLevel, app);
    if (!granted) {
      throw new Error(`Permission denied for tool: ${name}`);
    }
  }

  switch (name) {
    case "web_search": {
      return searchWeb(input.query as string, input.engine as string | undefined);
    }

    case "web_fetch": {
      return fetchUrlContent(input.url as string, 8000);
    }

    case "read_file": {
      return invoke("read_file_content", { path: input.path });
    }

    case "write_file": {
      await invoke("write_file_content", {
        path: input.path,
        content: input.content,
        createDirs: input.create_dirs ?? true,
      });
      return { success: true, path: input.path };
    }

    case "edit_file": {
      const content = await invoke<string>("read_file_content", { path: input.path });
      const updated = (content as string).replace(
        input.old_str as string,
        input.new_str as string
      );
      await invoke("write_file_content", {
        path: input.path,
        content: updated,
        createDirs: false,
      });
      return { success: true, path: input.path };
    }

    case "list_directory": {
      return invoke("list_directory_contents", {
        path: input.path,
        showHidden: input.show_hidden ?? false,
      });
    }

    case "create_directory": {
      await invoke("create_directory_cmd", {
        path: input.path,
        recursive: input.recursive ?? true,
      });
      return { success: true, path: input.path };
    }

    case "delete_file": {
      await invoke("delete_file_cmd", { path: input.path });
      return { success: true };
    }

    case "create_zip": {
      return invoke("create_zip_archive", {
        sourcePath: input.source_path,
        outputPath: input.output_path,
        compressionLevel: input.compression_level ?? 6,
      });
    }

    case "extract_zip": {
      return invoke("extract_zip_archive", {
        zipPath: input.zip_path,
        outputDir: input.output_dir,
        overwrite: input.overwrite ?? false,
      });
    }

    case "system_info": {
      return invoke("get_hardware_info");
    }

    case "ollama_models": {
      return invoke("list_ollama_models", {
        apiUrl: useSettingsStore.getState().ollama.apiUrl,
      });
    }

    case "terminal": {
      const confirmed = await requestTerminalConfirm(
        input.command as string,
        (input.args as string[]) ?? [],
        input.cwd as string | undefined,
        app
      );
      if (!confirmed) throw new Error("Command execution cancelled by user");
      return invoke("execute_command", {
        command: input.command,
        args: input.args ?? [],
        cwd: input.cwd,
        timeoutSecs: 60,
      });
    }

    case "project_analyzer": {
      return invoke("list_directory_contents", {
        path: input.path,
        showHidden: false,
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function isWriteOperation(toolName: string): boolean {
  return [
    "write_file",
    "edit_file",
    "delete_file",
    "create_directory",
    "terminal",
    "create_zip",
    "extract_zip",
  ].includes(toolName);
}

async function requestToolPermission(
  toolName: string,
  input: Record<string, unknown>,
  riskLevel: string,
  app: ReturnType<typeof useAppStore.getState>
): Promise<boolean> {
  return new Promise((resolve) => {
    const resource = String(input.path ?? input.url ?? input.command ?? toolName);
    app.pushPermission({
      id: crypto.randomUUID(),
      action: toolName,
      resource,
      description: `Tool "${toolName}" wants to access: ${resource}`,
      riskLevel: riskLevel as "low" | "medium" | "high",
      resolve: (granted) => resolve(granted),
    });
  });
}

async function requestTerminalConfirm(
  command: string,
  args: string[],
  cwd: string | undefined,
  app: ReturnType<typeof useAppStore.getState>
): Promise<boolean> {
  return new Promise((resolve) => {
    app.pushTerminalCommand({
      id: crypto.randomUUID(),
      command,
      args,
      cwd,
      description: `Execute: ${command} ${args.join(" ")}`,
      resolve: (confirmed) => resolve(confirmed),
    });
  });
}
