import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DownloadDialog, DownloadOptions } from "@/components/download-dialog";
import { Upload, RefreshCw, Smartphone, Monitor, Tablet, CheckCircle2, Download } from "lucide-react";

interface IconSize {
  name: string;
  size: number;
  icon: React.ReactNode;
}

interface GeneratedIcon {
  size: number;
  url: string;
}

const iconSizes: IconSize[] = [
  { name: "Android (mdpi)", size: 48, icon: <Smartphone className="h-4 w-4" /> },
  { name: "Android (hdpi)", size: 72, icon: <Smartphone className="h-4 w-4" /> },
  { name: "Android (xhdpi)", size: 96, icon: <Smartphone className="h-4 w-4" /> },
  { name: "Android (xxhdpi)", size: 144, icon: <Smartphone className="h-4 w-4" /> },
  { name: "Android (xxxhdpi)", size: 192, icon: <Smartphone className="h-4 w-4" /> },
  { name: "iOS (iPhone)", size: 60, icon: <Smartphone className="h-4 w-4" /> },
  { name: "iOS (iPad)", size: 76, icon: <Tablet className="h-4 w-4" /> },
  { name: "iOS (iPad Pro)", size: 167, icon: <Tablet className="h-4 w-4" /> },
  { name: "Web favicon", size: 32, icon: <Monitor className="h-4 w-4" /> },
  { name: "Web icon", size: 192, icon: <Monitor className="h-4 w-4" /> },
];

export function IconGeneratorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [radius, setRadius] = useState([20]);
  const [padding, setPadding] = useState([8]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([192]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIcons, setGeneratedIcons] = useState<GeneratedIcon[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 下载弹窗相关状态
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setGeneratedIcons([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeToggle = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleGenerate = async () => {
    if (!imageSrc || selectedSizes.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      // 移除 data URL 前缀
      const base64Data = imageSrc.split(',')[1];

      // 添加小的延迟让 UI 更新
      await new Promise(resolve => setTimeout(resolve, 50));

      // 调用 Rust 后端生成图标
      const result = await invoke<GeneratedIcon[]>("generate_app_icons", {
        imageBase64: base64Data,
        sizes: selectedSizes,
        radiusPercent: radius[0],
        paddingPercent: padding[0],
        outputFormat: "image/png"
      });

      setGeneratedIcons(result);
    } catch (err) {
      console.error("生成失败:", err);
      setError(err as string);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (generatedIcons.length === 0) return;

    try {
      // 使用 Tauri 的文件保存对话框选择目录
      const filePath = await save({
        filters: [{
          name: 'PNG 图片',
          extensions: ['png']
        }],
        defaultPath: `icon-set-${generatedIcons.length}icons.png`
      });

      if (!filePath) return;

      // 注意:这里只保存第一个图标作为示例
      // 如果要批量保存多个文件,需要使用文件夹选择对话框(后续可以优化)
      const icon = generatedIcons[0];
      const base64Data = icon.url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await invoke('write_file', {
        path: filePath,
        contents: Array.from(bytes)
      });

      // 提示用户其他图标需要单独下载
      if (generatedIcons.length > 1) {
        alert(`已保存第一个图标。其他 ${generatedIcons.length - 1} 个图标请单独下载。`);
      }
    } catch (err) {
      console.error("批量下载失败:", err);
      setError(`批量下载失败: ${err}`);
    }
  };

  const handleDownloadSingle = (icon: GeneratedIcon) => {
    // 将 base64 数据转换为 Uint8Array
    const base64Data = icon.url.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 设置下载选项并打开弹窗
    setDownloadOptions({
      fileName: `icon-${icon.size}x${icon.size}.png`,
      fileData: bytes,
      filters: [{
        name: 'PNG 图片',
        extensions: ['png']
      }],
      preview: icon.url
    });
    setDownloadDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">APP图标生成器</h1>
        <p className="text-muted-foreground text-lg">
          一键生成多平台、多尺寸的应用图标
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 上传和设置 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>上传图标源文件</CardTitle>
              <CardDescription>建议上传 1024x1024 的高清图标</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                {imageSrc ? (
                  <div className="space-y-3 w-full">
                    <img
                      src={imageSrc}
                      alt="已上传的图标"
                      className="mx-auto h-32 w-32 rounded-lg object-cover shadow-md"
                    />
                    <Label
                      htmlFor="icon-upload"
                      className="cursor-pointer text-center text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      点击更换图标
                    </Label>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <Label
                      htmlFor="icon-upload"
                      className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-primary"
                    >
                      点击上传图标
                    </Label>
                  </>
                )}
                <input
                  id="icon-upload"
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
              <CardTitle>图标样式设置</CardTitle>
              <CardDescription>自定义图标外观</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>圆角半径</Label>
                  <span className="text-sm text-muted-foreground">{radius[0]}%</span>
                </div>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  max={50}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>内边距</Label>
                  <span className="text-sm text-muted-foreground">{padding[0]}%</span>
                </div>
                <Slider
                  value={padding}
                  onValueChange={setPadding}
                  max={20}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRadius([0])}
                  className="text-xs"
                >
                  方形
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRadius([20])}
                  className="text-xs"
                >
                  圆角
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRadius([50])}
                  className="text-xs"
                >
                  圆形
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={!imageSrc || selectedSizes.length === 0 || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  `生成图标 (${selectedSizes.length})`
                )}
              </Button>
              {generatedIcons.length > 0 && (
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  批量下载
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 中间和右侧: 尺寸选择和预览 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>选择目标尺寸</CardTitle>
              <CardDescription>勾选需要生成的图标尺寸</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {iconSizes.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleSizeToggle(item.size)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedSizes.includes(item.size)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="text-primary">{item.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.size} × {item.size}
                      </div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded border ${
                        selectedSizes.includes(item.size)
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedSizes.includes(item.size) && (
                        <div className="flex h-full items-center justify-center">
                          <svg
                            className="h-3 w-3 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {generatedIcons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  已成功生成 {generatedIcons.length} 个图标
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive font-medium">❌ {error}</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {generatedIcons.map((icon) => (
                    <div
                      key={icon.size}
                      className="group flex flex-col items-center space-y-2 rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <img
                        src={icon.url}
                        alt={`${icon.size}x${icon.size}`}
                        className="h-16 w-16 rounded-lg object-cover shadow-sm"
                        style={{ borderRadius: `${radius[0]}%` }}
                      />
                      <div className="text-center">
                        <div className="text-sm font-medium">{icon.size}px</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadSingle(icon)}
                          className="mt-2 h-7 text-xs"
                        >
                          下载
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
              <h4 className="mb-2 font-medium">支持的图标尺寸</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Android: mdpi / hdpi / xhdpi / xxhdpi / xxxhdpi</li>
                <li>iOS: iPhone / iPad / iPad Pro</li>
                <li>Web: Favicon / PWA Icon</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium">最佳实践</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>上传 1024x1024 或更高分辨率的图标源文件</li>
                <li>使用 PNG 格式以获得最佳质量</li>
                <li>图标内容应居中并留有适当边距</li>
                <li>可批量下载所有生成的图标</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 下载弹窗 */}
      <DownloadDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        options={downloadOptions}
      />
    </div>
  );
}
