/**
 * 共通のfetchラッパー関数
 * 
 * @param url リクエスト先URL
 * @param options fetchオプション
 * @returns レスポンスデータ
 */
export async function fetcher<T>(
  url: string, 
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // API URLの構築
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const apiUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    // デフォルトのオプションをマージ
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // リクエスト実行
    const response = await fetch(apiUrl, mergedOptions);
    
    if (!response.ok) {
      // エラーレスポンスの処理
      let errorMessage = `APIリクエストが失敗しました: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // JSONパースに失敗した場合はデフォルトエラーを使用
      }
      throw new Error(errorMessage);
    }
    
    // 成功レスポンスの処理
    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    // 例外ハンドリング
    console.error('API呼び出しエラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
    };
  }
} 