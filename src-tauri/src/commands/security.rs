use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PermissionLevel {
    Allow,
    Deny,
    Ask,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Permission {
    pub action: String,
    pub resource: String,
    pub level: PermissionLevel,
    pub granted_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionRequest {
    pub action: String,
    pub resource: String,
    pub description: String,
    pub risk_level: String, // "low", "medium", "high"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionCheck {
    pub allowed: bool,
    pub level: String,
    pub message: String,
}

// In-memory permission store
static PERMISSIONS: Lazy<Mutex<HashMap<String, PermissionLevel>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

static READ_ONLY_MODE: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

#[tauri::command]
pub async fn check_permission(action: String, resource: String) -> Result<PermissionCheck, String> {
    // Check read-only mode
    if let Ok(read_only) = READ_ONLY_MODE.lock() {
        if *read_only && is_write_action(&action) {
            return Ok(PermissionCheck {
                allowed: false,
                level: "deny".to_string(),
                message: "Read-only mode is enabled. Write operations are not allowed.".to_string(),
            });
        }
    }

    let key = format!("{}:{}", action, resource);
    let key_wildcard = format!("{}:*", action);

    if let Ok(perms) = PERMISSIONS.lock() {
        if let Some(level) = perms.get(&key).or_else(|| perms.get(&key_wildcard)) {
            return Ok(match level {
                PermissionLevel::Allow => PermissionCheck {
                    allowed: true,
                    level: "allow".to_string(),
                    message: "Permission granted".to_string(),
                },
                PermissionLevel::Deny => PermissionCheck {
                    allowed: false,
                    level: "deny".to_string(),
                    message: "Permission denied".to_string(),
                },
                PermissionLevel::Ask => PermissionCheck {
                    allowed: false,
                    level: "ask".to_string(),
                    message: "Permission requires user confirmation".to_string(),
                },
            });
        }
    }

    // Default: ask for dangerous operations
    let risk = assess_risk(&action, &resource);
    Ok(match risk.as_str() {
        "high" => PermissionCheck {
            allowed: false,
            level: "ask".to_string(),
            message: format!("High-risk operation '{}' requires confirmation", action),
        },
        "medium" => PermissionCheck {
            allowed: false,
            level: "ask".to_string(),
            message: format!("Operation '{}' requires confirmation", action),
        },
        _ => PermissionCheck {
            allowed: true,
            level: "allow".to_string(),
            message: "Permission granted (default)".to_string(),
        },
    })
}

#[tauri::command]
pub async fn request_permission(
    action: String,
    resource: String,
    granted: bool,
    remember: bool,
) -> Result<bool, String> {
    if remember {
        let key = format!("{}:{}", action, resource);
        if let Ok(mut perms) = PERMISSIONS.lock() {
            perms.insert(
                key,
                if granted {
                    PermissionLevel::Allow
                } else {
                    PermissionLevel::Deny
                },
            );
        }
    }
    Ok(granted)
}

fn is_write_action(action: &str) -> bool {
    matches!(
        action,
        "write_file" | "delete_file" | "delete_directory" | "create_directory"
            | "execute_command" | "extract_zip" | "create_zip" | "copy_file"
    )
}

fn assess_risk(action: &str, resource: &str) -> String {
    match action {
        "delete_file" | "delete_directory" => "high".to_string(),
        "execute_command" => "high".to_string(),
        "write_file" => {
            if resource.contains("/etc/") || resource.contains("system32") {
                "high".to_string()
            } else {
                "medium".to_string()
            }
        }
        "create_directory" | "copy_file" => "low".to_string(),
        "read_file" | "list_directory" => "low".to_string(),
        _ => "medium".to_string(),
    }
}
