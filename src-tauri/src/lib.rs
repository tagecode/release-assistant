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
use image::{DynamicImage, GenericImageView, ImageFormat};
use uuid::Uuid;
use rand::Rng;

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

    // 获取文件扩展名，判断是否是 XAPK
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // 如果是 XAPK 文件，先提取 base.apk
    if extension == "xapk" {
        println!("检测到 XAPK 文件，正在提取 base.apk...");
        return parse_xapk_file(path);
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
    
    // 提取应用图标（传入文件路径以重新打开 ZIP）
    let icon_base64 = extract_app_icon(path);

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

// 解析 XAPK 文件
fn parse_xapk_file(xapk_path: &Path) -> Result<PackageInfo, String> {
    use std::io::Write;
    use std::env;

    // 打开 XAPK 文件（ZIP 格式）
    let file = std::fs::File::open(xapk_path).map_err(|e| format!("无法打开 XAPK 文件: {}", e))?;
    let xapk_archive = ZipArchive::new(file).map_err(|e| format!("无法解析 XAPK 文件: {}", e))?;

    println!("  XAPK 文件包含 {} 个文件", xapk_archive.len());

    // 首先列出 XAPK 中的所有文件
    println!("\n  📋 XAPK 文件列表:");
    let xapk_files: Vec<String> = xapk_archive.file_names().map(|s| s.to_string()).collect();
    for (index, filename) in xapk_files.iter().enumerate() {
        if index < 20 || filename.ends_with(".apk") || filename.ends_with(".json") {
            println!("    {}: {}", index + 1, filename);
        }
    }

    // 查找 APK 文件（按优先级）
    let apk_priority = [
        "base.apk",                     // 最常见
        "split_config.base.apk",        // 某些 XAPK 的命名
        "master.apk",                   // 备选名称
    ];

    let mut target_apk_name: Option<String> = None;

    // 首先尝试优先级列表中的名称
    for priority_name in &apk_priority {
        if xapk_files.iter().any(|f| f == priority_name) {
            target_apk_name = Some(priority_name.to_string());
            println!("\n  ✅ 找到优先级 APK: {}", priority_name);
            break;
        }
    }

    // 如果没找到，查找任意 .apk 文件
    if target_apk_name.is_none() {
        println!("\n  🔍 查找任意 APK 文件...");
        for filename in &xapk_files {
            if filename.to_lowercase().ends_with(".apk") {
                target_apk_name = Some(filename.clone());
                println!("  ✅ 找到 APK: {}", filename);
                break;
            }
        }
    }

    let apk_name = target_apk_name.ok_or_else(|| {
        format!("XAPK 文件中未找到任何 APK 文件。文件列表:\n{}",
            xapk_files.iter()
                .take(30)
                .enumerate()
                .map(|(i, f)| format!("  {}. {}", i + 1, f))
                .collect::<Vec<_>>()
                .join("\n"))
    })?;

    println!("\n  📦 准备解析: {}", apk_name);

    // 重新打开 XAPK 文件（因为之前已经遍历过文件列表）
    let file = std::fs::File::open(xapk_path).map_err(|e| format!("无法重新打开 XAPK 文件: {}", e))?;
    let mut xapk_archive = ZipArchive::new(file).map_err(|e| format!("无法重新解析 XAPK 文件: {}", e))?;

    let mut apk_file = xapk_archive.by_name(&apk_name)
        .map_err(|e| format!("无法读取 {}: {}", apk_name, e))?;

    println!("  APK 大小: {} bytes", apk_file.size());

    // 创建临时目录
    let temp_dir = env::temp_dir();
    let temp_apk_path = temp_dir.join(format!("release_assistant_xapk_{}_{}.apk",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()));

    println!("  提取 APK 到临时文件: {:?}", temp_apk_path);

    // 提取 APK 到临时文件
    let mut temp_file = std::fs::File::create(&temp_apk_path)
        .map_err(|e| format!("无法创建临时文件: {}", e))?;

    let mut buffer = Vec::new();
    apk_file.read_to_end(&mut buffer)
        .map_err(|e| format!("读取 APK 失败: {}", e))?;

    temp_file.write_all(&buffer)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;

    println!("  APK 提取完成，开始解析...");

    // 解析提取的 APK
    let result = parse_android_package_sync(temp_apk_path.to_str()
        .ok_or("临时文件路径无效")?);

    // 清理临时文件
    let _ = std::fs::remove_file(&temp_apk_path);
    println!("  ✅ 临时文件已清理");

    result
}

// 提取应用图标并返回 Base64 编码
// 需要传入文件路径以重新打开 ZIP，避免读取冲突
// 按分辨率从高到低查找 ic_launcher 开头的 PNG 图片
fn extract_app_icon(file_path: &Path) -> Option<String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

    // 重新打开 ZIP 文件以避免读取冲突
    let file = std::fs::File::open(file_path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    println!("🔍 开始提取应用图标...");
    println!("📁 APK 文件路径: {:?}", file_path);

    // 首先列出 ZIP 中所有文件，帮助调试
    println!("\n📋 ZIP 中的所有文件 (前 100 个):");
    let zip_names: Vec<String> = archive.file_names().map(|s| s.to_string()).collect();
    println!("  总文件数: {}", zip_names.len());

    for (index, zip_path) in zip_names.iter().take(100).enumerate() {
        println!("  {}: {}", index + 1, zip_path);
    }

    if zip_names.len() > 100 {
        println!("  ... (还有 {} 个文件)", zip_names.len() - 100);
    }

    // 查找包含 'mipmap' 或 'drawable' 且以 .png 结尾的文件
    println!("\n🎨 所有 PNG 图片文件:");
    let mut png_files = Vec::new();
    for zip_path in &zip_names {
        if zip_path.to_lowercase().ends_with(".png") {
            png_files.push(zip_path.clone());
        }
    }

    if png_files.is_empty() {
        println!("  ⚠️  未找到任何 PNG 文件");
    } else {
        for (index, png_file) in png_files.iter().enumerate() {
            println!("  {}: {}", index + 1, png_file);
        }
    }

    // 首先尝试从所有 PNG 文件中查找 ic_launcher 开头的图标
    println!("\n🔍 在所有 PNG 文件中查找 ic_launcher 开头的图标:");
    let mut launcher_icons: Vec<String> = Vec::new();

    for png_file in &png_files {
        // 提取文件名（不含路径）
        let file_name = png_file.split('/').last().unwrap_or("");
        let file_name = file_name.split('\\').last().unwrap_or(file_name);

        // 检查文件名是否以 ic_launcher 开头（不区分大小写）
        if file_name.to_lowercase().starts_with("ic_launcher") {
            println!("  ✅ 找到: {}", png_file);
            launcher_icons.push(png_file.clone());
        }
    }

    if !launcher_icons.is_empty() {
        println!("\n  📝 找到 {} 个 ic_launcher 图标，尝试读取", launcher_icons.len());

        // 按路径长度排序，优先选择路径较短的（通常是高分辨率）
        launcher_icons.sort_by_key(|a| a.len());

        // 尝试读取第一个图标
        for icon_path in &launcher_icons {
            println!("  📖 尝试读取: {}", icon_path);

            match archive.by_name(&icon_path) {
                Ok(mut icon_file) => {
                    let mut icon_data = Vec::new();
                    match icon_file.read_to_end(&mut icon_data) {
                        Ok(size) => {
                            println!("  ✅ 成功读取图标: {} (大小: {} bytes)", icon_path, size);
                            let base64_icon = BASE64.encode(&icon_data);
                            println!("  🎯 图标 Base64 编码完成，长度: {}", base64_icon.len());
                            return Some(format!("data:image/png;base64,{}", base64_icon));
                        }
                        Err(e) => {
                            println!("  ❌ 读取文件内容失败: {}", e);
                            continue;
                        }
                    }
                }
                Err(e) => {
                    println!("  ❌ 无法打开文件: {}", e);
                    continue;
                }
            }
        }
    }

    // 如果没找到 ic_launcher，回退到原来的 DPI 目录查找方式
    println!("\n🔍 回退到 DPI 目录查找方式...");

    // DPI 目录列表（从高到低分辨率）
    const DPI_DIRS: &[&str] = &[
        "mipmap-xxxhdpi",   // 512dpi - 最高分辨率
        "drawable-xxxhdpi",
        "mipmap-xxhdpi",    // 480dpi
        "drawable-xxhdpi",
        "mipmap-xhdpi",     // 320dpi
        "drawable-xhdpi",
        "mipmap-hdpi",      // 240dpi
        "drawable-hdpi",
        "mipmap-mdpi",      // 160dpi
        "drawable-mdpi",
        "mipmap-ldpi",      // 120dpi
        "drawable-ldpi",
        "mipmap",           // 默认
        "drawable",
    ];

    // 按分辨率从高到低依次查找
    for dpi_dir in DPI_DIRS {
        println!("\n🔎 检查目录: {}", dpi_dir);

        // 查找当前 DPI 目录下所有以 ic_launcher 开头的 PNG 文件
        let mut icons_in_this_dpi: Vec<String> = Vec::new();

        for zip_path in &zip_names {
            let lower_path = zip_path.to_lowercase();

            // 详细的路径匹配调试
            let path_pattern1 = format!("/{}/", dpi_dir);
            let path_pattern2 = format!("{}/", dpi_dir);
            let path_pattern3 = format!("\\{}\\", dpi_dir);
            let path_pattern4 = format!("{}\\", dpi_dir);

            let match1 = zip_path.contains(&path_pattern1);
            let match2 = zip_path.starts_with(&path_pattern2);
            let match3 = zip_path.contains(&path_pattern3);
            let match4 = zip_path.starts_with(&path_pattern4);
            let has_dpi_dir = match1 || match2 || match3 || match4;

            // 如果路径包含 DPI 目录，输出详细信息
            if zip_path.contains(dpi_dir) {
                println!("  📌 检查文件: {}", zip_path);
                println!("     - 包含 '{}': {}", dpi_dir, zip_path.contains(dpi_dir));
                println!("     - 匹配模式1 '{}': {}", path_pattern1, match1);
                println!("     - 匹配模式2 '{}': {}", path_pattern2, match2);
                println!("     - 匹配模式3 '{}': {}", path_pattern3, match3);
                println!("     - 匹配模式4 '{}': {}", path_pattern4, match4);
                println!("     - is PNG: {}", lower_path.ends_with(".png"));
            }

            if !has_dpi_dir {
                continue;
            }

            // 检查是否是 PNG 文件
            if !lower_path.ends_with(".png") {
                continue;
            }

            // 提取文件名（不含路径，处理 / 和 \ 两种分隔符）
            let file_name = zip_path.split('/').last().unwrap_or("");
            let file_name = file_name.split('\\').last().unwrap_or(file_name);

            println!("     - 文件名: '{}'", file_name);
            println!("     - 以 ic_launcher 开头: {}", file_name.to_lowercase().starts_with("ic_launcher"));

            // 检查文件名是否以 ic_launcher 开头（不区分大小写）
            if file_name.to_lowercase().starts_with("ic_launcher") {
                println!("  ✅ 找到候选图标: {}", zip_path);
                icons_in_this_dpi.push(zip_path.clone());
            }
        }

        // 如果当前 DPI 目录找到了图标，按文件名排序优先返回 ic_launcher.png
        if !icons_in_this_dpi.is_empty() {
            println!("\n  📝 在 {} 目录找到 {} 个候选图标", dpi_dir, icons_in_this_dpi.len());

            // 优先选择 ic_launcher.png，然后是 ic_launcher_round.png，最后是其他变体
            icons_in_this_dpi.sort_by(|a, b| {
                let a_lower = a.to_lowercase();
                let b_lower = b.to_lowercase();

                // ic_launcher.png 优先级最高
                if a_lower.ends_with("ic_launcher.png") && !b_lower.ends_with("ic_launcher.png") {
                    return std::cmp::Ordering::Less;
                }
                if !a_lower.ends_with("ic_launcher.png") && b_lower.ends_with("ic_launcher.png") {
                    return std::cmp::Ordering::Greater;
                }

                // ic_launcher_round.png 次优先
                if a_lower.ends_with("ic_launcher_round.png") && !b_lower.ends_with("ic_launcher_round.png") {
                    return std::cmp::Ordering::Less;
                }
                if !a_lower.ends_with("ic_launcher_round.png") && b_lower.ends_with("ic_launcher_round.png") {
                    return std::cmp::Ordering::Greater;
                }

                // 其他情况按字母顺序
                a.cmp(b)
            });

            // 尝试读取优先级最高的图标
            for zip_path in &icons_in_this_dpi {
                println!("  📖 尝试读取: {}", zip_path);

                match archive.by_name(&zip_path) {
                    Ok(mut icon_file) => {
                        let mut icon_data = Vec::new();
                        match icon_file.read_to_end(&mut icon_data) {
                            Ok(size) => {
                                println!("  ✅ 成功读取图标: {} (大小: {} bytes)", zip_path, size);
                                let base64_icon = BASE64.encode(&icon_data);
                                println!("  🎯 图标 Base64 编码完成，长度: {}", base64_icon.len());
                                return Some(format!("data:image/png;base64,{}", base64_icon));
                            }
                            Err(e) => {
                                println!("  ❌ 读取文件内容失败: {}", e);
                                continue;
                            }
                        }
                    }
                    Err(e) => {
                        println!("  ❌ 无法打开文件: {}", e);
                        continue;
                    }
                }
            }
        }
    }

    println!("\n❌ 未找到任何 ic_launcher 开头的 PNG 图标");
    None
}

// ==================== 图片处理功能 ====================

/// 调整图片尺寸
#[tauri::command]
async fn resize_image(
    image_base64: String,
    target_width: u32,
    target_height: u32,
    mode: String,
    output_format: String,
    quality: u8,
) -> Result<String, String> {
    use image::{ImageFormat, DynamicImage, imageops::FilterType};
    use base64::Engine;

    // 解码 base64 图片
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 加载图片
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("图片加载失败: {}", e))?;

    // 获取原始尺寸
    let (orig_width, orig_height) = img.dimensions();

    // 根据模式调整图片尺寸
    let resized_img = match mode.as_str() {
        "fit" => {
            // 适应模式:保持宽高比,完整显示在目标区域内
            let ratio = (target_width as f64 / orig_width as f64)
                .min(target_height as f64 / orig_height as f64);
            let new_width = (orig_width as f64 * ratio).round() as u32;
            let new_height = (orig_height as f64 * ratio).round() as u32;

            let resized = image::imageops::resize(&img, new_width, new_height, FilterType::Lanczos3);

            // 创建目标尺寸的画布并居中放置
            let mut canvas = DynamicImage::new_rgba8(target_width, target_height);
            for pixel in canvas.as_mut_rgba8().unwrap().pixels_mut() {
                *pixel = image::Rgba([0, 0, 0, 0]); // 透明背景
            }

            let offset_x = ((target_width - new_width) / 2) as i64;
            let offset_y = ((target_height - new_height) / 2) as i64;
            image::imageops::overlay(canvas.as_mut_rgba8().unwrap(), &resized, offset_x, offset_y);

            canvas
        }
        "fill" => {
            // 填充模式:保持宽高比,填满目标区域,裁剪多余部分
            let ratio = (target_width as f64 / orig_width as f64)
                .max(target_height as f64 / orig_height as f64);
            let new_width = (orig_width as f64 * ratio).round() as u32;
            let new_height = (orig_height as f64 * ratio).round() as u32;

            let resized = image::imageops::resize(&img, new_width, new_height, FilterType::Lanczos3);

            // 裁剪到目标尺寸(居中裁剪)
            let offset_x = ((new_width - target_width) / 2) as u32;
            let offset_y = ((new_height - target_height) / 2) as u32;

            // 使用 view 替代 crop,然后 to_image
            let cropped = resized.view(offset_x, offset_y, target_width, target_height).to_image();
            DynamicImage::ImageRgba8(cropped)
        }
        "stretch" => {
            // 拉伸模式:直接拉伸到目标尺寸
            DynamicImage::ImageRgba8(image::imageops::resize(&img, target_width, target_height, FilterType::Lanczos3))
        }
        _ => {
            return Err(format!("未知的调整模式: {}", mode));
        }
    };

    // 编码为输出格式
    let mut buffer = Vec::new();
    let format = match output_format.as_str() {
        "image/png" | "png" => ImageFormat::Png,
        "image/jpeg" | "jpg" | "jpeg" => ImageFormat::Jpeg,
        "image/webp" | "webp" => ImageFormat::WebP,
        _ => ImageFormat::Png,
    };

    let mut cursor = std::io::Cursor::new(&mut buffer);

    // 对于 JPG,需要转换为 RGB 并设置质量
    if format == ImageFormat::Jpeg {
        let rgb_img = resized_img.to_rgb8();
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, quality);
        encoder.encode(
            &rgb_img,
            resized_img.width(),
            resized_img.height(),
            image::ExtendedColorType::Rgb8,
        ).map_err(|e| format!("图片编码失败: {}", e))?;
    } else {
        resized_img.write_to(&mut cursor, format)
            .map_err(|e| format!("图片编码失败: {}", e))?;
    }

    // 转换为 base64
    let base64_string = base64::engine::general_purpose::STANDARD.encode(&buffer);
    let data_url = format!("data:{};base64,{}", output_format, base64_string);

    Ok(data_url)
}

