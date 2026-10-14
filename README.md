# Annulo references

Reference code for [Annulo](https://github.com/annulo/annulo) projects: working samples for things that have no stable API,
like asking AI chat websites or driving a site through the browser, each with notes on how to update, debug and test it.

**References are not plugins.** Nothing here is installed or upgraded for you. Copy what you need into your project
(`local/` for local functions), and it becomes your project's code. Websites change all the time, so each sample says
when it was last verified, and each reference has a `MAINTAIN.md` that the assistant in your project can follow to fix it.

When a copied reference breaks, check here first: `main` is always the latest, so someone may have fixed it already.

| Reference | What it does | Last verified |
|---|---|---|
| [aichat](aichat/) | Ask ChatGPT, DeepSeek, Doubao, Kimi and Yuanbao on their websites and get the answer, cited pages and search queries | 2026-10-14 |

## Layout

One directory per reference:

```
<reference>/
  README.md     what it is, how to copy it into a project, how to use it
  MAINTAIN.md   how to update, debug and test it, and how to extend it
  local/        files to copy into the project's local/
```

## For the assistant in an Annulo project

1. `git clone --depth 1 https://github.com/annulo/references /tmp/annulo-references`
2. Read the reference's `README.md`, copy its files into the project, and note the commit you copied from at the top of the main file.
3. When it breaks, follow its `MAINTAIN.md`: compare with the latest `main` first, then debug.

## License

Apache-2.0
