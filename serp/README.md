# serp：看 Google 搜索结果页前 10 都是谁

在 Google 上搜一个词，拿回第一页的自然结果（现在一般 8 条左右，最多取 10 条）：网址、域名、标题、摘要，以及网站类型（B2B 平台、零售电商、论坛问答、社媒、百科、其它网站）。
用的是用户自己的 Chrome（Annulo 的 `ctx.browser.open({ profile: '@user' })`，要装 Annulo 浏览器插件）：用户的网络能上 Google，用户平时用的浏览器也不容易被当成机器人。

典型用途：判断一个关键词能不能做起来（前 10 里论坛、B2B 平台多，说明 Google 没找到像样的专门页面；被电商、百科霸屏就难）；看自己排第几、竞品排第几。

| 搜索引擎 | 验证于 | 说明 |
|---|---|---|
| Google | 2026-10-22 | 只取自然结果（广告、AI 回答、地图不算）；`hl` 界面语言、`gl` 国家，`pws=0` 尽量不按用户个性化；一个词 3 秒左右 |

**这是参考代码，不保证一直能用。** Google 改版就会坏，坏了照 [MAINTAIN.md](MAINTAIN.md) 修：先看这里有没有更新，没有就自己排查。

**别查太快、太多。** 一次几十个词、每个之间歇几秒（`searchMany` 默认 6~10 秒）。查多了 Google 会要人机验证，`searchMany` 碰到就停下。

## 放进项目

```sh
git clone --depth 1 https://github.com/annulo/references /tmp/annulo-references
cp /tmp/annulo-references/serp/local/*.ts <项目>/local/
```

复制时在 `serp.ts` 开头加一行记下是哪个提交（`git -C /tmp/annulo-references rev-parse --short HEAD`）：

```ts
// 复制自 annulo/references@<提交> serp/
```

## 用

第一次用时，用户的 Chrome 会弹一个页面问「允许 Annulo 在 www.google.com 上操作吗」，要用户点「允许」（只有页面上点的、`annulo run` 跑的会弹；后台定时任务碰到没允许的网站直接报错）。

```sh
annulo run serp.search --input '{"q":"led grow light manufacturer","gl":"us","hl":"en"}'
annulo run serp.test                       # 搜一个固定的词，看取不取得到结果
```

本机函数里：

```ts
import { search, searchMany } from './serp'

const r = await search({ q, hl: 'en', gl: 'us' }, ctx)
// r.results  [{ position, url, domain, kind, title, snippet }]：kind 是 b2b / marketplace / forum / social / reference / site
// r.ads      页面上的广告条数
// r.url      结果页的地址

// 一次查多个：同一个窗口，每个之间歇几秒，碰到验证码停下
const { results, errors, stopped } = await searchMany({ queries, hl, gl }, ctx, (q, r, err) => { /* 每查完一个：存表、报进度 */ })
```

出错时 `throw` 的 `Error` 带 `code`：

| code | 意思 | 怎么办 |
|---|---|---|
| `captcha` | Google 要人机验证 | 停下，让用户在那个 Chrome 里打开 google.com 搜一次、做完验证，过一会儿再查 |
| `consent` | Cookie 同意页（欧盟地区） | 让用户在那个 Chrome 里打开 google.com 点一次 |
| `changed` | 页面和代码对不上了 | 照 MAINTAIN.md 排查 |

网站类型只按域名判断（`_serp_common.ts` 的 `KINDS`），列表是常见的外贸、电商、内容平台，不全；要加照格式往里加。
