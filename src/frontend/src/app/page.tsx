'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './utils/auth';

// APIレスポンスの型定義
interface ApiResponse {
  message: string;
  version?: string;
  env?: string;
}

export default function Home() {
  // 認証状態の取得
  const { isAuthenticated, isLoading: authLoading, userEmail } = useAuth();
  
  // APIレスポンスを保存するstate
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // APIからデータを取得する関数
  const fetchApiData = async () => {
    setIsLoading(true);
    setError(null);
      
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
          Hello <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Next.js + Go + Cognito</span> アプリケーション
        </h1>

        {/* 認証状態表示セクション */}
        <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md w-full max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">認証状態</h2>
          
          {authLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : isAuthenticated ? (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-300 font-medium">ログイン済み</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">ユーザー: {userEmail}</p>
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">ログインしていません</p>
              <div className="mt-4 flex justify-center space-x-4">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
                >
                  新規登録
                </Link>
              </div>
            </div>
          )}
        </div>

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

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          <Link 
            href="/users" 
            className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              ユーザー一覧 &rarr;
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              登録されているユーザー情報を表示します
            </p>
          </Link>

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
          Next.js + Go + Cognito Fullstack Application
        </p>
      </footer>
    </div>
  );
}
