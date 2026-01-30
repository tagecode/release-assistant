import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, RefreshCw, CheckCircle2, Lock, Unlock, RotateCcw } from "lucide-react";

type ResizeMode = "fit" | "fill" | "stretch";

export function ImageProcessPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState([800]);
  const [height, setHeight] = useState([600]);
  const [lockRatio, setLockRatio] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("fit");
  const [outputFormat, setOutputFormat] = useState("png");
  const [quality, setQuality] = useState([90]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算宽高比
  const aspectRatio = originalSize.width > 0 ? originalSize.width / originalSize.height : 1;

  // 当图片改变时更新尺寸
  useEffect(() => {
    if (imageSrc && originalSize.width > 0) {
      setWidth([originalSize.width]);
      setHeight([originalSize.height]);
    }
  }, [imageSrc, originalSize]);

  // 当锁定宽高比时,同步调整高度
  useEffect(() => {
    if (lockRatio && originalSize.width > 0) {
      const newHeight = Math.round(width[0] / aspectRatio);
      setHeight([newHeight]);
    }
  }, [width, lockRatio, aspectRatio]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageSrc(result);
        setProcessedImage(null);
        setError(null);

        // 获取原始图片尺寸
        const img = new Image();
        img.onload = () => {
          setOriginalSize({ width: img.width, height: img.height });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!imageSrc) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 移除 data URL 前缀
      const base64Data = imageSrc.split(',')[1];

      // 调用 Rust 后端调整图片尺寸
      const result = await invoke<string>("resize_image", {
        imageBase64: base64Data,
        targetWidth: width[0],
        targetHeight: height[0],
        mode: resizeMode,
        outputFormat: `image/${outputFormat}`,
        quality: quality[0]
      });

      setProcessedImage(result);
    } catch (err) {
      console.error("处理失败:", err);
      setError(err as string);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!processedImage) return;

    setIsDownloading(true);

    try {
      const base64Data = processedImage.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const filePath = await save({
        filters: [{
          name: `${outputFormat.toUpperCase()} 图片`,
          extensions: [outputFormat]
        }],
        defaultPath: `resized-${width[0]}x${height[0]}.${outputFormat}`
      });

      if (filePath) {
        await invoke('write_file', {
          path: filePath,
          contents: Array.from(bytes)
        });
      }
    } catch (err) {
      console.error("下载失败:", err);
      setError(`下载失败: ${err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    if (originalSize.width > 0) {
      setWidth([originalSize.width]);
      setHeight([originalSize.height]);
    }
  };

  // 预设常用尺寸
  const presetSizes = [
    { name: "原始", width: originalSize.width, height: originalSize.height },
    { name: "1920x1080", width: 1920, height: 1080 },
    { name: "1280x720", width: 1280, height: 720 },
    { name: "1080x1080", width: 1080, height: 1080 },
    { name: "800x600", width: 800, height: 600 },
    { name: "512x512", width: 512, height: 512 },
  ];

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">图片尺寸调整</h1>
        <p className="text-muted-foreground text-lg">
          调整图片的宽度和高度,支持多种调整模式
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 设置和上传 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>上传图片</CardTitle>
              <CardDescription>支持 PNG、JPG、WebP 等格式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                {imageSrc ? (
                  <div className="space-y-3 w-full">
                    <img
                      src={imageSrc}
                      alt="已上传的图片"
                      className="mx-auto h-32 w-32 rounded-lg object-cover shadow-md"
                    />
                    <div className="text-center text-sm text-muted-foreground">
                      {originalSize.width} × {originalSize.height}
                    </div>
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer text-center text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      点击更换图片
                    </Label>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      点击上传图片
                    </Label>
                  </>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>尺寸设置</CardTitle>
              <CardDescription>调整目标尺寸</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 宽度 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>宽度</Label>
                  <span className="text-sm text-muted-foreground">{width[0]}px</span>
                </div>
                <Slider
                  value={width}
                  onValueChange={setWidth}
                  max={4096}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* 高度 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>高度</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setLockRatio(!lockRatio)}
                      title={lockRatio ? "解锁宽高比" : "锁定宽高比"}
                    >
                      {lockRatio ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">{height[0]}px</span>
                </div>
                <Slider
                  value={height}
                  onValueChange={(value) => {
                    setHeight(value);
                    if (lockRatio) {
                      const newWidth = Math.round(value[0] * aspectRatio);
                      setWidth([newWidth]);
                    }
                  }}
                  max={4096}
                  min={1}
                  step={1}
                  className="w-full"
                  disabled={lockRatio}
                />
              </div>

              {/* 快速重置 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!imageSrc}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                恢复原始尺寸
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>调整模式和输出</CardTitle>
              <CardDescription>选择调整模式和输出格式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 调整模式 */}
              <div className="space-y-2">
                <Label>调整模式</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: "fit" as ResizeMode, label: "适应" },
                    { mode: "fill" as ResizeMode, label: "填充" },
                    { mode: "stretch" as ResizeMode, label: "拉伸" },
                  ].map((item) => (
                    <Button
                      key={item.mode}
                      size="sm"
                      variant={resizeMode === item.mode ? "default" : "outline"}
                      onClick={() => setResizeMode(item.mode)}
                      className="text-xs"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {resizeMode === "fit" && "保持宽高比,可能留有空白"}
                  {resizeMode === "fill" && "保持宽高比,裁剪多余部分"}
                  {resizeMode === "stretch" && "强制拉伸到目标尺寸"}
                </p>
              </div>

              {/* 输出格式 */}
              <div className="space-y-2">
                <Label>输出格式</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["png", "jpg", "webp"].map((format) => (
                    <Button
                      key={format}
                      size="sm"
                      variant={outputFormat === format ? "default" : "outline"}
                      onClick={() => setOutputFormat(format)}
                      className="text-xs uppercase"
                    >
                      {format}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 质量设置 (仅 JPG/WebP) */}
              {(outputFormat === "jpg" || outputFormat === "webp") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>质量</Label>
                    <span className="text-sm text-muted-foreground">{quality[0]}%</span>
                  </div>
                  <Slider
                    value={quality}
                    onValueChange={setQuality}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleProcess}
                disabled={!imageSrc || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "应用尺寸调整"
                )}
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!processedImage || isDownloading}
                variant="outline"
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    下载中...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    下载图片
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧: 预览和预设 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>常用尺寸预设</CardTitle>
              <CardDescription>快速选择常用的图片尺寸</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {presetSizes.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      if (preset.width > 0) {
                        setWidth([preset.width]);
                        if (lockRatio) {
                          setHeight([Math.round(preset.width / aspectRatio)]);
                        } else {
                          setHeight([preset.height]);
                        }
                      }
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                      width[0] === preset.width && height[0] === preset.height
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    disabled={preset.width === 0}
                  >
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.width > 0 ? `${preset.width} × ${preset.height}` : "请先上传图片"}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>预览</CardTitle>
              <CardDescription>
                {processedImage ? "处理结果" : "原始图片"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-medium">❌ {error}</p>
                </div>
              )}

              {processedImage && (
                <div className="mb-4 rounded-lg border border-green-500/50 bg-green-500/10 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    处理成功! {width[0]} × {height[0]} px
                  </p>
                </div>
              )}

              <div className="flex min-h-[500px] items-center justify-center rounded-lg bg-muted/30 p-8">
                {imageSrc ? (
                  <div className="space-y-4 w-full">
                    <div className="text-center text-sm text-muted-foreground mb-2">
                      {processedImage ? (
                        <>处理后: {width[0]} × {height[0]}</>
                      ) : (
                        <>原始: {originalSize.width} × {originalSize.height}</>
                      )}
                    </div>
                    <img
                      src={processedImage || imageSrc}
                      alt="预览"
                      className="mx-auto max-w-full rounded-lg shadow-lg"
                      style={{ maxHeight: "400px" }}
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p>请上传图片以预览</p>
                  </div>
                )}
              </div>

              {/* 尺寸信息 */}
              {imageSrc && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-muted-foreground">原始尺寸</div>
                    <div className="font-medium">
                      {originalSize.width} × {originalSize.height}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-muted-foreground">目标尺寸</div>
                    <div className="font-medium">
                      {width[0]} × {height[0]}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">调整模式说明</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>适应:</strong> 保持宽高比,完整显示图片,可能留有空白</li>
                <li><strong>填充:</strong> 保持宽高比,填满目标区域,裁剪多余部分</li>
                <li><strong>拉伸:</strong> 强制拉伸到目标尺寸,可能导致变形</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium">使用技巧</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>点击锁头图标锁定/解锁宽高比</li>
                <li>使用预设尺寸快速选择常用分辨率</li>
                <li>PNG 支持透明背景,JPG/WebP 文件更小</li>
                <li>JPG/WebP 可调整质量以控制文件大小</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
