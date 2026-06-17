// src/lib/releases.ts
// GitHub Releases 数据获取 + 版本比较（纯逻辑，不依赖 React）

const REPO_OWNER = "junoohoome";
const REPO_NAME = "focus-cat";

export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

/** GitHub Release 的最小必要字段 */
export interface Release {
  tag_name: string;
  name: string | null;
  published_at: string;
  body: string | null;
  html_url: string;
}

/** 仓库尚未发布任何 release（/releases/latest 返回 404）时抛出 */
export class NoReleasesError extends Error {
  constructor() {
    super("No releases published yet");
    this.name = "NoReleasesError";
  }
}

async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) throw new NoReleasesError();
  if (!res.ok) throw new Error(`GitHub API 请求失败（HTTP ${res.status}）`);
  return (await res.json()) as T;
}

/** 获取最新 release；仓库无任何发布时抛 NoReleasesError */
export async function getLatestRelease(): Promise<Release> {
  return ghFetch<Release>("/releases/latest");
}

/**
 * 获取最近若干条 release。仓库无发布时返回空数组（GitHub 返回 200 + []）。
 */
export async function getReleases(limit = 10): Promise<Release[]> {
  return ghFetch<Release[]>(`/releases?per_page=${limit}`);
}

/**
 * 比较两个语义版本号。
 * @returns -1 若 a < b，0 若相等，1 若 a > b
 * 仅比较数字段（major.minor.patch），忽略前导 v 与预发布后缀。
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): number[] => {
    const clean = v.replace(/^v/i, "").split("-")[0].split("+")[0];
    return clean.split(".").map((s) => parseInt(s, 10) || 0);
  };
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}
