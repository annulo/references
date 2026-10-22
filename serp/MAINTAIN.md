# 维护 serp：更新、排查、测试

给修它的人（多半是项目里的 AI 助手）看。Google 的结果页常改，这份代码只在文件头写的日期验证过。

## 原则

- **Google 没有给普通网页的结果接口，只能读页面**：所以在页面里只取最原始的东西（每个 h3 标题所在的链接、在不在广告区、摘要），
  清洗、去重、编号放在纯函数 `parse` 里。改版多半只影响 `extract` 的选择器，`parse` 能拿 `fixtures/` 离线检查。
- **只靠稳定的结构**：自然结果的标题一直是链接里的 `h3`，结果区一直是 `#search`；不用一串会变的 class。
- **出错要说清是哪种**（`captcha` / `consent` / `changed`），调用方靠它决定停下还是提醒用户。
- **改完一定要测**：离线检查（`check.ts`）+ 真跑一次（`serp.test`）。

## 坏了先看这里有没有更新

1. 看项目里 `serp.ts` 开头记的来源提交；
2. 拉最新的：`git clone --depth 1 https://github.com/annulo/references /tmp/annulo-references`；
3. `diff <项目>/local/_serp_google.ts /tmp/annulo-references/serp/local/_serp_google.ts`，看文件头的验证日期；
4. 这里已经修了：复制过去（项目自己改过的地方手动合进来），更新来源提交，跑测试；没修就往下排查。

## 排查

先跑 `annulo run serp.test --input '{"show":true}'`（`show` 让窗口到前台，能看到停在哪）。

### captcha

查太快、太多，或者这个网络（代理节点）被 Google 盯上了。让用户在那个 Chrome 里打开 google.com 搜一次、做完验证；还是频繁出现就把 `searchMany` 的间隔调大、一次少查几个。

### consent

欧盟地区第一次打开 Google 会先到 consent.google.com。让用户点一次「全部接受 / 全部拒绝」，以后就不会了。

### changed：没等到结果区 / 有标题链接但一条结果都没取出来

1. 失败时 Annulo 会存一份现场（错误信息末尾的「现场：目录」）：看 `shot.png` 是不是真的是结果页（可能是别的拦截页），`page.html` 里找结果区和标题。
2. 写个临时本机函数拿原始条目：`b.eval` 跑 `_serp_google.ts` 的 `extract`，把返回值存成 `fixtures/google-<日期>.json`（先去掉账号信息：页面上登录的 Google 账号名、邮箱不会进条目，但检查一下），
   看 `items` 里是不是自然结果、`ad` 标得对不对；
3. 改 `SEL` 或 `extract`；只是网址格式变了（比如又包了一层跳转）改 `parse`；
4. 跑离线检查和 `serp.test`。

### 结果里混进了不该有的

「热门新闻」「视频」「图片」这类聚合块里也可能有 h3 链接。`parse` 去掉了 Google 自己的网址；还混进了别的，在 `extract` 里按块排除（看它们在 `page.html` 里的外层元素），不要按 class 名一个个排。

## 测试

1. **离线**（改了 `parse` 后）：在这个仓库里 `npx tsx serp/check.ts`，用 `fixtures/` 里存的原始条目。
2. **真跑**：项目里 `annulo run serp.test`，`ok: true` 才算好。
3. 都过了，把 `_serp_google.ts` 文件头的「验证于」和 `GOOGLE.verified` 改成今天，`README.md` 的表格也改。

## 加网站类型

`_serp_common.ts` 的 `KINDS`：按类型列域名（主域名，子域名自动算上）。只放大家公认的平台，拿不准的别加：它决定调用方把一个位置当成「弱」还是「强」。
