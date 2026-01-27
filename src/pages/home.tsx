import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">欢迎使用 Tauri + React</h1>
      <Card>
        <CardHeader>
          <CardTitle>开始使用</CardTitle>
          <CardDescription>
            这是一个基于 Tauri 2 + React + TypeScript + shadcn/ui 的桌面应用模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            点击左侧导航菜单切换不同的页面。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
