use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use zip::{ZipWriter, ZipArchive};
use zip::write::FileOptions;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ZipEntry {
    pub name: String,
    pub size: u64,
    pub compressed_size: u64,
    pub is_dir: bool,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ZipResult {
    pub path: String,
    pub size: u64,
    pub files_count: u32,
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn create_zip_archive(
    source_path: String,
    output_path: String,
    compression_level: Option<i64>,
) -> Result<ZipResult, String> {
    let source = Path::new(&source_path);
    let output = Path::new(&output_path);

    if !source.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }

    // Create parent directory of output if needed
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    let file = File::create(&output_path)
        .map_err(|e| format!("Failed to create ZIP file: {}", e))?;

    let mut zip = ZipWriter::new(file);
    let level = compression_level.unwrap_or(6);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(level as i64));

    let mut files_count: u32 = 0;

    if source.is_dir() {
        let base_path = source.parent().unwrap_or(source);
        for entry in WalkDir::new(source).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            let relative = path.strip_prefix(base_path)
                .map_err(|e| format!("Path error: {}", e))?;
            let name = relative.to_string_lossy().replace('\\', "/");

            if path.is_dir() {
                if !name.is_empty() {
                    zip.add_directory(&name, options.clone())
                        .map_err(|e| format!("Failed to add directory to ZIP: {}", e))?;
                }
            } else {
                zip.start_file(&name, options.clone())
                    .map_err(|e| format!("Failed to start file in ZIP: {}", e))?;
                let mut f = File::open(path)
                    .map_err(|e| format!("Failed to open file: {}", e))?;
                let mut buffer = Vec::new();
                f.read_to_end(&mut buffer)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                zip.write_all(&buffer)
                    .map_err(|e| format!("Failed to write to ZIP: {}", e))?;
                files_count += 1;
            }
        }
    } else {
        let name = source.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "file".to_string());

        zip.start_file(&name, options)
            .map_err(|e| format!("Failed to start file in ZIP: {}", e))?;
        let mut f = File::open(source)
            .map_err(|e| format!("Failed to open file: {}", e))?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        zip.write_all(&buffer)
            .map_err(|e| format!("Failed to write to ZIP: {}", e))?;
        files_count += 1;
    }

    zip.finish().map_err(|e| format!("Failed to finalize ZIP: {}", e))?;

    let size = fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(ZipResult {
        path: output_path,
        size,
        files_count,
        success: true,
        error: None,
    })
}

#[tauri::command]
pub async fn extract_zip_archive(
    zip_path: String,
    output_dir: String,
    overwrite: bool,
) -> Result<Vec<String>, String> {
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP: {}", e))?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP: {}", e))?;

    let output = Path::new(&output_dir);
    fs::create_dir_all(output)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let mut extracted = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

        let outpath = match entry.enclosed_name() {
            Some(path) => output.join(path),
            None => continue,
        };

        if !overwrite && outpath.exists() {
            continue;
        }

        if entry.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut outfile = File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            io::copy(&mut entry, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }

        extracted.push(outpath.to_string_lossy().to_string());
    }

    Ok(extracted)
}

#[tauri::command]
pub async fn list_zip_contents(zip_path: String) -> Result<Vec<ZipEntry>, String> {
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP: {}", e))?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP: {}", e))?;

    let mut entries = Vec::new();

    for i in 0..archive.len() {
        let entry = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

        entries.push(ZipEntry {
            name: entry.name().to_string(),
            size: entry.size(),
            compressed_size: entry.compressed_size(),
            is_dir: entry.is_dir(),
            modified: None,
        });
    }

    Ok(entries)
}
