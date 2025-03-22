'use server';

import { revalidatePath } from 'next/cache';
import { getUsersApi, registerUserApi,   UserRegistrationForm } from './api';

/**
 * ユーザー一覧を取得するServer Action
 * 
 * @returns ユーザー一覧データ
 */
export async function getUsers() {
  return await getUsersApi();
}

/**
 * ユーザー登録を処理するServer Action
 * 
 * @param formData ユーザー登録フォームデータ
 * @returns 登録処理の結果
 */
export async function registerUser(formData: UserRegistrationForm) {
  const result = await registerUserApi(formData);
  
  // 登録成功時にユーザー一覧ページのキャッシュを無効化
  if (result.success) {
    revalidatePath('/users');
  }
  
  return result;
} 