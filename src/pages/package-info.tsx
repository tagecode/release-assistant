import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Copy, CheckCircle2, Loader2, X, Info } from "lucide-react";

interface FileInfo {
  file_name: string;
  file_extension: string;
  file_size: number;
  file_size_readable: string;
  file_path: string;
  md5: string;
  sha1: string;
  sha256: string;
}

export function PackageInfoPage() {
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "选择文件",
      });

      if (selected && typeof selected === "string") {
        setSelectedFilePath(selected);
        setFileInfo(null); // 清空之前的信息
      }
    } catch (error) {
      console.error("文件选择失败:", error);
    }
  };

  const handleGetFileInfo = async () => {
    if (!selectedFilePath) {
      return;
    }

    setLoading(true);
    try {
      const info = await invoke<FileInfo>("get_file_info", {
        filePath: selectedFilePath,
      });
      setFileInfo(info);
    } catch (error) {
      console.error("获取文件信息失败:", error);
      alert(`获取文件信息失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!fileInfo) return;

    try {
      const jsonString = JSON.stringify(fileInfo, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const handleClear = () => {
    setSelectedFilePath("");
    setFileInfo(null);
    setCopied(false);
  };

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">文件信息</h1>
        <p className="text-muted-foreground text-lg">
          查看文件的基本信息和哈希值
        </p>
      </div>

      {/* 文件选择和操作区域 */}
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">选择文件</h2>
            <div className="flex gap-4 items-center">
              <Button
                onClick={handleSelectFile}
                variant="outline"
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                选择文件
              </Button>
              <Button
                onClick={handleGetFileInfo}
                disabled={!selectedFilePath || loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4" />
                    获取信息
                  </>
                )}
              </Button>
              {(selectedFilePath || fileInfo) && (
                <Button
                  onClick={handleClear}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  清空
                </Button>
              )}
            </div>
          </div>

          {selectedFilePath && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-1">已选择文件：</p>
              <p className="text-sm font-mono break-all">{selectedFilePath}</p>
            </div>
          )}
        </div>
      </div>

      {/* 文件信息展示区域 */}
      {fileInfo && (
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">文件信息</h2>
            <Button
              onClick={handleCopyJson}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  复制JSON
                </>
              )}
            </Button>
          </div>

          <div className="rounded-md bg-muted p-4 font-mono text-sm overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(fileInfo, null, 2)}
            </pre>
          </div>

          {/* 信息卡片展示 */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                文件名
              </p>
              <p className="font-mono text-sm break-all">{fileInfo.file_name}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                文件扩展名
              </p>
              <p className="font-mono text-sm">
                {fileInfo.file_extension || "无"}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                文件大小
              </p>
              <p className="font-mono text-sm">
                {fileInfo.file_size_readable} ({fileInfo.file_size} bytes)
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                文件路径
              </p>
              <p className="font-mono text-xs break-all">{fileInfo.file_path}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                MD5
              </p>
              <p className="font-mono text-xs break-all">{fileInfo.md5}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                SHA1
              </p>
              <p className="font-mono text-xs break-all">{fileInfo.sha1}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                SHA256
              </p>
              <p className="font-mono text-xs break-all">{fileInfo.sha256}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
