/**
 * 用户注册页面
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User, Mail, AlertCircle, UserPlus } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return "请输入用户名";
    }

    if (formData.username.length < 3) {
      return "用户名至少需要3个字符";
    }

    if (!formData.email.trim()) {
      return "请输入邮箱";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "请输入有效的邮箱地址";
    }

    if (!formData.password) {
      return "请输入密码";
    }

    if (formData.password.length < 6) {
      return "密码至少需要6个字符";
    }

    if (formData.password !== formData.confirmPassword) {
      return "两次输入的密码不一致";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
      // 注册成功后导航到主页
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* 返回首页按钮 */}
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            应用发布助手
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            创建一个新账户
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              用户注册
            </CardTitle>
            <CardDescription>
              填写以下信息创建新账户
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pl-9"
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-muted-foreground">至少3个字符</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pl-9"
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">至少6个字符</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="pl-9"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "注册中..." : "注册"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                已有账户？{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  立即登录
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>© 2024 Release Assistant. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
