'use client';

// 这个文件的作用：把所有 Client 端 Provider 集中在这里
// 这样 layout.tsx 就可以继续保持 Server Component，不影响 SSR 性能
// 以后如果加 React Query、Toast 等 Provider，都统一加在这里

import { AuthProvider } from './contexts/AuthContext';
import { OfflineBanner } from './components/OfflineBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfflineBanner />
      {children}
    </AuthProvider>
  );
}