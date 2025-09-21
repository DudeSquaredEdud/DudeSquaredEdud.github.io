import { defineCollection, z } from 'astro:content';

const research = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		date: z.date(),
		status: z.enum(['ongoing', 'completed', 'published']),
		abstract: z.string(),
		keywords: z.array(z.string()),
		collaborators: z.array(z.string()).optional(),
		publication: z.string().optional(),
	}),
});

export const collections = {
	research,
};
