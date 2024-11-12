import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/solid-realtime/",
  title: "Solid RealTime",
  description: "The best solution to manage your data in real time.",

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["meta", { name: "author", content: "Solid RealTime" }],
    ["meta", { name: "keywords", content: "manage, realtime, bdd, solid" }],
  ],

  locales: {
    root: {
      label: "English",
      lang: "en",
      link: "/en/",

      themeConfig: {
        nav: [
          { text: "Home", link: "/en/" },
          { text: "Introduction", link: "/en/introduction" },
        ],

        socialLinks: [
          { icon: "github", link: "https://github.com/vuejs/vitepress" },
        ],

        sidebar: [
          {
            text: "Documentation",
            items: [
              { text: "Introduction", link: "/en/introduction" },
              { text: "Usage", link: "/en/usage" },
            ],
          },
          {
            text: "Guides",
            items: [
              { text: "Getting Started", link: "/en/getting-started" },
              {
                text: "Configuration Supabase",
                link: "/en/configuration-supabase",
              },
              {
                text: "Configuration Firebase",
                link: "/en/configuration-firebase",
              },
              {
                text: "Configuration Prisma",
                link: "/en/configuration-prisma",
              },
              {
                text: "Configuration RawSQL",
                link: "/en/configuration-rawsql",
              },
            ],
          },
          {
            text: "Support",
            items: [
              { text: "FAQ", link: "/en/faq" },
              { text: "Contribute", link: "/en/contribute" },
            ],
          },
        ],

        footer: {
          message: "Released under the MIT License.",
          copyright: "Copyright © 2024-present NukkAI",
        },
      },
    },
  },

  themeConfig: {
    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: "Search",
                buttonAriaLabel: "Search docs",
              },
              modal: {
                noResultsText: "No results found",
                resetButtonTitle: "Clear search query",

                footer: {
                  selectText: "to select",
                  navigateText: "to navigate",
                  closeText: "to close",
                },
              },
            },
          },
        },
      },
    },
    editLink: {
      pattern: "https://dev.pages.nukk.ai/nukkui/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
