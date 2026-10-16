import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rag_session";
/** 会话有效期：30 天 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionPayload = {
  /** users.id，数据隔离的唯一依据 */
  sub: string;
  /** GitHub 用户名 */
  login: string;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * 本模块只依赖 jose 与 Web Crypto，**不 import next/headers**，
 * 因此 middleware（Edge Runtime）也能安全调用。
 */
export function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("缺少 AUTH_SECRET 环境变量");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    login: payload.login,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

/** 校验会话；过期或签名不符一律返回 null */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      login: typeof payload.login === "string" ? payload.login : "",
      name: typeof payload.name === "string" ? payload.name : null,
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

/** 从 Cookie 头里取指定值；middleware 与 Route Handler 通用 */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

/** middleware 用：直接基于 Request 读取会话 */
export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  return verifySession(token);
}
