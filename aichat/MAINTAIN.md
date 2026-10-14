# 维护 aichat：更新、排查、测试、加网站

给修它的人（多半是项目里的 AI 助手）看。网站改版是常态，这份代码只在文件头写的日期验证过。

## 原则

- **从接口拿结果，不解析页面。** 每个网站回答都走一个流式接口，里面有结构化的回答、网页、搜索词。页面的 class 天天变，接口的格式变得慢得多。
  页面只用来：找输入框、按回车、判断有没有登录。
- **出错要说清是哪种**（`login` / `limited` / `timeout` / `changed` / `empty`），调用方靠它决定重试还是提醒用户。
- **改完一定要测**：离线检查（`check.ts`）+ 真跑一次（`aichat.test`）。

## 坏了先看这里有没有更新

1. 看项目里 `aichat.ts` 开头记的来源提交（`复制自 annulo/references@<提交>`）；
2. 拉最新的：`git clone --depth 1 https://github.com/annulo/references /tmp/annulo-references`；
3. 比一下这个网站的文件：`diff <项目>/local/_aichat_kimi.ts /tmp/annulo-references/aichat/local/_aichat_kimi.ts`，看文件头的验证日期；
4. 这里已经修了：把新文件复制过去（项目自己改过的地方手动合进来），更新来源提交，跑测试；
5. 这里也没修：往下自己排查。

## 排查

先跑 `annulo run aichat.test --input '{"site":"<网站>"}'`，看报的是哪种：

### login

到那个 Chrome 里打开网站，看是不是真的没登录。登录了还报 login，是「判断登录」的条件过时了：
DeepSeek 看地址是不是跳到了 `/sign_in`，Kimi 看页面上有没有「登录」按钮。打开网站看现在没登录时长什么样，改那个判断。

### changed：找不到输入框

失败时 Annulo 会存一份现场（错误信息末尾的「现场：目录」）：`outline.txt` 是页面上看得见的可操作元素，`shot.png` 是截图。
在 `outline.txt` 里找新的输入框（`textarea`、`contenteditable`、`role="textbox"`），改文件里的 `SEL.input`。

### timeout、empty、changed：接口变了

1. 用 `raw: true` 拿到原始的流：
   ```sh
   annulo run aichat.ask --input '{"site":"kimi","question":"用两句话介绍 Shopify，并给出来源。","raw":true}' > /tmp/kimi.json
   ```
   `raw` 是空的或者很短：接口地址可能换了。打开网站，在 Chrome 开发者工具的 Network 里问一个问题，找回答时一直在传数据的那个请求（类型是 eventsource / fetch，响应很长），把新地址换进文件里的 `API`。
   （没有开发者工具也行：写个临时本机函数 `b.listen('/api')` 然后提问，`b.responses('/api')` 把所有接口列出来，找最长的那个。）
2. 对着 raw 看格式：回答正文、网页列表、搜索词、引用标记各在哪。每个网站文件开头的注释写着验证时的格式，对比一下哪里变了。
3. 改 `parse`。把新的 raw 存成 `fixtures/<网站>.txt`（先确认里面没有账号信息：用户 id、手机号、邮箱、昵称），跑离线检查。

### 拿到的是别的请求

同一个接口页面上可能还有别的请求：豆包打开时会给上一段对话补拉一次 `/chat/completion`（取推荐问题），拿第一个响应就拿错了，表现是 `empty` 而且很快（几秒）。
所以每个网站都用 `responseMatching` 取「这次提问的那个」：豆包看流里有没有回显问题，别的看有没有回答正文。新加的网站也这样写。

### 回答是乱码（å¹´æœ‰ 这种）

接口响应头没写字符集时，Chrome 把 UTF-8 按 Windows-1252 解码。新版 Annulo 的 `b.responses` 已经修了，老版本靠 `fixMojibake` 兜底：
解析前先 `fixMojibake(r.text)`（豆包、元宝都要）。

### timeout：一直在等

网站可能要求先点什么（新功能引导、选模型、同意条款）。加 `show: true` 跑一次，看窗口里卡在哪；或者看失败现场的截图。

### 回答里引用没对上（test 报「回答里的引用没对上网页」）

各网站的引用写法不同，`parse` 最后统一换成 `[n]`：DeepSeek 是 `[citation:N]`，N 是网页的 `cite_index`；
Kimi 是 `<REF>cite✦tools://web_search:K#N:~:text=…</REF>`，第 K 次搜索的第 N 个网页。看 raw 里现在的写法，改替换的那段。

## 测试

1. **离线**（改了 `parse` 后）：在这个仓库里 `npx tsx aichat/check.ts`。每个网站的回答、搜索词、网页、引用都要有。
2. **真跑**（改完、或者怀疑网站改版）：项目里 `annulo run aichat.test`，或者 `--input '{"site":"kimi"}'` 只测一个。`ok: true` 才算好。
   test 用的是固定问题（问外贸建站工具），会联网搜索、会引用网页；换问题也行，要选一个一定会联网搜的。
3. 都过了，把文件头的「验证于」改成今天，`README.md` 的表格也改。

## 加一个网站

