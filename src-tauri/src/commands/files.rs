use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub extension: Option<String>,
    pub is_hidden: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_dir: bool,
    pub is_file: bool,
    pub is_readonly: bool,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub mime_type: String,
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    validate_path(&path)?;
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_file_content(path: String, content: String, create_dirs: bool) -> Result<(), String> {
    validate_path(&path)?;
    if create_dirs {
        if let Some(parent) = Path::new(&path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub async fn list_directory_contents(
    path: String,
    show_hidden: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    validate_path(&path)?;
    let show_hidden = show_hidden.unwrap_or(false);
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut result = Vec::new();

    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        let is_hidden = name.starts_with('.');
        if is_hidden && !show_hidden {
            continue;
        }

        let metadata = entry.metadata().ok();
        let is_dir = entry_path.is_dir();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = metadata.as_ref().and_then(|m| {
            m.modified().ok().and_then(|t| {
                let dt: chrono::DateTime<chrono::Utc> = t.into();
                Some(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            })
        });
        let extension = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        result.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            extension,
            is_hidden,
        });
    }

    result.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(result)
}

#[tauri::command]
pub async fn create_directory_cmd(path: String, recursive: bool) -> Result<(), String> {
    validate_path(&path)?;
    if recursive {
        fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
    } else {
        fs::create_dir(&path).map_err(|e| format!("Failed to create directory: {}", e))
    }
}

#[tauri::command]
pub async fn delete_file_cmd(path: String) -> Result<(), String> {
    validate_path(&path)?;
    if Path::new(&path).is_dir() {
        return Err("Use delete_directory for directories".to_string());
    }
    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
pub async fn delete_directory_cmd(path: String, recursive: bool) -> Result<(), String> {
    validate_path(&path)?;
    if recursive {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_dir(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    }
}

#[tauri::command]
pub async fn copy_file_cmd(source: String, destination: String, overwrite: bool) -> Result<(), String> {
    validate_path(&source)?;
    validate_path(&destination)?;

    if !overwrite && Path::new(&destination).exists() {
        return Err(format!("Destination already exists: {}", destination));
    }

    if let Some(parent) = Path::new(&destination).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
    }

    fs::copy(&source, &destination)
        .map(|_| ())
        .map_err(|e| format!("Failed to copy file: {}", e))
}

#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub async fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    validate_path(&path)?;
    let p = Path::new(&path);

    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to get metadata: {}", e))?;
    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let extension = p.extension().map(|e| e.to_string_lossy().to_string());

    let created = metadata.created().ok().and_then(|t| {
        let dt: chrono::DateTime<chrono::Utc> = t.into();
        Some(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
    });

    let modified = metadata.modified().ok().and_then(|t| {
        let dt: chrono::DateTime<chrono::Utc> = t.into();
        Some(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
    });

    let mime_type = guess_mime_type(&path);

    Ok(FileMetadata {
        path,
        name,
        extension,
        size: metadata.len(),
        is_dir: metadata.is_dir(),
        is_file: metadata.is_file(),
        is_readonly: metadata.permissions().readonly(),
        created,
        modified,
        mime_type,
    })
}

#[tauri::command]
pub async fn search_files(
    root_path: String,
    pattern: String,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    validate_path(&root_path)?;
    let max = max_results.unwrap_or(100);
    let pattern_lower = pattern.to_lowercase();
    let mut results = Vec::new();

    walk_and_search(
        Path::new(&root_path),
        &pattern_lower,
        &mut results,
        max,
        0,
        5,
    );

    Ok(results)
}

fn walk_and_search(
    dir: &Path,
    pattern: &str,
    results: &mut Vec<FileEntry>,
    max: usize,
    depth: usize,
    max_depth: usize,
) {
    if results.len() >= max || depth > max_depth {
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if results.len() >= max {
                break;
            }
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            if name.to_lowercase().contains(pattern) {
                let metadata = entry.metadata().ok();
                let is_dir = entry_path.is_dir();
                let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                let modified = metadata.as_ref().and_then(|m| {
                    m.modified().ok().and_then(|t| {
                        let dt: chrono::DateTime<chrono::Utc> = t.into();
                        Some(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
                    })
                });
                let extension = entry_path.extension().map(|e| e.to_string_lossy().to_string());
                let is_hidden = name.starts_with('.');

                results.push(FileEntry {
                    name,
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir,
                    size,
                    modified,
                    extension,
                    is_hidden,
                });
            }

            if entry_path.is_dir() && depth < max_depth {
                walk_and_search(&entry_path, pattern, results, max, depth + 1, max_depth);
            }
        }
    }
}

fn validate_path(path: &str) -> Result<(), String> {
    // Block dangerous paths
    let dangerous_patterns = [
        "/../", "/./", "\\..\\", "\\.\\",
        "/.ssh", "/.gnupg", "/etc/shadow", "/etc/passwd",
    ];
    for pattern in &dangerous_patterns {
        if path.contains(pattern) {
            return Err(format!("Access denied: dangerous path pattern detected"));
        }
    }
    Ok(())
}

fn guess_mime_type(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "txt" | "text" => "text/plain",
        "md" | "markdown" => "text/markdown",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" => "text/javascript",
        "ts" | "tsx" => "text/typescript",
        "jsx" => "text/jsx",
        "json" => "application/json",
        "yaml" | "yml" => "text/yaml",
        "xml" => "text/xml",
        "csv" => "text/csv",
        "py" => "text/x-python",
        "rs" => "text/x-rust",
        "java" => "text/x-java",
        "c" | "h" => "text/x-c",
        "cpp" | "cc" | "hpp" => "text/x-c++",
        "sh" | "bash" => "text/x-shellscript",
        "bat" | "cmd" => "text/x-batch",
        "ps1" => "text/x-powershell",
        "sql" => "text/x-sql",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        "tar" => "application/x-tar",
        "gz" => "application/gzip",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "mp3" => "audio/mpeg",
        "mp4" => "video/mp4",
        _ => "application/octet-stream",
    }.to_string()
}
