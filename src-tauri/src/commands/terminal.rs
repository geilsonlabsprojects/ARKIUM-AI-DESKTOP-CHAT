use serde::{Deserialize, Serialize};
use std::process::Command;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandResult {
    pub command: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
    pub executed_at: String,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandHistoryEntry {
    pub id: String,
    pub command: String,
    pub cwd: Option<String>,
    pub exit_code: i32,
    pub success: bool,
    pub executed_at: String,
}

// In-memory command history (would be persisted to DB in production)
static COMMAND_HISTORY: once_cell::sync::Lazy<std::sync::Mutex<Vec<CommandHistoryEntry>>> =
    once_cell::sync::Lazy::new(|| std::sync::Mutex::new(Vec::new()));

#[tauri::command]
pub async fn execute_command(
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<CommandResult, String> {
    // Block dangerous commands
    let cmd_lower = command.to_lowercase();
    let dangerous_commands = [
        "rm -rf /", "format", "del /f /s /q c:", "mkfs", "dd if=/dev/zero",
        ":(){ :|:& };:", "chmod -R 777 /", "sudo rm -rf",
    ];

    let full_cmd = format!("{} {}", command, args.join(" "));
    for dangerous in &dangerous_commands {
        if full_cmd.to_lowercase().contains(dangerous) {
            return Err(format!(
                "Command blocked for safety: '{}'. This operation could be dangerous.",
                dangerous
            ));
        }
    }

    let start = std::time::Instant::now();

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c.args(&args);
        c
    } else {
        let mut c = Command::new(&command);
        c.args(&args);
        c
    };

    if let Some(ref dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output()
        .map_err(|e| format!("Failed to execute command '{}': {}", command, e))?;

    let duration_ms = start.elapsed().as_millis() as u64;
    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let success = output.status.success();
    let executed_at = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Record in history
    let entry = CommandHistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        command: full_cmd.clone(),
        cwd,
        exit_code,
        success,
        executed_at: executed_at.clone(),
    };

    if let Ok(mut history) = COMMAND_HISTORY.lock() {
        history.push(entry);
        if history.len() > 500 {
            history.remove(0);
        }
    }

    Ok(CommandResult {
        command: full_cmd,
        stdout,
        stderr,
        exit_code,
        success,
        executed_at,
        duration_ms,
    })
}

#[tauri::command]
pub async fn get_command_history(limit: Option<usize>) -> Result<Vec<CommandHistoryEntry>, String> {
    let limit = limit.unwrap_or(50);
    if let Ok(history) = COMMAND_HISTORY.lock() {
        let entries: Vec<CommandHistoryEntry> = history
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect();
        Ok(entries)
    } else {
        Err("Failed to access command history".to_string())
    }
}
