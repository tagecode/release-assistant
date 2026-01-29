export function IconProcessPage() {
  return (
    <div className="space-y-8">
      {/* 页面标题区域 */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">APP图标处理</h1>
        <p className="text-muted-foreground text-lg">
          提取、处理和管理应用图标
        </p>
      </div>
      
      {/* 内容卡片区域 */}
      <div className="grid gap-6">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">图标处理工具</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              提供以下图标处理功能：
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>图标提取 - 从APK/IPA中提取应用图标</li>
              <li>尺寸调整 - 批量调整图标尺寸</li>
              <li>格式转换 - PNG、JPG、WebP等格式互转</li>
              <li>圆角处理 - 添加圆角效果</li>
              <li>背景处理 - 添加或移除背景</li>
            </ul>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">预览区域</h2>
          <p className="text-muted-foreground">
            处理后的图标将在此处实时预览，支持不同尺寸和样式的展示。
          </p>
        </div>
      </div>
    </div>
  );
}
