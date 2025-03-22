'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ユーザーデータの型定義
interface User {
  id: number;
  created_at: string;
  updated_at: string;
  email: string;
  name: string;
  role: string;
}

export default function UsersPage() {
  // ユーザーデータを保存するstate
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // APIからユーザーデータを取得する関数
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
      
    // 同じALBドメインのAPI URLを構築
    const origin = window.location.hostname;
    const endpoint = `http://${origin}:8080/api/v1/users`;
    
    console.log('APIエンドポイント:', endpoint);

    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`APIリクエストが失敗しました: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      console.error('ユーザーデータ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // コンポーネントマウント時に一度だけAPIを呼び出す
  useEffect(() => {
    fetchUsers();
  }, []);

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">ユーザー一覧</h1>
          <Link href="/" className="text-blue-500 hover:text-blue-600 transition-colors">
            ホームに戻る
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">
            <p>エラー: {error}</p>
            <button 
              onClick={fetchUsers}
              className="mt-3 bg-red-100 dark:bg-red-800 px-4 py-2 rounded-md font-medium text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              再試行
            </button>
          </div>
        )}

        {!isLoading && !error && users.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">メールアドレス</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">名前</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ロール</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">作成日時</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">更新日時</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && !error && users.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg text-yellow-700 dark:text-yellow-400">
            <p>ユーザーが見つかりませんでした。</p>
          </div>
        )}

        <div className="mt-6">
          <button 
            onClick={fetchUsers}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '読み込み中...' : 'データを更新'}
          </button>
        </div>
      </div>
    </div>
  );
} 