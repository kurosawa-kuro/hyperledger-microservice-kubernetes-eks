import { useState, useEffect } from 'react';

// 認証関連の型定義
export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  message?: string;
  error?: string;
}

// API URLの取得
export const getApiUrl = () => {
  // 開発環境の場合はlocalhostを使用
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }
  // 本番環境の場合は同じALBドメインを使用
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return `http://${hostname}:8080`;
};

// ユーザー登録
export const registerUser = async (userData: AuthRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || '登録に失敗しました');
    }
    
    return data;
  } catch (error) {
    console.error('登録エラー:', error);
    return {
      error: error instanceof Error ? error.message : '登録中に予期せぬエラーが発生しました'
    };
  }
};

// 登録確認コードの検証
export const confirmRegistration = async (email: string, code: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        confirmation_code: code,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || '確認に失敗しました');
    }
    
    return data;
  } catch (error) {
    console.error('確認エラー:', error);
    return {
      error: error instanceof Error ? error.message : '確認中に予期せぬエラーが発生しました'
    };
  }
};

// ログイン
export const loginUser = async (credentials: AuthRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // クッキーを送受信するために必要
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.details || 'ログインに失敗しました');
    }
    
    return data;
  } catch (error) {
    console.error('ログインエラー:', error);
    return {
      error: error instanceof Error ? error.message : 'ログイン中に予期せぬエラーが発生しました'
    };
  }
};

// ログアウト
export const logoutUser = async (): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include', // クッキーを送信するために必要
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '予期せぬエラーが発生しました');
    }
    
    return data;
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return {
      error: error instanceof Error ? error.message : 'ログアウト中に予期せぬエラーが発生しました'
    };
  }
};

// トークンの更新
export const refreshTokens = async (email: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      credentials: 'include', // クッキーを送受信するために必要
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '認証の更新に失敗しました');
    }
    
    return data;
  } catch (error) {
    console.error('トークン更新エラー:', error);
    return {
      error: error instanceof Error ? error.message : 'トークン更新中に予期せぬエラーが発生しました'
    };
  }
};

// 認証状態を管理するカスタムフック
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // ローカルストレージからユーザー情報を取得
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // ログイン処理
  const login = async (credentials: AuthRequest) => {
    const result = await loginUser(credentials);
    if (!result.error) {
      localStorage.setItem('userEmail', credentials.email);
      setUserEmail(credentials.email);
      setIsAuthenticated(true);
    }
    return result;
  };

  // ログアウト処理
  const logout = async () => {
    const result = await logoutUser();
    if (!result.error) {
      localStorage.removeItem('userEmail');
      setUserEmail(null);
      setIsAuthenticated(false);
    }
    return result;
  };

  return {
    isAuthenticated,
    isLoading,
    userEmail,
    login,
    logout,
    register: registerUser,
    confirm: confirmRegistration,
    refreshTokens,
  };
}; 