1. 复制一个现有的网站文件（流是一行一条 `data:` 的照 `_aichat_deepseek.ts`，不是的照 `_aichat_kimi.ts`），改名 `_aichat_<id>.ts`；
2. 找入口地址（打开就是新对话的那个）、输入框、回答走的接口（方法见上面「接口变了」）；
3. 用 `raw: true` 拿一份流，写 `parse`：回答正文（去掉思考过程）、网页、搜索词、引用统一成 `[n]`；
4. 判断登录：没登录时页面上有什么（跳登录页、「登录」按钮、输入框写着「请登录」）；
5. 在 `aichat.ts` 的 `SITES` 里加上；存 fixture，`check.ts` 里加上；跑离线检查和 `aichat.test`；
6. `README.md` 的表格加一行。

## 各网站的现状

### ChatGPT（chatgpt.com）

- 入口 `https://chatgpt.com/?temporary-chat=true`：临时对话，不进用户的历史记录、不用用户的记忆。
- **回答的流抓不到**（不是普通 HTTP 流，`b.listen` 等不到完成），所以回答完以后读整段对话：页面里 `fetch('/api/auth/session')` 拿 `accessToken`，
  再 `GET /backend-api/conversation/<id>`（地址从 `/c/<id>` 来），每 3 秒读一次，最后一条 assistant 文本消息 `status=finished_successfully` 而且是 `current_node` 就是答完了。
- 没登录也能聊天，但没有 `accessToken`：按这个判断 `login`。
- 正文里的标记是私有区字符 `\ue200类型\ue202内容\ue201`：`cite` 对应 `metadata.content_references` 里 `matched_text` 同名的 `grouped_webpages`；`entity` 取名字；别的（配图）去掉。
  网页在 tool 消息的 `metadata.search_result_groups`。搜索词对话里没有。
- 网址带 `utm_source=chatgpt.com`，去掉了再比较。
- fixture 是对话 JSON 去掉账号字段后的样子（只留 mapping 里的消息和 `search_result_groups`、`content_references`）。

### DeepSeek（chat.deepseek.com）

- 入口 `https://chat.deepseek.com/` 就是新对话；没登录会跳到 `/sign_in`。
- 接口 `/api/v0/chat/completion`，SSE，每行 `data:` 一个 JSON 补丁，省略 `p` 的接着上一条的路径。第一条是整个 response（`search_enabled`、SEARCH 片段的 `queries`）。
- 联网搜索跟着网页上「智能搜索」按钮的状态走（用户上次的选择），这份代码不去点它。`search: false` 时去网页上打开它。
- 开了「深度思考」时会多一个 THINK 片段，`parse` 只取 RESPONSE 片段。

### 豆包（www.doubao.com）

- 入口 `https://www.doubao.com/chat/` 是新对话。要个人账号：企业账号默认进「豆包工作」（标题是「豆包工作 - …」），回答「算力紧张、开通订阅」，代码会报 `login` 让用户换账号。
- 接口 `/chat/completion`，SSE，带 `event:` 名。回答 = `STREAM_CHUNK` 里的 `text_block` 和 `CHUNK_DELTA` 按顺序接起来（只取一种会缺字）。
  搜索词和网页在 `block_type` 10025 的 `search_query_result_block` 里。
- 打开时会给上一段对话补拉一次同一个接口：按流里回显的问题认（见上面「拿到的是别的请求」）。
- 没有引用编号：网页标题的主要部分出现在回答里就算 `cited`，是近似的。
- 响应头没字符集，要 `fixMojibake`。

### Kimi（www.kimi.com）

- 入口 `https://www.kimi.com/` 是新对话，提问后地址变成 `/chat/<id>`。
- 接口 `kimi.gateway.chat.v1.ChatService/Chat`，Connect 协议：每条 5 字节二进制头 + JSON，用 `jsonObjects` 取。
- 默认开着深度思考（`block.think`，不算回答），一次 30~60 秒，`timeout` 默认 4 分钟。
- 联网搜索看 `chat.lastRequest` 的 `tools` 有没有 `TOOL_TYPE_SEARCH`。
- 引用是 `<REF>cite✦tools://web_search:K#N:~:text=原文</REF>`：第 K 次搜索（`message.refs.searchChunks` 第 K 次追加的那组）的第 N 个网页。

### 腾讯元宝（yuanbao.tencent.com）

- 入口 `https://yuanbao.tencent.com/chat` 是新对话；没登录时输入框写着「请登录后输入内容」。输入框是 Quill（`.ql-editor`）。
- 接口 `/api/chat/<对话 id>`，SSE，每行一个 `{"type":…}`，夹着几行不是 JSON 的（`[DONE]`、`[TRACEID:…]`），跳过。
- 网页在 `type: "searchGuid"` 的 `docs` 里（`index` 对应回答里的 `[citation:N]`），回答是 `type: "text"` 的 `msg` 接起来；正文里的 `[](@mark_underline=N)` 去掉。
- 流里没有搜索词，`searches` 是空的（网站元数据 `queries: false`，test 和 check 不查它）。
- 响应头没字符集，要 `fixMojibake`。
