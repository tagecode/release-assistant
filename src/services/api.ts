/**
 * 通用 API 服务
 *
 * 包含项目中常用的 API 方法示例
 */

import { get, post, put } from "@/lib/request";

// ==================== 认证相关 ====================

/**
 * 登录
 */
export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export function login(data: LoginParams) {
  return post<LoginResponse>("/auth/login", data);
}

/**
 * 登出
 */
export function logout() {
  return post("/auth/logout");
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
  return get<LoginResponse["user"]>("/auth/me");
}

// ==================== 仪表盘相关 ====================

/**
 * 统计数据
 */
export interface DashboardStats {
  userCount: number;
  orderCount: number;
  revenue: number;
  growth: number;
}

export function getDashboardStats() {
  return get<DashboardStats>("/dashboard/stats");
}

/**
 * 获取图表数据
 */
export interface ChartDataPoint {
  date: string;
  value: number;
}

export function getChartData(days: number = 7) {
  return get<ChartDataPoint[]>("/dashboard/chart", { days });
}

// ==================== 设置相关 ====================

/**
 * 系统配置
 */
export interface SystemConfig {
  siteName: string;
  siteUrl: string;
  allowRegistration: boolean;
  maxUsers: number;
}

export function getSystemConfig() {
  return get<SystemConfig>("/settings/config");
}

export function updateSystemConfig(data: Partial<SystemConfig>) {
  return put<SystemConfig>("/settings/config", data);
}
