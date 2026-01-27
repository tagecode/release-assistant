import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

export function SettingsPage() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">设置</h1>
        <p className="text-muted-foreground">管理应用程序设置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tauri 命令测试</CardTitle>
          <CardDescription>
            测试前端与 Rust 后端的通信
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="输入名称..."
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Button onClick={greet}>发送问候</Button>
          {greetMsg && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">{greetMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
