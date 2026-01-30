# Release Assistant

Release Assistant - Android APK 处理和开发工具集

This is a Tauri desktop application that provides various tools for Android APK processing and development.

## Features

- **文件信息**: 查看文件基本信息和哈希值
- **包解析**: 解析 Android APK 包信息
- **APK 签名校验**: 校验 APK 签名(v1/v2/v3/v4)
- **图片尺寸**: 调整图片尺寸
- **图片圆角**: 为图片添加圆角效果
- **APP 图标生成器**: 批量生成多尺寸应用图标
- **UUID 生成器**: 批量生成 UUID
- **密码生成器**: 生成安全的随机密码

## Development

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Development Commands

### Frontend (Node.js)
- `npm run dev` - Start Vite dev server (runs on port 1420)
- `npm run build` - Build frontend (TypeScript check + Vite build)
- `npm run preview` - Preview production build

### Tauri (Full Stack)
- `npm run tauri dev` - Run full development mode
- `npm run tauri build` - Build release binary

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Rust + Tauri 2
- **Styling**: Tailwind CSS
