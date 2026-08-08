// Tool definitions for the AI agent
// These match the frontend tool system

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    pub requires_permission: bool,
    pub risk_level: String,
}

pub fn get_all_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "web_search".to_string(),
            description: "Search the internet for current information".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "engine": {"type": "string", "enum": ["duckduckgo", "brave", "searxng"], "description": "Search engine to use"},
                    "max_results": {"type": "integer", "description": "Maximum number of results", "default": 5}
                },
                "required": ["query"]
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "web_fetch".to_string(),
            description: "Fetch and extract content from a URL".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to fetch"},
                    "max_chars": {"type": "integer", "description": "Maximum characters to return", "default": 5000}
                },
                "required": ["url"]
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "read_file".to_string(),
            description: "Read the content of a file".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"}
                },
                "required": ["path"]
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "write_file".to_string(),
            description: "Write content to a file".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "content": {"type": "string", "description": "Content to write"},
                    "create_dirs": {"type": "boolean", "description": "Create parent directories if they don't exist", "default": true}
                },
                "required": ["path", "content"]
            }),
            requires_permission: true,
            risk_level: "medium".to_string(),
        },
        ToolDefinition {
            name: "list_directory".to_string(),
            description: "List files and directories in a path".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path"},
                    "show_hidden": {"type": "boolean", "description": "Show hidden files", "default": false}
                },
                "required": ["path"]
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "create_directory".to_string(),
            description: "Create a directory".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path"},
                    "recursive": {"type": "boolean", "description": "Create parent directories", "default": true}
                },
                "required": ["path"]
            }),
            requires_permission: true,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "delete_file".to_string(),
            description: "Delete a file".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file to delete"}
                },
                "required": ["path"]
            }),
            requires_permission: true,
            risk_level: "high".to_string(),
        },
        ToolDefinition {
            name: "create_zip".to_string(),
            description: "Create a ZIP archive from files or a directory".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "source_path": {"type": "string", "description": "Source path (file or directory)"},
                    "output_path": {"type": "string", "description": "Output ZIP file path"},
                    "compression_level": {"type": "integer", "description": "Compression level 0-9", "default": 6}
                },
                "required": ["source_path", "output_path"]
            }),
            requires_permission: true,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "system_info".to_string(),
            description: "Get information about the system (OS, CPU, RAM, etc.)".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {}
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
        ToolDefinition {
            name: "terminal".to_string(),
            description: "Execute a shell command (requires user confirmation)".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Command to execute"},
                    "args": {"type": "array", "items": {"type": "string"}, "description": "Command arguments"},
                    "cwd": {"type": "string", "description": "Working directory"}
                },
                "required": ["command"]
            }),
            requires_permission: true,
            risk_level: "high".to_string(),
        },
        ToolDefinition {
            name: "ollama_models".to_string(),
            description: "List available Ollama models".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {}
            }),
            requires_permission: false,
            risk_level: "low".to_string(),
        },
    ]
}