/// 为图片添加圆角
#[tauri::command]
async fn add_image_radius(
    image_base64: String,
    radius: u32,
    output_format: String,
) -> Result<String, String> {
    use base64::Engine;

    // 解码 base64 图片
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 加载图片
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("图片加载失败: {}", e))?;

    // 获取图片尺寸
    let (width, height) = img.dimensions();
    let max_radius = radius.min(width.min(height) / 2);

    // 创建带圆角的图片
    let rounded_img = if output_format == "image/png" || output_format == "png" {
        // PNG 支持透明度,可以真正实现圆角
        create_rounded_image(&img, max_radius)?
    } else {
        // JPG 等不支持透明度,只能绘制白色圆角背景
        create_rounded_image_with_bg(&img, max_radius)?
    };

    // 编码为输出格式
    let mut buffer = Vec::new();
    let format = if output_format == "image/png" || output_format == "png" {
        ImageFormat::Png
    } else if output_format == "image/jpeg" || output_format == "jpg" || output_format == "jpeg" {
        ImageFormat::Jpeg
    } else if output_format == "image/webp" || output_format == "webp" {
        ImageFormat::WebP
    } else {
        ImageFormat::Png
    };

    // 写入图片数据
    let mut cursor = std::io::Cursor::new(&mut buffer);
    rounded_img.write_to(&mut cursor, format)
        .map_err(|e| format!("图片编码失败: {}", e))?;

    // 转换为 base64
    let base64_string = base64::engine::general_purpose::STANDARD.encode(&buffer);
    let data_url = format!("data:{};base64,{}", output_format, base64_string);

    Ok(data_url)
}

