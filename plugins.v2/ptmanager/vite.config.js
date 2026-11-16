import federation from '@originjs/vite-plugin-federation'
import vue from '@vitejs/plugin-vue'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const distDir = 'dist/v1_5_2'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'PTManager',
      filename: 'remoteEntry.js',
      exposes: {
        './Page': './src/components/Page.vue',
        './Config': './src/components/Config.vue',
        './Dashboard': './src/components/Dashboard.vue',
        './AppPage': './src/components/AppPage.vue',
      },
      shared: {
        vue: { requiredVersion: false, generate: false, singleton: true },
        vuetify: { requiredVersion: false, generate: false, singleton: true },
        'vuetify/styles': { requiredVersion: false, generate: false, singleton: true },
      },
      format: 'esm',
    }),
    {
      name: 'ptmanager-cleanup-bundle',
      generateBundle(_options, bundle) {
        // federation 会额外产出未被引用的共享 CSS 与入口 HTML，删除以满足宿主 CSS 隔离要求
        for (const fileName of Object.keys(bundle)) {
          if (
            fileName.includes('__federation_shared_vuetify/styles-')
            || fileName === 'index.html'
            || /^assets\/index-/.test(fileName)
          ) delete bundle[fileName]
        }
        for (const item of Object.values(bundle)) {
          if (item.type === 'chunk') item.code = item.code.replace(/[ \t]+$/gm, '')
        }
      },
      closeBundle() {
        rmSync(`${projectRoot}${distDir}/index.html`, { force: true })
      },
    },
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: true,
    outDir: distDir,
  },
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: atRule => {
              if (atRule.name === 'charset') atRule.remove()
            },
          },
        },
        {
          postcssPlugin: 'vuetify-filter',
          Root(root) {
            root.walkRules(rule => {
              if (rule.selector && (rule.selector.includes('.v-') || rule.selector.includes('.mdi-'))) rule.remove()
            })
          },
        },
      ],
    },
  },
})
