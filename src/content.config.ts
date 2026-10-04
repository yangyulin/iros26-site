import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One Markdown file per paper, workshop or event with photos: src/content/notes/<key>.md
// (key = paper id, lowercased workshop id or event key). scripts/add_photos.py owns the
// front matter; the body is free-form note text.
const notes = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/notes" }),
  schema: z.object({
    paper: z.string().optional(),
    workshop: z.string().optional(),
    event: z.string().optional(),
    title: z.string().optional(),
    photos: z
      .array(
        z.object({
          src: z.string(),
          thumb: z.string(),
          zoom: z.string(),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
      )
      .default([]),
  }).refine((n) => [n.paper, n.workshop, n.event].filter(Boolean).length === 1, {
    message: "a note names exactly one of paper, workshop or event",
  }),
});

export const collections = { notes };
