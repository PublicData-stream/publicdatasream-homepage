import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { PolicySchema, ServerSchema } from './lib/content-schema.ts'

export const collections = {
  servers: defineCollection({
    // Defer rendering so Markdown validation failures abort page generation.
    // Astro's eager glob renderer logs render errors without rejecting the build.
    loader: glob({ pattern: '*.md', base: './src/content/servers', deferRender: true }),
    schema: ServerSchema,
  }),
  policies: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/policies', deferRender: true }),
    schema: PolicySchema,
  }),
}
