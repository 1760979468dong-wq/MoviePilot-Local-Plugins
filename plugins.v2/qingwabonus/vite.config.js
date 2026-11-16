import federation from '@originjs/vite-plugin-federation'
import vue from '@vitejs/plugin-vue'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// 与 frontend_dist.py 的 FRONTEND_DIST_DIR 保持一致。
// 注意：vite 会在 outDir 下自动追加 assets/，所以这里只写到 v1_3_0 这一层。
const distDir = 'dist/v1_3_6'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'QingwaBonus',
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
        rmSync(`${projectRoot}${distDir}/index.html`, { force: true })
      },
    },
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: true,
    outDir: distDir,
    emptyOutDir: true,
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
