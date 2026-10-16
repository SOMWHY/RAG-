export type MentionToken = {
  /** "@" 在文本中的下标 */
  start: number;
  /** "@" 之后到光标之间的查询词，不含 "@" */
  query: string;
};

/**
 * 判断光标处是否正在输入 "@提及"。
 *
 * 三条都要满足才认为在提及（任一不满足就不弹列表）：
 *
 * 1. 光标前存在 "@"
 * 2. "@" 位于开头，或前一个字符是空白 —— 否则 `a@b`、`foo@bar.com` 会误触发
 * 3. "@" 到光标之间没有空白 —— 输入空格表示查询词已结束
 */
export function detectMention(value: string, caret: number): MentionToken | null {
  const upto = value.slice(0, Math.max(0, Math.min(caret, value.length)));
  const at = upto.lastIndexOf("@");
  if (at === -1) return null;

  const before = at > 0 ? upto[at - 1] : "";
  if (before && !/\s/.test(before)) return null;

  const query = upto.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { start: at, query };
}

/** 命中后需要被替换掉的文本区间：[start, end) */
export function mentionRange(token: MentionToken): { start: number; end: number } {
  return { start: token.start, end: token.start + 1 + token.query.length };
}

/** 把命中区间从文本中删掉，用于选中文档后清除 "@查询词" */
export function stripMention(value: string, token: MentionToken): string {
  const { start, end } = mentionRange(token);
  return value.slice(0, start) + value.slice(end);
}
