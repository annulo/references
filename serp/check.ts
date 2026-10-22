// 离线检查解析：用 fixtures/ 里存的真实结果页原始条目（_serp_google.ts 的 extract 在页面里取到的）跑 parse，不用打开浏览器。
// 改了 parse 先跑这个；Google 改版后存一份新的进 fixtures/（见 MAINTAIN.md）。
//
//   npx tsx serp/check.ts
import { readFileSync } from 'node:fs'
import { parse } from './local/_serp_google'
import { kindOf } from './local/_serp_common'

const cases: { q: string; raw: any }[] = JSON.parse(readFileSync(new URL('fixtures/google-2026-10-22.json', import.meta.url), 'utf8'))
let bad = 0
for (const { q, raw } of cases) {
  const r = parse(raw)
  const problems: string[] = []
  if (r.length < 5) problems.push(`只取到 ${r.length} 条`)
  if (r.some((x) => !x.url || !x.title || !x.domain)) problems.push('有结果缺网址、标题或域名')
  if (r.some((x) => /(^|\.)google\./.test(x.domain))) problems.push('混进了 Google 自己的链接')
  if (new Set(r.map((x) => x.url)).size !== r.length) problems.push('有重复的网址')
  if (r.some((x, i) => x.position !== i + 1)) problems.push('编号不连续')
  console.log(problems.length ? '✗' : '✓', q, `${r.length} 条：`, r.map((x) => `${x.domain}[${kindOf(x.domain)}]`).join(' '), problems.join('；'))
  bad += problems.length ? 1 : 0
}
process.exit(bad ? 1 : 0)
