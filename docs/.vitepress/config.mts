import { defineConfig } from 'vitepress'
import { sections } from './sections'

export default defineConfig({
  title: 'TypeScript Atlas',
  description: 'A map of TypeScript features: short explanations, real-world examples and when to use each one.',
  lang: 'en-US',
  // GitHub Pages serves the site at https://<user>.github.io/typescript-atlas/
  base: '/typescript-atlas/',
  lastUpdated: true,

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/typescript-atlas/logo.svg' }]],

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    lineNumbers: false
  },

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Feature Index', link: '/features' },
      { text: 'Start', link: '/fundamentals/type-system' }
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [{ text: 'Feature Index', link: '/features' }]
      },
      ...sections.map((section) => ({
        text: `${section.icon} ${section.text}`,
        collapsed: false,
        items: section.items
      }))
    ],

    outline: { level: 2, label: 'Features on this page' },

    search: { provider: 'local' },

    docFooter: { prev: 'Previous', next: 'Next' },

    footer: {
      message: 'Personal TypeScript reference built from my course notes.',
      copyright: 'TypeScript Atlas'
    }
  }
})
