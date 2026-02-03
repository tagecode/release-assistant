import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FolderOpen, FileImage, CheckCircle2, Loader2 } from "lucide-react";

export interface DownloadOptions {
  fileName: string;
  fileData: Uint8Array;
  filters: Array<{ name: string; extensions: string[] }>;
  preview?: string; // base64 预览图
}

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: DownloadOptions | null;
}

export function DownloadDialog({ open, onOpenChange, options }: DownloadDialogProps) {
  const [fileName, setFileName] = useState("");
  const [savePath, setSavePath] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 当 options 改变时更新文件名
  useEffect(() => {
    if (options) {
      setFileName(options.fileName);
      setSavePath("");
      setShowSuccess(false);
    }
  }, [options]);

  const handleSelectPath = async () => {
    try {
      const filePath = await save({
        filters: options?.filters || [],
        defaultPath: fileName,
      });

      if (filePath) {
        setSavePath(filePath);
      }
    } catch (error) {
      console.error("选择路径失败:", error);
    }
  };

  const handleDownload = async () => {
    if (!options || !savePath) return;

    setIsSaving(true);
    try {
      await invoke("write_file", {
        path: savePath,
        contents: Array.from(options.fileData),
      });

      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileNameChange = (value: string) => {
    setFileName(value);
    // 如果已经有保存路径，同时更新保存路径
    if (savePath) {
      const pathParts = savePath.split(/[/\\]/);
      pathParts[pathParts.length - 1] = value;
      setSavePath(pathParts.join("/"));
    }
  };

  if (!options) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            下载文件
          </DialogTitle>
          <DialogDescription>
            选择保存位置并确认文件名
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* 文件预览 */}
          {options.preview && (
            <div className="flex justify-center rounded-lg border bg-muted/50 p-4">
              <img
                src={options.preview}
                alt="预览"
                className="max-h-32 max-w-full rounded object-contain"
              />
            </div>
          )}

          {/* 文件名输入 */}
          <div className="space-y-2">
            <Label htmlFor="filename">文件名</Label>
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <Input
                id="filename"
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                placeholder="输入文件名"
                className="flex-1"
              />
            </div>
          </div>

          {/* 保存路径 */}
          <div className="space-y-2">
            <Label htmlFor="savepath">保存位置</Label>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="savepath"
                value={savePath || "未选择保存位置"}
                readOnly
                placeholder="点击选择保存位置"
                className="flex-1 text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectPath}
                className="shrink-0"
              >
                浏览
              </Button>
            </div>
          </div>

          {/* 成功提示 */}
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              文件保存成功！
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!savePath || isSaving || showSuccess}
            className="min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中
              </>
            ) : showSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                已保存
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                保存
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
