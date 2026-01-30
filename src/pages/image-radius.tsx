import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, RefreshCw, CheckCircle2 } from "lucide-react";

export function ImageRadiusPage() {
  const [radius, setRadius] = useState([16]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setProcessedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!imageSrc) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 移除 data URL 前缀,只保留 base64 数据
      const base64Data = imageSrc.split(',')[1];

      // 调用 Rust 后端处理图片
      const result = await invoke<string>("add_image_radius", {
        imageBase64: base64Data,
        radius: radius[0],
        outputFormat: "image/png"
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
      // 将 base64 数据转换为 Uint8Array
      const base64Data = processedImage.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 使用 Tauri 的文件保存对话框
      const filePath = await save({
        filters: [{
          name: 'PNG 图片',
          extensions: ['png']
        }],
        defaultPath: `rounded-image-${radius[0]}px.png`
      });

      if (filePath) {
        // 保存文件到选择的路径
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

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">图片圆角处理</h1>
        <p className="text-muted-foreground text-lg">
          为图片添加圆角效果,支持自定义圆角大小
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 左侧: 设置和上传区域 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传图片</CardTitle>
              <CardDescription>支持 PNG、JPG、WebP 等格式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <Label
                  htmlFor="image-upload"
                  className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  点击上传或拖拽图片到此处
                </Label>
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
              <CardTitle>圆角设置</CardTitle>
              <CardDescription>调整圆角半径大小</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>圆角半径</Label>
                  <span className="text-sm text-muted-foreground">{radius[0]}px</span>
                </div>
                <Slider
                  value={radius}
                  onValueChange={setRadius}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRadius([8])}
                  className="text-sm"
                >
                  8px
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRadius([16])}
                  className="text-sm"
                >
                  16px
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRadius([24])}
                  className="text-sm"
                >
                  24px
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRadius([32])}
                  className="text-sm"
                >
                  32px
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
              <CardDescription>处理并下载图片</CardDescription>
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
                  "应用圆角"
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

        {/* 右侧: 预览区域 */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>实时预览</CardTitle>
              <CardDescription>查看圆角效果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive font-medium">❌ {error}</p>
                  </div>
                )}

                {processedImage && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-700 dark:text-green-400">处理成功! 可以下载了</p>
                  </div>
                )}

                <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-muted/30 p-8">
                  {imageSrc ? (
                    <div className="space-y-4 w-full">
                      <img
                        src={processedImage || imageSrc}
                        alt="预览"
                        className="mx-auto max-w-full rounded-lg shadow-lg transition-all duration-300"
                        style={{ borderRadius: processedImage ? '0' : `${radius[0]}px` }}
                      />
                      {!processedImage && (
                        <p className="text-center text-sm text-muted-foreground">
                          当前预览为原图圆角效果(实时),点击"应用圆角"生成最终图片
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Upload className="mx-auto h-16 w-16 mb-4 opacity-50" />
                      <p>请上传图片以预览效果</p>
                    </div>
                  )}
                </div>
              </div>
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
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>上传需要处理的图片,支持常见图片格式</li>
            <li>通过滑块或预设按钮调整圆角半径大小</li>
            <li>右侧预览区域实时显示圆角效果</li>
            <li>点击"应用圆角"按钮处理图片</li>
            <li>处理完成后可下载带有圆角效果的图片</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