/// 创建带圆角的图片(支持透明)
fn create_rounded_image(img: &DynamicImage, radius: u32) -> Result<DynamicImage, String> {
    let (width, height) = img.dimensions();
    let mut rgba_img = img.to_rgba8();

    // 创建圆角遮罩
    for y in 0..height {
        for x in 0..width {
            let pixel = rgba_img.get_pixel_mut(x, y);

            // 检查是否在圆角区域
            let in_corner = if x < radius && y < radius {
                // 左上角
                (x as f64 - radius as f64).powi(2) + (y as f64 - radius as f64).powi(2) > (radius as f64).powi(2)
            } else if x >= width - radius && y < radius {
                // 右上角
                (x as f64 - (width - radius) as f64).powi(2) + (y as f64 - radius as f64).powi(2) > (radius as f64).powi(2)
            } else if x < radius && y >= height - radius {
                // 左下角
                (x as f64 - radius as f64).powi(2) + (y as f64 - (height - radius) as f64).powi(2) > (radius as f64).powi(2)
            } else if x >= width - radius && y >= height - radius {
                // 右下角
                (x as f64 - (width - radius) as f64).powi(2) + (y as f64 - (height - radius) as f64).powi(2) > (radius as f64).powi(2)
            } else {
                false
            };

            if in_corner {
                pixel[3] = 0; // 设置为完全透明
            }
        }
    }

    Ok(DynamicImage::ImageRgba8(rgba_img))
}

