import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Shield, AlertCircle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface SignatureInfo {
  version: string;
  present: boolean;
  details?: string;
  certificate?: {
    issuer: string;
    subject: string;
    valid_from: string;
    valid_to: string;
    signature_algorithm: string;
  };
}

interface ApkSignatureResult {
  file_name: string;
  file_size: string;
  signatures: {
    v1?: SignatureInfo;
    v2?: SignatureInfo;
    v3?: SignatureInfo;
    v4?: SignatureInfo;
  };
  warnings: string[];
  errors: string[];
}

export function ApkSignaturePage() {
  const [apkPath, setApkPath] = useState<string>("");
  const [result, setResult] = useState<ApkSignatureResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "APK",
          extensions: ["apk"]
        }]
      });

      if (selected && typeof selected === "string") {
        setApkPath(selected);
        setResult(null);
        setError(null);
      }
    } catch (err) {
      console.error("选择文件失败:", err);
    }
  };

  const handleCheck = async () => {
    if (!apkPath) return;

    setIsChecking(true);
    setError(null);

    try {
      const signatureResult = await invoke<ApkSignatureResult>("verify_apk_signature", {
        apkPath
      });

      setResult(signatureResult);
    } catch (err) {
      console.error("签名校验失败:", err);
      setError(err as string);
    } finally {
      setIsChecking(false);
    }
  };

  const SignatureBadge = ({ version, info }: { version: string; info?: SignatureInfo }) => {
    if (!info) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 bg-muted/30">
          <XCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium">v{version}</div>
            <div className="text-xs text-muted-foreground">未签名</div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${
        info.present
          ? "border-green-500/50 bg-green-500/5"
          : "border-red-500/50 bg-red-500/5"
      }`}>
        {info.present ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div className="flex-1 space-y-2">
          <div>
            <div className="font-medium">APK Signature v{version}</div>
            <div className={`text-xs ${info.present ? "text-green-600" : "text-red-600"}`}>
              {info.present ? "已签名" : "签名无效"}
            </div>
          </div>

          {info.details && (
            <div className="text-sm text-muted-foreground">
              {info.details}
            </div>
          )}

          {info.certificate && (
            <div className="space-y-1 text-xs text-muted-foreground bg-card rounded p-2 mt-2">
              <div><strong>颁发者:</strong> {info.certificate.issuer}</div>
              <div><strong>主体:</strong> {info.certificate.subject}</div>
              <div><strong>有效期:</strong> {info.certificate.valid_from} 至 {info.certificate.valid_to}</div>
              <div><strong>算法:</strong> {info.certificate.signature_algorithm}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">APK 签名校验</h1>
        <p className="text-muted-foreground text-lg">
          校验 APK 应用的签名信息 (v1/v2/v3/v4)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 文件选择和操作 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>选择 APK 文件</CardTitle>
              <CardDescription>选择需要校验签名的 APK 文件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSelectFile}
                variant="outline"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                选择 APK 文件
              </Button>

              {apkPath && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {apkPath.split(/[/\\]/).pop()}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {apkPath}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleCheck}
                disabled={!apkPath || isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    校验中...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    开始校验
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 签名版本说明 */}
          <Card>
            <CardHeader>
              <CardTitle>签名版本说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">v1 签名 (JAR)</p>
                  <p>基于 JAR 签名,使用 META-INF 目录,兼容性最好但安全性较低</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">v2 签名 (APK)</p>
                  <p>对整个 APK 进行签名,验证速度快,Android 7.0+ 支持</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">v3 签名</p>
                  <p>支持密钥轮换和更多属性,Android 9.0+ 支持</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">v4 签名</p>
                  <p>基于流式验证,Android 11+ 支持,需配合 v2/v3 使用</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧: 校验结果 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>校验结果</CardTitle>
              <CardDescription>
                {result ? `已完成校验: ${result.file_name}` : "等待校验"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <div className="font-medium text-destructive">校验失败</div>
                      <div className="text-sm text-destructive/80 mt-1">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-muted/30 p-8">
                  <div className="text-center text-muted-foreground">
                    <Shield className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p>选择 APK 文件并点击"开始校验"</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* 文件信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-card p-4">
                      <div className="text-sm text-muted-foreground">文件名</div>
                      <div className="font-medium">{result.file_name}</div>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <div className="text-sm text-muted-foreground">文件大小</div>
                      <div className="font-medium">{result.file_size}</div>
                    </div>
                  </div>

                  {/* 签名版本 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">签名版本</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SignatureBadge version="1" info={result.signatures.v1} />
                      <SignatureBadge version="2" info={result.signatures.v2} />
                      <SignatureBadge version="3" info={result.signatures.v3} />
                      <SignatureBadge version="4" info={result.signatures.v4} />
                    </div>
                  </div>

                  {/* 警告和错误 */}
                  {(result.warnings.length > 0 || result.errors.length > 0) && (
                    <div className="space-y-4">
                      {result.warnings.length > 0 && (
                        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="font-medium text-yellow-700">
                              警告 ({result.warnings.length})
                            </div>
                          </div>
                          <ul className="space-y-1 text-sm text-yellow-700/80 ml-8">
                            {result.warnings.map((warning, index) => (
                              <li key={index} className="list-disc">
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.errors.length > 0 && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                            <div className="font-medium text-destructive">
                              错误 ({result.errors.length})
                            </div>
                          </div>
                          <ul className="space-y-1 text-sm text-destructive/80 ml-8">
                            {result.errors.map((err, index) => (
                              <li key={index} className="list-disc">
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 建议 */}
                  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-blue-700 mb-2">安全建议</div>
                        <ul className="space-y-1 text-sm text-blue-700/80">
                          <li>• 推荐同时使用 v2 和 v3 签名以获得最佳兼容性和安全性</li>
                          <li>• v4 签名可以提供更快的验证速度,但需要配合 v2/v3 使用</li>
                          <li>• 避免只使用 v1 签名,因为它的安全性较低</li>
                          <li>• 检查证书有效期,确保签名未过期</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
