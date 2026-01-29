use std::path::Path;
use std::io::{Read, Cursor};
use md5::Md5;
use sha1::Sha1;
use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};
use tokio::fs;
use tokio::io::AsyncReadExt;
use zip::ZipArchive;
use rusty_axml;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub file_name: String,
    pub file_extension: String,
    pub file_size: u64,
    pub file_size_readable: String,
    pub file_path: String,
    pub md5: String,
    pub sha1: String,
    pub sha256: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_file_info(file_path: String) -> Result<FileInfo, String> {
    let path = Path::new(&file_path);
    
    // 检查文件是否存在
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    // 获取文件名
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    
    // 获取文件扩展名
    let file_extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();
    
    // 获取文件大小
    let metadata = fs::metadata(&path).await.map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    let file_size_readable = format_file_size(file_size);
    
    // 使用分块读取计算哈希，避免大文件占用过多内存
    let mut file = fs::File::open(&path).await.map_err(|e| e.to_string())?;
    
    // 初始化哈希器
    let mut hasher_md5 = Md5::new();
    let mut hasher_sha1 = Sha1::new();
    let mut hasher_sha256 = Sha256::new();
    
    // 分块读取文件（每次读取 8MB）
    const CHUNK_SIZE: usize = 8 * 1024 * 1024;
    let mut buffer = vec![0u8; CHUNK_SIZE];
    
    loop {
        let bytes_read = file.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if bytes_read == 0 {
            break;
        }
        
        // 更新所有哈希器
        let chunk = &buffer[..bytes_read];
        hasher_md5.update(chunk);
        hasher_sha1.update(chunk);
        hasher_sha256.update(chunk);
    }
    
    // 完成哈希计算
    let md5 = hex::encode(hasher_md5.finalize());
    let sha1 = hex::encode(hasher_sha1.finalize());
    let sha256 = hex::encode(hasher_sha256.finalize());
    
    Ok(FileInfo {
        file_name,
        file_extension,
        file_size,
        file_size_readable,
        file_path: file_path.clone(),
        md5,
        sha1,
        sha256,
    })
}

fn format_file_size(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    if size >= GB {
        format!("{:.2} GB", size as f64 / GB as f64)
    } else if size >= MB {
        format!("{:.2} MB", size as f64 / MB as f64)
    } else if size >= KB {
        format!("{:.2} KB", size as f64 / KB as f64)
    } else {
        format!("{} Bytes", size)
    }
}

// Android 包信息结构
#[derive(Debug, Serialize, Deserialize)]
pub struct PackageInfo {
    pub package_name: String,
    pub version_name: String,
    pub version_code: String,
    pub min_sdk_version: String,
    pub target_sdk_version: String,
    pub compile_sdk_version: String,
    pub permissions: Vec<String>,
    pub activities: Vec<String>,
    pub services: Vec<String>,
    pub receivers: Vec<String>,
    pub providers: Vec<String>,
    pub file_size: u64,
    pub file_size_readable: String,
    pub icon_base64: Option<String>,  // Base64 编码的图标
}

