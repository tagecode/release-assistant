import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { FileUp, Copy, CheckCircle2, Loader2, X, PackageSearch } from "lucide-react";

interface PackageInfo {
  package_name: string;
  version_name: string;
  version_code: string;
  min_sdk_version: string;
  target_sdk_version: string;
  compile_sdk_version: string;
  permissions: string[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
  file_size: number;
  file_size_readable: string;
  icon_base64?: string;  // Base64 编码的图标
}

export function PackageParsePage() {
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "选择 APK/AAB 文件",
        filters: [
          {
            name: "Android Package",
            extensions: ["apk", "aab"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFilePath(selected);
        setPackageInfo(null);
      }
    } catch (error) {
      console.error("文件选择失败:", error);
    }
  };

  const handleParsePackage = async () => {
    if (!selectedFilePath) {
      return;
    }

    setLoading(true);
    try {
      const info = await invoke<PackageInfo>("parse_android_package", {
        filePath: selectedFilePath,
      });
      setPackageInfo(info);
    } catch (error) {
      console.error("包解析失败:", error);
      alert(`包解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!packageInfo) return;

    try {
      const jsonString = JSON.stringify(packageInfo, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const handleClear = () => {
    setSelectedFilePath("");
    setPackageInfo(null);
    setCopied(false);
  };

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          包解析（Android: APK, AAB）
        </h1>
        <p className="text-muted-foreground text-lg">
          解析 Android 应用包的详细信息
        </p>
      </div>

      {/* 文件选择和操作区域 */}
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">选择安装包</h2>
            <div className="flex gap-4 items-center flex-wrap">
              <Button
                onClick={handleSelectFile}
                variant="outline"
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                选择文件
              </Button>
              <Button
                onClick={handleParsePackage}
                disabled={!selectedFilePath || loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <PackageSearch className="h-4 w-4" />
                    包解析
                  </>
                )}
              </Button>
              {(selectedFilePath || packageInfo) && (
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

      {/* 包信息展示区域 */}
      {packageInfo && (
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">包信息</h2>
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

          <div className="rounded-md bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(packageInfo, null, 2)}
            </pre>
          </div>

          {/* 应用图标展示 */}
          {packageInfo.icon_base64 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">应用图标</h3>
              <div className="rounded-md border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
                <img
                  src={packageInfo.icon_base64}
                  alt="应用图标"
                  className="w-32 h-32 rounded-2xl shadow-lg"
                />
              </div>
            </div>
          )}

          {/* 基本信息卡片 */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">基本信息</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    包名
                  </p>
                  <p className="font-mono text-sm break-all">
                    {packageInfo.package_name}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    版本名称
                  </p>
                  <p className="font-mono text-sm">{packageInfo.version_name}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    版本号
                  </p>
                  <p className="font-mono text-sm">{packageInfo.version_code}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    文件大小
                  </p>
                  <p className="font-mono text-sm">
                    {packageInfo.file_size_readable}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">SDK 版本</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    最小 SDK
                  </p>
                  <p className="font-mono text-sm">
                    {packageInfo.min_sdk_version}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    目标 SDK
                  </p>
                  <p className="font-mono text-sm">
                    {packageInfo.target_sdk_version}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    编译 SDK
                  </p>
                  <p className="font-mono text-sm">
                    {packageInfo.compile_sdk_version}
                  </p>
                </div>
              </div>
            </div>

            {/* 权限列表 */}
            {packageInfo.permissions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  权限列表 ({packageInfo.permissions.length})
                </h3>
                <div className="rounded-md border p-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {packageInfo.permissions.map((permission, index) => (
                      <div
                        key={index}
                        className="text-sm font-mono bg-muted px-3 py-2 rounded"
                      >
                        {permission}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 组件信息 */}
            <div className="grid gap-4 md:grid-cols-2">
              {packageInfo.activities.length > 0 && (
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Activities ({packageInfo.activities.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {packageInfo.activities.map((activity, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {activity}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {packageInfo.services.length > 0 && (
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Services ({packageInfo.services.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {packageInfo.services.map((service, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {service}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {packageInfo.receivers.length > 0 && (
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Receivers ({packageInfo.receivers.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {packageInfo.receivers.map((receiver, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {receiver}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {packageInfo.providers.length > 0 && (
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Providers ({packageInfo.providers.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {packageInfo.providers.map((provider, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {provider}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
