import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One Markdown file per paper with poster notes: src/content/notes/<paper id>.md.
// scripts/add_photos.py owns the front matter; the body is free-form note text.
const notes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/notes" }),
  schema: z.object({
    paper: z.string(),
    photos: z.array(z.object({ src: z.string(), thumb: z.string() })).default([]),
  }),
});

export const collections = { notes };
