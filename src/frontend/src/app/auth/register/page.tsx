'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthRequest, registerUser, confirmRegistration } from '../../utils/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<AuthRequest>({
    email: '',
    password: '',
    name: '',
  });
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 入力フィールドの変更を処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ユーザー登録を処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await registerUser(formData);
      
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || 'ユーザー登録リクエストが送信されました。確認コードをメールで受け取ります。');
        setIsRegistered(true);
      }
    } catch (err) {
      setError('登録処理中にエラーが発生しました');
      console.error('登録エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 確認コードの検証を処理
  const handleConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await confirmRegistration(formData.email, confirmationCode);
      
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(result.message || '確認が完了しました。ログインできます。');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (err) {
      setError('確認処理中にエラーが発生しました');
      console.error('確認エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          {isRegistered ? '確認コードを入力' : 'ユーザー登録'}
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg text-green-700 dark:text-green-400 mb-4">
            {message}
          </div>
        )}

        {!isRegistered ? (
          // 登録フォーム
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="example@example.com"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名前
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="山田 太郎"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="8文字以上のパスワード"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                最低8文字のパスワードを入力してください
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? '処理中...' : '登録する'}
            </button>
          </form>
        ) : (
          // 確認コードフォーム
          <form onSubmit={handleConfirmation}>
            <div className="mb-6">
              <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                確認コード
              </label>
              <input
                type="text"
                id="confirmationCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="メールに送信された確認コード"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.email}に送信された確認コードを入力してください
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? '処理中...' : '確認する'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            既にアカウントをお持ちですか？{' '}
            <Link
              href="/auth/login"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 