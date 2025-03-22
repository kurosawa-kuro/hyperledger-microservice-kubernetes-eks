'use client';

import { useState, useEffect } from 'react';

// APIレスポンスの型定義
interface ApiResponse {
  message: string;
  version?: string;
  env?: string;
}

export default function Home() {
  // APIレスポンスを保存するstate
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // APIからデータを取得する関数
  const fetchApiData = async () => {
    setIsLoading(true);
    setError(null);

      // 環境変数が設定されていれば使用、なければ同じドメインのAPIを使用（本番環境用）
      // 明示的にlocalhostを指定する場合はNEXT_PUBLIC_API_URLで設定
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      console.log('API URL:', apiUrl);
      
      // 同じALBドメインのAPI URLを構築
      const origin = window.location.hostname;
      const endpoint = `http://${origin}:8080/api/v1/hello`;
      
      console.log('APIエンドポイント:', endpoint);

    try {

      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`APIリクエストが失敗しました: ${response.status}`);
      }
      
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      console.error('API取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // コンポーネントマウント時に一度だけAPIを呼び出す
  useEffect(() => {
    fetchApiData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Hello <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Next.js + Go</span> アプリケーション
        </h1>

        {/* APIレスポンス表示セクション */}
        <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md w-full max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">GoバックエンドAPIレスポンス</h2>
          
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">
              <p>エラー: {error}</p>
              <button 
                onClick={fetchApiData}
                className="mt-3 bg-red-100 dark:bg-red-800 px-4 py-2 rounded-md font-medium text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                再試行
              </button>
            </div>
          )}
          
          {!isLoading && !error && apiResponse && (
            <div className="text-left">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
              <div className="mt-4 text-gray-600 dark:text-gray-400">
                <p>メッセージ: {apiResponse.message}</p>
                {apiResponse.version && <p>APIバージョン: {apiResponse.version}</p>}
                {apiResponse.env && <p>環境: {apiResponse.env}</p>}
              </div>
            </div>
          )}
          
          <button 
            onClick={fetchApiData}
            className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '読み込み中...' : 'APIを再読み込み'}
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <a 
            href="https://nextjs.org/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              Next.js ドキュメント &rarr;
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Next.jsの機能と使い方について詳しく学ぶ
            </p>
          </a>

          <a 
            href="https://gin-gonic.com/docs/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              Gin ドキュメント &rarr;
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              GoのGinフレームワークについて詳しく学ぶ
            </p>
          </a>
        </div>
      </main>

      <footer className="w-full mt-12 border-t border-gray-200 dark:border-gray-700 py-6 flex justify-center">
        <p className="text-gray-600 dark:text-gray-400">
          Next.js + Go Fullstack Application
        </p>
      </footer>
    </div>
  );
}
