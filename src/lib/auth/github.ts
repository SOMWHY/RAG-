import { SignJWT, jwtVerify } from "jose";
import { getSecretKey } from "@/lib/auth/session";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

export type GithubProfile = {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`缺少 ${name} 环境变量`);
  return value;
}

/**
 * 回调基准域名。Vercel 预览环境每次域名都不同，而 GitHub OAuth App 只能登记固定回调地址，
 * 因此用 AUTH_REDIRECT_BASE_URL 把回调固定到生产域名；未设置时按当前请求域名走（本地开发）。
 */
function getRedirectBase(request: Request): string {
  const raw = process.env.AUTH_REDIRECT_BASE_URL?.trim() || new URL(request.url).origin;
  return raw.replace(/\/+$/, "");
}

export function getRedirectUri(request: Request): string {
  return `${getRedirectBase(request)}/api/auth/github/callback`;
}

/** 登录成功后回跳的域名，必须与签发 Cookie 的域名一致，否则会话带不回去 */
export function getReturnBase(request: Request): string {
  return getRedirectBase(request);
}

export function buildAuthorizeUrl(request: Request, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("AUTH_GITHUB_ID"),
    redirect_uri: getRedirectUri(request),
    scope: "read:user",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * state 用签名 JWT 而不是 Cookie：
 * 预览环境跳转时的发起域与回调域可能不同，Cookie 带不过去，会导致校验必然失败。
 * 签名保证 state 由本站签发且 10 分钟内有效。
 */
export async function createState(): Promise<string> {
  return new SignJWT({ nonce: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecretKey());
}

export async function verifyState(state: string | null): Promise<boolean> {
  if (!state) return false;
  try {
    await jwtVerify(state, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("AUTH_GITHUB_ID"),
      client_secret: requireEnv("AUTH_GITHUB_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub 换取 token 失败：HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      `GitHub 未返回 access_token：${data.error ?? "未知错误"} ${data.error_description ?? ""}`.trim(),
    );
  }

  return data.access_token;
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const response = await fetch(USER_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "rag-project",
    },
  });

  if (!response.ok) {
    throw new Error(`读取 GitHub 用户信息失败：HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
  };

  if (!data.id || !data.login) {
    throw new Error("GitHub 用户信息缺少 id 或 login");
  }

  return {
    githubId: String(data.id),
    login: data.login,
    name: data.name ?? null,
    avatarUrl: data.avatar_url ?? null,
  };
}