#[tauri::command]
async fn parse_android_package(file_path: String) -> Result<PackageInfo, String> {
    // 在新线程中执行同步 ZIP 操作，避免阻塞异步运行时
    tokio::task::spawn_blocking(move || {
        parse_android_package_sync(&file_path)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

fn parse_android_package_sync(file_path: &str) -> Result<PackageInfo, String> {
    let path = Path::new(file_path);
    
    // 检查文件是否存在
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    
    // 获取文件大小
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    let file_size_readable = format_file_size(file_size);
    
    // 打开 ZIP 文件
    let file = std::fs::File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("无法解析 ZIP 文件: {}", e))?;
    
    // 查找 AndroidManifest.xml
    let manifest_data = if let Ok(mut manifest_file) = archive.by_name("AndroidManifest.xml") {
        let mut buffer = Vec::new();
        manifest_file.read_to_end(&mut buffer).map_err(|e| format!("读取 AndroidManifest.xml 失败: {}", e))?;
        buffer
    } else {
        return Err("未找到 AndroidManifest.xml 文件".to_string());
    };
    
    // 解析二进制 XML
    let cursor = Cursor::new(manifest_data);
    let axml = rusty_axml::parse_from_reader(cursor)
        .map_err(|e| format!("解析 AndroidManifest.xml 失败: {:?}", e))?;

    // 辅助函数：处理原始格式的属性值
    // 某些属性值可能返回 "(type 0x10) 0x12927c70" 这种格式
    // 需要提取十六进制值并转换为十进制字符串
    fn clean_attr_value(value: &str) -> String {
        // 检查是否是原始格式 "(type 0x...) 0x..."
        if value.contains("(type 0x") && value.contains("0x") {
            // 提取最后一个 0x 后的十六进制值
            if let Some(hex_start) = value.rfind("0x") {
                let hex_str = &value[hex_start + 2..];
                // 转换为十进制
                if let Ok(num) = u32::from_str_radix(hex_str.trim(), 16) {
                    return num.to_string();
                }
            }
        }
        value.to_string()
    }

    // 使用 helper 函数获取组件列表
    let permissions = rusty_axml::get_requested_permissions(&axml);
    let activities = rusty_axml::get_activities_names(&axml);
    let services = rusty_axml::get_services_names(&axml);
    let receivers = rusty_axml::get_receivers_names(&axml);
    let providers = rusty_axml::get_providers_names(&axml);

    // 查找 manifest 节点获取包名和版本信息
    let mut package_name = String::new();
    let mut version_name = String::new();
    let mut version_code = String::new();
    let mut compile_sdk_version = String::new();
    let mut min_sdk_version = String::new();
    let mut target_sdk_version = String::new();

    // 从 AXML 树中提取 manifest 属性
    let manifest_nodes = rusty_axml::find_nodes_by_type(&axml, "manifest");
    if let Some(manifest_node) = manifest_nodes.first() {
        let elem = manifest_node.borrow();

        // 尝试不同的属性名称（有/无命名空间前缀）
        if let Some(pkg) = elem.get_attr("package") {
            package_name = clean_attr_value(pkg);
        }
        if let Some(vn) = elem.get_attr("android:versionName") {
            version_name = clean_attr_value(vn);
        } else if let Some(vn) = elem.get_attr("versionName") {
            version_name = clean_attr_value(vn);
        }
        if let Some(vc) = elem.get_attr("android:versionCode") {
            version_code = clean_attr_value(vc);
        } else if let Some(vc) = elem.get_attr("versionCode") {
            version_code = clean_attr_value(vc);
        }
        // 尝试多种可能的属性名称获取 compileSdkVersion
        if let Some(csv) = elem.get_attr("android:compileSdkVersion") {
            compile_sdk_version = clean_attr_value(csv);
        } else if let Some(csv) = elem.get_attr("compileSdkVersion") {
            compile_sdk_version = clean_attr_value(csv);
        }

        // 如果没有获取到 compileSdkVersion，尝试使用 compileSdkVersionCodename
        if compile_sdk_version.is_empty() {
            if let Some(csc) = elem.get_attr("android:compileSdkVersionCodename") {
                compile_sdk_version = clean_attr_value(csc);
            } else if let Some(csc) = elem.get_attr("compileSdkVersionCodename") {
                compile_sdk_version = clean_attr_value(csc);
            }
        }
    }

    // 查找 uses-sdk 节点获取 SDK 版本
    let uses_sdk_nodes = rusty_axml::find_nodes_by_type(&axml, "uses-sdk");
    if let Some(uses_sdk_node) = uses_sdk_nodes.first() {
        let elem = uses_sdk_node.borrow();

        // 尝试不同的属性名称（有/无命名空间前缀）
        if min_sdk_version.is_empty() {
            if let Some(min) = elem.get_attr("android:minSdkVersion") {
                min_sdk_version = clean_attr_value(min);
            } else if let Some(min) = elem.get_attr("minSdkVersion") {
                min_sdk_version = clean_attr_value(min);
            }
        }

        if target_sdk_version.is_empty() {
            if let Some(target) = elem.get_attr("android:targetSdkVersion") {
                target_sdk_version = clean_attr_value(target);
            } else if let Some(target) = elem.get_attr("targetSdkVersion") {
                target_sdk_version = clean_attr_value(target);
            }
        }
    }

    // 如果没有获取到 SDK 版本，设置默认值
    if min_sdk_version.is_empty() {
        min_sdk_version = "未指定".to_string();
    }
    if target_sdk_version.is_empty() {
        target_sdk_version = "未指定".to_string();
    }
    if compile_sdk_version.is_empty() {
        compile_sdk_version = "未指定".to_string();
    }
    
    // 提取应用图标
    let icon_base64 = extract_app_icon(&mut archive);

    Ok(PackageInfo {
        package_name,
        version_name,
        version_code,
        min_sdk_version,
        target_sdk_version,
        compile_sdk_version,
        permissions,
        activities,
        services,
        receivers,
        providers,
        file_size,
        file_size_readable,
        icon_base64,
    })
}

// 提取应用图标并返回 Base64 编码
fn extract_app_icon(archive: &mut ZipArchive<std::fs::File>) -> Option<String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

    // DPI 优先级：从高到低
    const DPI_DIRS: &[&str] = &[
        "mipmap-xxxhdpi",   // 512dpi
        "mipmap-xxhdpi",    // 480dpi
        "mipmap-xhdpi",     // 320dpi
        "mipmap-hdpi",      // 240dpi
        "mipmap-mdpi",      // 160dpi
        "mipmap-ldpi",      // 120dpi
        "mipmap",           // 默认
    ];

    // 图标文件名列表（按优先级）
    const ICON_NAMES: &[&str] = &[
        "ic_launcher",
        "ic_launcher_round",
        "launcher",
        "icon",
        "app_icon",
        "logo",
    ];

    // 按优先级遍历所有组合 (PNG 优先)
    for dpi_dir in DPI_DIRS {
        for icon_name in ICON_NAMES {
            // 尝试 PNG
            let zip_path = format!("res/{}/{}.png", dpi_dir, icon_name);
            if let Ok(mut icon_file) = archive.by_name(&zip_path) {
                let mut icon_data = Vec::new();
                if icon_file.read_to_end(&mut icon_data).is_ok() {
                    let base64_icon = BASE64.encode(&icon_data);
                    return Some(format!("data:image/png;base64,{}", base64_icon));
                }
            }
            // 尝试 WebP
            let zip_path = format!("res/{}/{}.webp", dpi_dir, icon_name);
            if let Ok(mut icon_file) = archive.by_name(&zip_path) {
                let mut icon_data = Vec::new();
                if icon_file.read_to_end(&mut icon_data).is_ok() {
                    let base64_icon = BASE64.encode(&icon_data);
                    return Some(format!("data:image/webp;base64,{}", base64_icon));
                }
            }
            // 尝试 JPG
            let zip_path = format!("res/{}/{}.jpg", dpi_dir, icon_name);
            if let Ok(mut icon_file) = archive.by_name(&zip_path) {
                let mut icon_data = Vec::new();
                if icon_file.read_to_end(&mut icon_data).is_ok() {
                    let base64_icon = BASE64.encode(&icon_data);
                    return Some(format!("data:image/jpeg;base64,{}", base64_icon));
                }
            }
        }
    }

    // 如果没找到，尝试遍历所有 ZIP 文件查找 mipmap 下的图标
    let zip_names: Vec<String> = archive.file_names().map(|s| s.to_string()).collect();

    // 按优先级排序
    let dpi_priority = |path: &str| -> i32 {
        if path.contains("mipmap-xxxhdpi") { 6 }
        else if path.contains("mipmap-xxhdpi") { 5 }
        else if path.contains("mipmap-xhdpi") { 4 }
        else if path.contains("mipmap-hdpi") { 3 }
        else if path.contains("mipmap-mdpi") { 2 }
        else if path.contains("mipmap-ldpi") { 1 }
        else if path.contains("mipmap") && !path.contains("-") { 0 }
        else { -1 }
    };

    let mut found_icons: Vec<(String, i32)> = Vec::new();

    for zip_path in &zip_names {
        let lower_path = zip_path.to_lowercase();

        // 检查是否是 mipmap 目录下的图标文件
        if lower_path.contains("mipmap") && lower_path.contains("ic_launcher") {
            if lower_path.ends_with(".png") || lower_path.ends_with(".webp") ||
               lower_path.ends_with(".jpg") || lower_path.ends_with(".jpeg") {
                let priority = dpi_priority(zip_path);
                if priority >= 0 {
                    found_icons.push((zip_path.clone(), priority));
                }
            }
        }
    }

    // 按 DPI 优先级排序（高到低）
    found_icons.sort_by(|a, b| b.1.cmp(&a.1));

    // 尝试读取优先级最高的图标
    for (zip_path, _) in found_icons {
        if let Ok(mut icon_file) = archive.by_name(&zip_path) {
            let mut icon_data = Vec::new();
            if icon_file.read_to_end(&mut icon_data).is_ok() {
                // 获取文件扩展名
                let ext = zip_path.split('.').last().unwrap_or("png");
                let mime_type = match ext {
                    "png" => "image/png",
                    "webp" => "image/webp",
                    "jpg" | "jpeg" => "image/jpeg",
                    _ => "image/png",
                };

                let base64_icon = BASE64.encode(&icon_data);
                return Some(format!("data:{};base64,{}", mime_type, base64_icon));
            }
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, get_file_info, parse_android_package])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
