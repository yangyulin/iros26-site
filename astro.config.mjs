import { defineConfig } from "astro/config";

// Served by GitHub Pages under the user site's custom domain: https://yangyulin.net/iros26-site/
// build.format "file" keeps the v1 URLs (index.html, workshops.html, schedule.html + #filters) working.
export default defineConfig({
  site: "https://yangyulin.net",
  base: "/iros26-site/",
  build: { format: "file" },
});
