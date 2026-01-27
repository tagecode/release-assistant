/**
 * 用户 API 服务示例
 *
 * 使用说明：
 * 1. 在此文件中定义接口相关的类型和请求方法
 * 2. 导出方法供组件使用
 * 3. 在组件中调用方法时会有完整的类型提示
 */

import { get, post, put, del } from "@/lib/request";

// ==================== 类型定义 ====================

/**
 * 用户信息
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 用户列表查询参数
 */
export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
}

/**
 * 用户列表响应
 */
export interface UserListResponse {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 创建用户参数
 */
export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  role: string;
}

/**
 * 更新用户参数
 */
export interface UpdateUserParams {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}

// ==================== API 方法 ====================

/**
 * 获取用户列表
 */
export function getUserList(params: UserListParams) {
  return get<UserListResponse>("/users", params);
}

/**
 * 获取用户详情
 */
export function getUserDetail(id: number) {
  return get<User>(`/users/${id}`);
}

/**
 * 创建用户
 */
export function createUser(data: CreateUserParams) {
  return post<User>("/users", data);
}

/**
 * 更新用户
 */
export function updateUser(data: UpdateUserParams) {
  return put<User>(`/users/${data.id}`, data);
}

/**
 * 删除用户
 */
export function deleteUser(id: number) {
  return del(`/users/${id}`);
}

/**
 * 批量删除用户
 */
export function batchDeleteUsers(ids: number[]) {
  return post("/users/batch-delete", { ids });
}