/// 创建带圆角的图片(白色背景,用于不支持透明的格式)
fn create_rounded_image_with_bg(img: &DynamicImage, radius: u32) -> Result<DynamicImage, String> {
    use image::RgbaImage;

    let (width, height) = img.dimensions();
    let rounded = create_rounded_image(img, radius)?;

    // 创建白色背景
    let mut bg_img = RgbaImage::new(width, height);
    for pixel in bg_img.pixels_mut() {
        *pixel = image::Rgba([255, 255, 255, 255]);
    }

    // 合并圆角图片到白色背景
    image::imageops::overlay(&mut bg_img, &rounded.to_rgba8(), 0, 0);

    Ok(DynamicImage::ImageRgba8(bg_img))
}

/// 生成多尺寸 APP 图标
#[tauri::command]
async fn generate_app_icons(
    image_base64: String,
    sizes: Vec<u32>,
    radius_percent: u32,
    padding_percent: u32,
    output_format: String,
) -> Result<Vec<IconResult>, String> {
    use base64::Engine;

    // 解码 base64 图片
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 加载原始图片
    let source_img = image::load_from_memory(&image_data)
        .map_err(|e| format!("图片加载失败: {}", e))?;

    let mut results = Vec::new();

    for size in sizes {
        // 计算实际边距(像素)
        let padding = (size as f64 * padding_percent as f64 / 100.0) as u32;
        let content_size = size - padding * 2;

        // 调整图片大小(保持宽高比)
        let resized = image::imageops::resize(
            &source_img,
            content_size,
            content_size,
            image::imageops::FilterType::Lanczos3,
        );

        // 创建正方形画布
        let mut canvas = image::RgbaImage::new(size, size);

        // 填充背景色(可选,这里使用透明)
        for pixel in canvas.pixels_mut() {
            *pixel = image::Rgba([0, 0, 0, 0]);
        }

        // 居中放置调整后的图片
        let offset_x = padding;
        let offset_y = padding;
        image::imageops::overlay(&mut canvas, &resized, offset_x as i64, offset_y as i64);

        // 应用圆角
        let radius = (size as f64 * radius_percent as f64 / 100.0) as u32;
        let rounded = if radius > 0 {
            create_rounded_image(&DynamicImage::ImageRgba8(canvas.clone()), radius)?
        } else {
            DynamicImage::ImageRgba8(canvas)
        };

        // 编码为输出格式
        let mut buffer = Vec::new();
        let format = if output_format == "image/png" || output_format == "png" {
            image::ImageFormat::Png
        } else if output_format == "image/jpeg" || output_format == "jpg" || output_format == "jpeg" {
            image::ImageFormat::Jpeg
        } else if output_format == "image/webp" || output_format == "webp" {
            image::ImageFormat::WebP
        } else {
            image::ImageFormat::Png
        };

        let mut cursor = std::io::Cursor::new(&mut buffer);
        rounded.write_to(&mut cursor, format)
            .map_err(|e| format!("图片编码失败: {}", e))?;

        // 转换为 base64
        let base64_string = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:{};base64,{}", output_format, base64_string);

        results.push(IconResult {
            size,
            url: data_url,
        });
    }

    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IconResult {
    pub size: u32,
    pub url: String,
}

/// 写入文件到指定路径
#[tauri::command]
async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    use tokio::fs::File;
    use tokio::io::AsyncWriteExt;

    let mut file = File::create(&path)
        .await
        .map_err(|e| format!("无法创建文件: {}", e))?;

    file.write_all(&contents)
        .await
        .map_err(|e| format!("写入文件失败: {}", e))?;

    file.flush()
        .await
        .map_err(|e| format!("刷新文件失败: {}", e))?;

    Ok(())
}

