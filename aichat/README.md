# aichat：在 AI 网页上提问

在 ChatGPT、DeepSeek、豆包、Kimi、腾讯元宝这些 AI 的网页版上问一个问题，拿回回答、引用的网页、网站搜了哪些词。
用的是用户自己 Chrome 里已经登好的账号（Annulo 的 `ctx.browser.open({ profile: '@user' })`，要装 Annulo 浏览器插件）。

典型用途：GEO（看 AI 搜索怎么回答买家的问题、推不推荐你、引用了谁）。API 调到的模型大多不联网，和用户在网页上看到的不一样，网页版才是真实的。

| 网站 | id | 验证于 | 说明 |
|---|---|---|---|
| ChatGPT | `chatgpt` | 2026-10-14 | 用临时对话（不进历史记录、不用记忆）；拿不到搜索词；一次 20~60 秒 |
| DeepSeek | `deepseek` | 2026-10-14 | 网页上的「智能搜索」开着才会联网；一次 10 秒左右 |
| 豆包 | `doubao` | 2026-10-14 | 要个人账号（「豆包工作」企业空间不行）；回答里没有引用编号，按网页标题出现在回答里算引用；一次 30 秒左右 |
| Kimi | `kimi` | 2026-10-14 | 默认开着深度思考，一次 30~90 秒 |
| 腾讯元宝 | `yuanbao` | 2026-10-14 | 拿不到搜索词（`searches` 是空的）；一次 20 秒左右 |

除了 ChatGPT，别的网站没有临时对话：每问一次，用户那边的历史记录里就多一段对话。

**这是参考代码，不保证一直能用。** 网站改版就会坏，坏了照 [MAINTAIN.md](MAINTAIN.md) 修：先看这里有没有更新，没有就自己排查。

## 放进项目

把 `local/` 下的文件复制到项目的 `local/`：

```sh
git clone --depth 1 https://github.com/annulo/references /tmp/annulo-references
cp /tmp/annulo-references/aichat/local/*.ts <项目>/local/
```

每个文件开头写着来源和验证日期，复制时在 `aichat.ts` 开头加一行记下是哪个提交（`git -C /tmp/annulo-references rev-parse --short HEAD`），以后好对比：

```ts
// 复制自 annulo/references@<提交> aichat/
```

只要某几个网站的话，删掉别的网站文件，再把 `aichat.ts` 里 `SITES` 对应的那项去掉。

## 用

```sh
annulo run aichat.sites                      # 支持哪些网站
annulo run aichat.ask --input '{"site":"deepseek","question":"有哪些好用的外贸建站工具？"}'
annulo run aichat.test                       # 每个网站问一个固定问题，检查结果全不全
```

本机函数里：

```ts
import { ask } from './aichat'

const r = await ask({ site: 'kimi', question }, ctx)
// r.answer   回答（Markdown，引用写成 [1] [2]）
// r.sources  [{ n, url, title, site_name, snippet, cited }]：网站搜到的网页，cited 是回答里引用了
// r.searches 网站搜了哪些词
// r.search   这次有没有联网搜索
// r.url      这段对话的地址
```

出错时 `throw` 的 `Error` 带 `code`，按它决定怎么办：

| code | 意思 | 怎么办 |
|---|---|---|
| `login` | 没登录或登录过期 | 提醒用户到那个 Chrome 里登录，不要重试 |
| `limited` | 网站限流、繁忙 | 过一会儿再试 |
| `timeout` | 等太久没回答完 | 再试一次；总是超时就照 MAINTAIN.md 排查 |
| `changed` | 页面或接口对不上了（改版） | 照 MAINTAIN.md 修 |
| `empty` | 问出去了没拿到回答 | 同上 |

`ask` 的其他参数：`profile`（默认 `@user`，也可以写 Annulo 自己的浏览器 profile）、`timeout`（毫秒）、`show: true`（窗口调到前台）、`raw: true`（结果里带上接口的原始流，排查用）。

## 文件

```
local/aichat.ts            对外的函数：ask、sites、test
local/_aichat_common.ts    结果的格式、错误码、解析流的小工具
local/_aichat_<网站>.ts    每个网站一份：入口、输入框、接口、怎么解析
fixtures/<网站>.txt        真实的接口流，离线检查解析用
check.ts                   离线检查：npx tsx aichat/check.ts
MAINTAIN.md                怎么更新、怎么排查、怎么测试、怎么加网站
```
