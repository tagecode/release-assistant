import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">仪表盘</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>统计卡片 1</CardTitle>
            <CardDescription>数据概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>统计卡片 2</CardTitle>
            <CardDescription>数据概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,678</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>统计卡片 3</CardTitle>
            <CardDescription>数据概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9,012</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