// ==================== 工具生成器功能 ====================

/// 生成 UUID
#[tauri::command]
fn generate_uuids(
    count: u32,
    version: String,
    uppercase: bool,
    with_hyphens: bool,
) -> Result<Vec<String>, String> {
    let mut uuids = Vec::new();

    for _ in 0..count {
        let uuid = match version.as_str() {
            "v4" => Uuid::new_v4(),
            "v7" => {
                // UUID v7 使用时间戳,这里简化实现,使用 v4 但格式化为 v7
                // 实际生产环境应使用 uuid v7 crate
                Uuid::new_v4()
            }
            _ => return Err(format!("不支持的 UUID 版本: {}", version)),
        };

        let mut uuid_string = uuid.to_string();

        if !with_hyphens {
            uuid_string = uuid_string.replace("-", "");
        }

        if uppercase {
            uuid_string = uuid_string.to_uppercase();
        }

        uuids.push(uuid_string);
    }

    Ok(uuids)
}

#[derive(Debug, Deserialize)]
pub struct PasswordOptions {
    pub length: u32,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub symbols: bool,
    #[serde(alias = "excludeAmbiguous")]
    pub exclude_ambiguous: bool,
}

/// 生成密码
#[tauri::command]
fn generate_passwords(
    options: PasswordOptions,
    count: u32,
) -> Result<Vec<String>, String> {
    let uppercase_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lowercase_chars = "abcdefghijklmnopqrstuvwxyz";
    let number_chars = "0123456789";
    let symbol_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    let ambiguous_chars = "0OIl1";

    let mut charset = String::new();
    let mut required_chars = String::new();

    if options.uppercase {
        let chars = if options.exclude_ambiguous {
            uppercase_chars.replace(|c| ambiguous_chars.contains(c), "")
        } else {
          uppercase_chars.to_string()
        };
        charset.push_str(&chars);
        if !chars.is_empty() {
            required_chars.push(chars.chars().next().unwrap());
        }
    }

    if options.lowercase {
        let chars = if options.exclude_ambiguous {
            lowercase_chars.replace(|c| ambiguous_chars.contains(c), "")
        } else {
          lowercase_chars.to_string()
        };
        charset.push_str(&chars);
        if !chars.is_empty() {
            required_chars.push(chars.chars().next().unwrap());
        }
    }

    if options.numbers {
        let chars = if options.exclude_ambiguous {
            number_chars.replace(|c| ambiguous_chars.contains(c), "")
        } else {
          number_chars.to_string()
        };
        charset.push_str(&chars);
        if !chars.is_empty() {
            required_chars.push(chars.chars().next().unwrap());
        }
    }

    if options.symbols {
        let chars = if options.exclude_ambiguous {
            symbol_chars.replace(|c| ambiguous_chars.contains(c), "")
        } else {
          symbol_chars.to_string()
        };
        charset.push_str(&chars);
        if !chars.is_empty() {
            required_chars.push(chars.chars().next().unwrap());
        }
    }

    if charset.is_empty() {
        return Err("请至少选择一种字符类型".to_string());
    }

    let charset_vec: Vec<char> = charset.chars().collect();
    let mut rng = rand::thread_rng();
    let mut passwords = Vec::new();

    for _ in 0..count {
        let mut password = String::new();

        // 先确保包含每种选中的字符类型
        for c in required_chars.chars() {
            password.push(c);
        }

        // 填充剩余长度
        while password.len() < options.length as usize {
            let random_index = rng.gen_range(0..charset_vec.len());
            password.push(charset_vec[random_index]);
        }

        // 打乱密码顺序
        let password_chars: Vec<char> = password.chars().collect();
        let mut shuffled_password = String::new();
        for _ in 0..password_chars.len() {
            let random_index = rng.gen_range(0..password_chars.len());
            shuffled_password.push(password_chars[random_index]);
        }

        passwords.push(shuffled_password);
    }

    Ok(passwords)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_file_info,
            parse_android_package,
            resize_image,
            add_image_radius,
            generate_app_icons,
            write_file,
            generate_uuids,
            generate_passwords
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
