import federation from '@originjs/vite-plugin-federation'
import vue from '@vitejs/plugin-vue'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'OpenPTNotify',
      filename: 'remoteEntry.js',
      exposes: {
        './Page': './src/components/Page.vue',
        './Config': './src/components/Config.vue',
      },
      shared: {
        vue: { requiredVersion: false, generate: false, singleton: true },
        vuetify: { requiredVersion: false, generate: false, singleton: true },
        'vuetify/styles': { requiredVersion: false, generate: false, singleton: true },
      },
      format: 'esm',
    }),
    {
      name: 'strip-non-remote-assets',
      generateBundle(_options, bundle) {
        // federation 可能产出 remoteEntry 不引用的孤儿资源，需剔除以免触发 MP 的样式隔离检查。
        for (const fileName of Object.keys(bundle)) {
          if (
            fileName.includes('__federation_shared_vuetify/styles-')
            || fileName === 'index.html'
            || /^assets\/index-/.test(fileName)
          ) {
            delete bundle[fileName]
          }
        }
        for (const item of Object.values(bundle)) {
          if (item.type === 'chunk') item.code = item.code.replace(/[ \t]+$/gm, '')
        }
      },
      closeBundle() {
        rmSync(`${projectRoot}dist/index.html`, { force: true })
      },
    },
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: true,
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
      ],
    },
  },
})
