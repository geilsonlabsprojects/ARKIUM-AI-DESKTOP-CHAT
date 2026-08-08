use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub hostname: String,
    pub username: String,
    pub home_dir: String,
    pub cpu_count: u32,
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareInfo {
    pub cpu_brand: String,
    pub cpu_count: u32,
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub os_name: String,
    pub os_version: String,
    pub arch: String,
    pub has_gpu: bool,
    pub gpu_info: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaStatus {
    pub installed: bool,
    pub running: bool,
    pub api_available: bool,
    pub api_url: String,
    pub version: Option<String>,
    pub models_count: u32,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let hostname = sys_info::hostname().unwrap_or_else(|_| "unknown".to_string());
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());

    let home_dir = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "~".to_string());

    let cpu_count = sys_info::cpu_num().unwrap_or(1);
    let total_memory_kb = sys_info::mem_info().map(|m| m.total).unwrap_or(0);
    let avail_memory_kb = sys_info::mem_info().map(|m| m.avail).unwrap_or(0);

    let os_version = sys_info::os_release().unwrap_or_else(|_| "unknown".to_string());

    Ok(SystemInfo {
        os,
        os_version,
        arch,
        hostname,
        username,
        home_dir,
        cpu_count,
        total_memory_gb: total_memory_kb as f64 / 1_048_576.0,
        available_memory_gb: avail_memory_kb as f64 / 1_048_576.0,
    })
}

#[tauri::command]
pub async fn get_hardware_info() -> Result<HardwareInfo, String> {
    let cpu_brand = sys_info::cpu_speed()
        .map(|s| format!("CPU @ {}MHz", s))
        .unwrap_or_else(|_| "Unknown CPU".to_string());

    let cpu_count = sys_info::cpu_num().unwrap_or(1);
    let mem_info = sys_info::mem_info().unwrap_or(sys_info::MemInfo {
        total: 0,
        free: 0,
        avail: 0,
        buffers: 0,
        cached: 0,
        swap_total: 0,
        swap_free: 0,
    });

    let total_memory_mb = mem_info.total / 1024;
    let available_memory_mb = mem_info.avail / 1024;

    let os_name = sys_info::os_type().unwrap_or_else(|_| std::env::consts::OS.to_string());
    let os_version = sys_info::os_release().unwrap_or_else(|_| "unknown".to_string());
    let arch = std::env::consts::ARCH.to_string();

    // Basic GPU detection - check for NVIDIA/AMD via env or system
    let has_gpu = check_gpu_available();
    let gpu_info = detect_gpus();

    Ok(HardwareInfo {
        cpu_brand,
        cpu_count,
        total_memory_mb,
        available_memory_mb,
        os_name,
        os_version,
        arch,
        has_gpu,
        gpu_info,
    })
}

fn check_gpu_available() -> bool {
    // Check for CUDA available
    std::env::var("CUDA_VISIBLE_DEVICES").is_ok()
        || std::path::Path::new("/dev/nvidia0").exists()
        || cfg!(target_os = "windows")
}

fn detect_gpus() -> Vec<String> {
    let mut gpus = Vec::new();

    // On Windows, try to detect via environment
    if cfg!(target_os = "windows") {
        if let Ok(gpu) = std::env::var("GPU_NAME") {
            gpus.push(gpu);
        } else {
            gpus.push("Integrated/Discrete GPU (detection limited)".to_string());
        }
    }

    // Check for NVIDIA
    if std::path::Path::new("/proc/driver/nvidia/version").exists() {
        if let Ok(content) = std::fs::read_to_string("/proc/driver/nvidia/version") {
            if let Some(line) = content.lines().next() {
                gpus.push(format!("NVIDIA: {}", line));
            }
        }
    }

    gpus
}

#[tauri::command]
pub async fn check_ollama_status(api_url: Option<String>) -> Result<OllamaStatus, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Check if API is available
    let api_available = match client.get(&format!("{}/api/tags", base_url)).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    };

    if !api_available {
        return Ok(OllamaStatus {
            installed: false,
            running: false,
            api_available: false,
            api_url: base_url,
            version: None,
            models_count: 0,
            error: Some("Ollama API not reachable. Make sure Ollama is installed and running.".to_string()),
        });
    }

    // Get version
    let version = match client.get(&format!("{}/api/version", base_url)).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                resp.json::<serde_json::Value>().await
                    .ok()
                    .and_then(|v| v["version"].as_str().map(|s| s.to_string()))
            } else {
                None
            }
        }
        Err(_) => None,
    };

    // Get models count
    let models_count = match client.get(&format!("{}/api/tags", base_url)).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                resp.json::<serde_json::Value>().await
                    .ok()
                    .and_then(|v| v["models"].as_array().map(|m| m.len() as u32))
                    .unwrap_or(0)
            } else {
                0
            }
        }
        Err(_) => 0,
    };

    Ok(OllamaStatus {
        installed: true,
        running: true,
        api_available: true,
        api_url: base_url,
        version,
        models_count,
        error: None,
    })
}
