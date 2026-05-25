import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // 明确告诉 Turbopack 当前项目的根目录就是 front_end 文件夹
    // 避免 Next.js 错误地将 /Users/emulate/ 识别为工作区根目录
    root: __dirname,
  },
  
  // 解决 ngrok 跨域访问开发服务器的问题
  allowedDevOrigins: [
    // 你当前使用的 ngrok 临时域名
    'rashly-subpeduncled-vada.ngrok-free.dev',
    
    // 推荐：添加通配符匹配所有 ngrok 免费域名
    // 这样每次 ngrok 生成新域名时都不需要修改配置
    '*.ngrok-free.dev',
    
    // 可选：添加局域网IP访问支持（方便手机/其他设备测试）
    // '192.168.1.*:3000',
  ],
};

export default nextConfig;