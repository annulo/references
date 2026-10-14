// 离线检查解析：用 fixtures/ 里存的真实接口流跑各网站的 parse，不用打开浏览器。
// 改了某个网站的 parse 先跑这个；网站改版后存一份新的流进 fixtures/（见 MAINTAIN.md）。
//
//   npx tsx aichat/check.ts
import { readFileSync } from 'node:fs'
import { parse as chatgpt } from './local/_aichat_chatgpt'
import { parse as deepseek } from './local/_aichat_deepseek'
import { parse as doubao } from './local/_aichat_doubao'
import { parse as kimi } from './local/_aichat_kimi'
import { parse as yuanbao } from './local/_aichat_yuanbao'

// 第四项：这个网站拿不拿得到搜索词（ChatGPT、元宝拿不到）
const cases: [string, (t: string) => any, string, boolean?][] = [
  ['chatgpt', chatgpt, 'fixtures/chatgpt.json', false],
  ['deepseek', deepseek, 'fixtures/deepseek.txt'],
  ['doubao', doubao, 'fixtures/doubao.txt'],
  ['kimi', kimi, 'fixtures/kimi.txt'],
  ['yuanbao', yuanbao, 'fixtures/yuanbao.txt', false],
]

let bad = 0
for (const [site, parse, file, queries] of cases) {
  const r = parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
  const problems: string[] = []
  if (r.answer.length < 20) problems.push('回答是空的或太短')
  if (queries !== false && !r.searches.length) problems.push('没有搜索词')
  if (!r.sources.length) problems.push('没有网页')
  if (!r.sources.some((s: any) => s.cited)) problems.push('回答里的引用没对上网页')
  if (/<REF>|\[citation:|@mark_underline|[\ue200-\ue202]/.test(r.answer)) problems.push('回答里还有没换掉的标记')
  console.log(problems.length ? '✗' : '✓', site, `回答 ${r.answer.length} 字，搜索词 ${r.searches.length}，网页 ${r.sources.length}，引用 ${r.sources.filter((s: any) => s.cited).length}`, problems.join('；'))
  bad += problems.length ? 1 : 0
}
process.exit(bad ? 1 : 0)
