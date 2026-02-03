/**
 * Mock 认证服务
 * 模拟后端 API 进行用户注册和登录
 */

import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse
} from "@/types/auth";

// 模拟用户数据库
const mockUsers: User[] = [
  {
    id: "1",
    username: "demo",
    email: "demo@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    createdAt: new Date().toISOString()
  }
];

// 模拟密码存储 (实际应用中应该使用哈希加密)
const mockPasswords: Record<string, string> = {
  "demo": "demo123"
};

// 生成模拟 token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 模拟网络延迟
function delay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 用户登录
 */
export async function loginApi(credentials: LoginRequest): Promise<AuthResponse> {
  await delay(800); // 模拟网络延迟

  const user = mockUsers.find(u => u.username === credentials.username);

  if (!user) {
    throw new Error("用户名或密码错误");
  }

  const storedPassword = mockPasswords[credentials.username];
  if (storedPassword !== credentials.password) {
    throw new Error("用户名或密码错误");
  }

  // 生成 token
  const token = generateToken();

  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600 * 24 * 7, // 7 天
    user
  };
}

/**
 * 用户注册
 */
export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  await delay(1000); // 模拟网络延迟

  // 验证用户名是否已存在
  const existingUser = mockUsers.find(u => u.username === data.username);
  if (existingUser) {
    throw new Error("用户名已存在");
  }

  // 验证邮箱是否已存在
  const existingEmail = mockUsers.find(u => u.email === data.email);
  if (existingEmail) {
    throw new Error("邮箱已被注册");
  }

  // 验证密码确认
  if (data.password !== data.confirmPassword) {
    throw new Error("两次输入的密码不一致");
  }

  // 创建新用户
  const newUser: User = {
    id: Date.now().toString(),
    username: data.username,
    email: data.email,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
    createdAt: new Date().toISOString()
  };

  mockUsers.push(newUser);
  mockPasswords[data.username] = data.password;

  // 自动登录并返回 token
  const token = generateToken();

  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600 * 24 * 7,
    user: newUser
  };
}

/**
 * 获取当前用户信息 (根据 token)
 */
export async function getCurrentUserApi(token: string): Promise<User> {
  await delay(300);

  // 在实际应用中，这里会验证 token 并返回对应的用户
  // Mock 实现中我们返回第一个用户
  if (mockUsers.length > 0) {
    return mockUsers[0];
  }

  throw new Error("用户不存在");
}

/**
 * 退出登录
 */
export async function logoutApi(): Promise<void> {
  await delay(300);
  // Mock 实现中无需额外操作
  // 实际应用中可能需要使 token 失效
}
