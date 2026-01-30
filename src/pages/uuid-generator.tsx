import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Copy, RefreshCw, CheckCircle2, Key } from "lucide-react";

type UuidVersion = "v4" | "v7";

interface UuidResult {
  uuid: string;
  version: string;
}

export function UuidGeneratorPage() {
  const [count, setCount] = useState([1]);
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [uppercase, setUppercase] = useState(false);
  const [withHyphens, setWithHyphens] = useState(true);
  const [results, setResults] = useState<UuidResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const uuids = await invoke<string[]>("generate_uuids", {
        count: count[0],
        version,
        uppercase,
        withHyphens,
      });

      const formatted = uuids.map((uuid) => ({
        uuid,
        version,
      }));

      setResults(formatted);
    } catch (error) {
      console.error("生成失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (uuid: string, index: number) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const handleCopyAll = async () => {
    const allUuids = results.map((r) => r.uuid).join("\n");
    try {
      await navigator.clipboard.writeText(allUuids);
      alert(`已复制 ${results.length} 个 UUID 到剪贴板`);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">UUID 生成器</h1>
        <p className="text-muted-foreground text-lg">
          批量生成通用唯一识别码 (UUID)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 设置 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>生成设置</CardTitle>
              <CardDescription>配置 UUID 生成参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 数量 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>生成数量</Label>
                  <span className="text-sm text-muted-foreground">{count[0]}</span>
                </div>
                <Slider
                  value={count}
                  onValueChange={setCount}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* UUID 版本 */}
              <div className="space-y-2">
                <Label>UUID 版本</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={version === "v4" ? "default" : "outline"}
                    onClick={() => setVersion("v4")}
                    className="text-xs"
                  >
                    UUID v4
                  </Button>
                  <Button
                    size="sm"
                    variant={version === "v7" ? "default" : "outline"}
                    onClick={() => setVersion("v7")}
                    className="text-xs"
                  >
                    UUID v7
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {version === "v4"
                    ? "v4: 随机生成,最常用"
                    : "v7: 时间排序,适合分布式系统"}
                </p>
              </div>

              {/* 格式选项 */}
              <div className="space-y-3">
                <Label>格式选项</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setUppercase(!uppercase)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                      uppercase ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="text-sm">大写字母</span>
                    <div className="h-5 w-5 rounded border flex items-center justify-center">
                      {uppercase && (
                        <div className="h-3 w-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setWithHyphens(!withHyphens)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                      withHyphens ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="text-sm">包含连字符</span>
                    <div className="h-5 w-5 rounded border flex items-center justify-center">
                      {withHyphens && (
                        <div className="h-3 w-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    生成 UUID
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 说明卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>UUID 说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground mb-1">UUID v4</p>
                  <p>基于随机数生成,格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">UUID v7</p>
                  <p>基于时间戳排序,格式类似 v4,但按时间排序,适合数据库索引</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">用途</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>数据库主键</li>
                    <li>会话标识</li>
                    <li>请求追踪</li>
                    <li>分布式系统 ID</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧: 结果 */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>生成结果</CardTitle>
                  <CardDescription>
                    {results.length > 0
                      ? `已生成 ${results.length} 个 UUID`
                      : "点击生成按钮开始"}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleCopyAll}>
                    <Copy className="mr-2 h-4 w-4" />
                    复制全部
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-muted/30 p-8">
                  <div className="text-center text-muted-foreground">
                    <Key className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p>配置参数后点击"生成 UUID"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <span className="flex-1 font-mono text-sm break-all">
                        {result.uuid}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(result.uuid, index)}
                        className="shrink-0"
                      >
                        {copiedIndex === index ? (
                          <>
                            <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-4 w-4" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
