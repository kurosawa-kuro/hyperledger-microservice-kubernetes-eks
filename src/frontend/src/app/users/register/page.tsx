'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser } from '../actions';
import { UserRegistrationForm } from '../api';

export default function RegisterUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<UserRegistrationForm>({
    email: '',
    sub: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // フォーム入力の変更を処理する関数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // フォーム送信を処理する関数
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // 入力バリデーション
    if (!formData.email || !formData.sub) {
      setError('メールアドレスとsubは必須項目です');
      setIsSubmitting(false);
      return;
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('有効なメールアドレスを入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      // Server Actionを呼び出し
      const result = await registerUser(formData);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('登録成功:', result.data);
      setSuccess(true);
      
      // フォームをリセット
      setFormData({
        email: '',
        sub: ''
      });
      
      // 3秒後にユーザー一覧ページにリダイレクト
      setTimeout(() => {
        // クライアントサイドナビゲーションのキャッシュをクリア
        router.refresh();
        
        // 新しいページへ遷移（クエリパラメータを追加して強制的に再読み込み）
        const timestamp = new Date().getTime();
        router.push(`/users?refresh=${timestamp}`);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      console.error('ユーザー登録エラー:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">ユーザー登録</h1>
          <Link href="/users" className="text-blue-500 hover:text-blue-600 transition-colors">
            ユーザー一覧に戻る
          </Link>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg text-green-700 dark:text-green-400 mb-6">
            <p>ユーザーが正常に登録されました。ユーザー一覧ページにリダイレクトします...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400 mb-6">
            <p>エラー: {error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="sub" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sub (認証ID)
              </label>
              <input
                type="text"
                id="sub"
                name="sub"
                value={formData.sub}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="認証IDを入力"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                例: 17441a88-60f1-709b-b7e3-3e3173aca5d62
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登録中...' : 'ユーザーを登録'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 