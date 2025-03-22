'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function RefreshButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleRefresh = () => {
    setIsLoading(true);
    
    // タイムスタンプを使用して強制的に再読み込み
    const timestamp = new Date().getTime();
    router.push(`${pathname}?refresh=${timestamp}`);
    
    // Next.jsのルーターを更新
    router.refresh();
    
    // 少し遅延を入れてボタンの状態を戻す
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <button 
      onClick={handleRefresh}
      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
      disabled={isLoading}
    >
      {isLoading ? '読み込み中...' : 'データを更新'}
    </button>
  );
} 