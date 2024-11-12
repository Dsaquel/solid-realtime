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
      link: "/",

      themeConfig: {
        nav: [
          { text: "Home", link: "/" },
          { text: "Introduction", link: "/introduction" },
        ],

        socialLinks: [
          { icon: "github", link: "https://github.com/Dsaquel/solid-realtime" },
        ],

        sidebar: [
          {
            text: "Documentation",
            items: [
              { text: "Introduction", link: "/introduction" },
              { text: "Usage", link: "/usage" },
            ],
          },
          {
            text: "Guides",
            items: [
              { text: "Getting Started", link: "/getting-started" },
              {
                text: "Configuration Supabase",
                link: "/configuration-supabase",
              },
              {
                text: "Configuration Firebase",
                link: "/configuration-firebase",
              },
              {
                text: "Configuration Prisma",
                link: "/configuration-prisma",
              },
              {
                text: "Configuration RawSQL",
                link: "/configuration-rawsql",
              },
            ],
          },
          {
            text: "Support",
            items: [
              { text: "FAQ", link: "/faq" },
              { text: "Contribute", link: "/contribute" },
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
      pattern: "https://github.com/Dsaquel/solid-realtime/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
