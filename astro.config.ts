import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import ContentSafety from './src/lib/content-safety.ts'

export default defineConfig({
  site: 'https://publicdata.stream',
  output: 'static',
  outDir: './dist',
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  build: { inlineStylesheets: 'never' },
  markdown: {
    syntaxHighlight: false,
    processor: unified({ remarkPlugins: [ContentSafety] }),
  },
})
