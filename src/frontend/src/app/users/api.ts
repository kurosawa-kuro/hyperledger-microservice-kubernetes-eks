import { fetcher } from '@/app/utils/fetcher';

/**
 * ユーザーデータの型定義
 */
export interface User {
  id: number;
  created_at: string;
  updated_at: string;
  email: string;
  name: string;
  role: string;
}

/**
 * ユーザー登録フォームの型定義
 */
export interface UserRegistrationForm {
  email: string;
  sub: string;
}

/**
 * API応答の成功型定義
 */
export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

/**
 * API応答の削除成功型定義
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
}

/**
 * ユーザー一覧を取得するAPI
 * 
 * @returns ユーザー一覧
 */
export async function getUsersApi() {
  return fetcher<User[]>('/api/v1/users');
}

/**
 * ユーザーを登録するAPI
 * 
 * @param formData ユーザー登録データ
 * @returns 登録結果
 */
export async function registerUserApi(formData: UserRegistrationForm) {
  return fetcher<ApiSuccessResponse<User>>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

/**
 * ユーザーを削除するAPI
 * 
 * @param userId 削除するユーザーID
 * @returns 削除結果
 */
export async function deleteUserApi(userId: number) {
  return fetcher<DeleteResponse>(`/api/v1/users/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * ユーザー情報を更新するAPI
 * 
 * @param userId 更新するユーザーID
 * @param userData 更新データ
 * @returns 更新結果
 */
export async function updateUserApi(userId: number, userData: Partial<User>) {
  return fetcher<User>(`/api/v1/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
} 