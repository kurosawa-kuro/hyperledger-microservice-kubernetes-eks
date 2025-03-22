'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    setIsLoading(true);
    // 現在のページをリフレッシュ
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