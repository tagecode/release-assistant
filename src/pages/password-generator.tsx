import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Copy, RefreshCw, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export function PasswordGeneratorPage() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [count, setCount] = useState([1]);
  const [results, setResults] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<boolean[]>([]);
  const [strength, setStrength] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const calculateStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 5);
  };

  const getStrengthLabel = (score: number): { label: string; color: string } => {
    if (score <= 2) return { label: "弱", color: "text-red-500" };
    if (score <= 3) return { label: "中等", color: "text-yellow-500" };
    if (score <= 4) return { label: "强", color: "text-green-500" };
    return { label: "非常强", color: "text-green-600" };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const passwords = await invoke<string[]>("generate_passwords", {
        options: {
          length: options.length,
          uppercase: options.uppercase,
          lowercase: options.lowercase,
          numbers: options.numbers,
          symbols: options.symbols,
          excludeAmbiguous: options.excludeAmbiguous,
        },
        count: count[0],
      });

      setResults(passwords);
      setShowPasswords(new Array(passwords.length).fill(false));

      // 计算第一个密码的强度
      if (passwords.length > 0) {
        setStrength(calculateStrength(passwords[0]));
      }
    } catch (error) {
      console.error("生成失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (password: string, index: number) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const handleCopyAll = async () => {
    const allPasswords = results.join("\n");
    try {
      await navigator.clipboard.writeText(allPasswords);
      alert(`已复制 ${results.length} 个密码到剪贴板`);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const togglePasswordVisibility = (index: number) => {
    const newShowPasswords = [...showPasswords];
    newShowPasswords[index] = !newShowPasswords[index];
    setShowPasswords(newShowPasswords);
  };

  const hasAtLeastOneOption =
    options.uppercase || options.lowercase || options.numbers || options.symbols;

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">密码生成器</h1>
        <p className="text-muted-foreground text-lg">
          生成安全的随机密码
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 设置 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>密码设置</CardTitle>
              <CardDescription>配置密码生成参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 长度 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>密码长度</Label>
                  <span className="text-sm text-muted-foreground">{options.length}</span>
                </div>
                <Slider
                  value={[options.length]}
                  onValueChange={(value) =>
                    setOptions({ ...options, length: value[0] })
                  }
                  max={128}
                  min={4}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* 数量 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>生成数量</Label>
                  <span className="text-sm text-muted-foreground">{count[0]}</span>
                </div>
                <Slider
                  value={count}
                  onValueChange={setCount}
                  max={50}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* 字符选项 */}
              <div className="space-y-2">
                <Label>字符类型</Label>
                <div className="space-y-2">
                  {[
                    { key: "uppercase", label: "大写字母 (A-Z)", example: "ABC" },
                    { key: "lowercase", label: "小写字母 (a-z)", example: "abc" },
                    { key: "numbers", label: "数字 (0-9)", example: "123" },
                    { key: "symbols", label: "特殊字符 (!@#$)", example: "!@#" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() =>
                        setOptions({
                          ...options,
                          [item.key]: !options[item.key as keyof PasswordOptions],
                        })
                      }
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                        options[item.key as keyof PasswordOptions]
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.example}
                        </div>
                      </div>
                      <div className="ml-2 h-5 w-5 rounded border flex items-center justify-center">
                        {options[item.key as keyof PasswordOptions] && (
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 其他选项 */}
              <div className="space-y-2">
                <Label>其他选项</Label>
                <button
                  onClick={() =>
                    setOptions({
                      ...options,
                      excludeAmbiguous: !options.excludeAmbiguous,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    options.excludeAmbiguous
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm">排除易混淆字符</div>
                    <div className="text-xs text-muted-foreground">
                      如: 0OIl1 (零欧艾艾一)
                    </div>
                  </div>
                  <div className="h-5 w-5 rounded border flex items-center justify-center">
                    {options.excludeAmbiguous && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={!hasAtLeastOneOption || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    生成密码
                  </>
                )}
              </Button>

              {!hasAtLeastOneOption && (
                <p className="text-sm text-destructive">
                  请至少选择一种字符类型
                </p>
              )}
            </CardContent>
          </Card>

          {/* 强度说明 */}
          <Card>
            <CardHeader>
              <CardTitle>密码强度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {results.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>当前强度:</span>
                      <span className={`font-medium ${getStrengthLabel(strength).color}`}>
                        {getStrengthLabel(strength).label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded ${
                            level <= strength
                              ? "bg-primary"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    生成密码后显示强度评估
                  </p>
                )}
                <div className="pt-3 border-t">
                  <p className="font-medium text-foreground mb-2">强度标准:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• 长度 ≥ 12 字符</li>
                    <li>• 长度 ≥ 16 字符</li>
                    <li>• 包含大写字母</li>
                    <li>• 包含小写字母</li>
                    <li>• 包含数字</li>
                    <li>• 包含特殊字符</li>
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
                      ? `已生成 ${results.length} 个密码`
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
                    <Lock className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p>配置参数后点击"生成密码"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((password, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <span className="flex-1 font-mono text-sm break-all">
                        {showPasswords[index] ? password : "•".repeat(password.length)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePasswordVisibility(index)}
                        className="shrink-0"
                      >
                        {showPasswords[index] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(password, index)}
                        className="shrink-0"
                      >
                        {copiedIndex === index ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </>
                        ) : (
                          <Copy className="h-4 w-4" />
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
