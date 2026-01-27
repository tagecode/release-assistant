import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRequest } from "@/hooks/use-request";
import { getUserList } from "@/services/user";

export function UsersPage() {
  // 使用 useRequest Hook 获取用户列表
  const { data, loading, error, refresh } = useRequest(
    () => getUserList({ page: 1, pageSize: 10 }),
    { immediate: true }
  );

  // 模拟刷新按钮
  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? "加载中..." : "刷新"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              `共 ${data?.total || 0} 条数据`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.list?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API 使用说明 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">API 使用示例</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. 配置 API 地址：创建 .env 文件，设置 VITE_API_BASE_URL</p>
          <p>2. 在 services/ 目录下定义接口方法</p>
          <p>3. 在组件中使用 useRequest Hook 调用接口</p>
          <p className="font-mono bg-background p-2 rounded mt-2">
            {`const { data, loading, error, refresh } = useRequest(
  () => getUserList({ page: 1 }),
  { immediate: true }
);`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
