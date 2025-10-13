import { defineCollection, z } from 'astro:content';

const portfolio = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		category: z.string(),
		imageSrc: z.string(),
		tags: z.array(z.string()),
		link: z.string(),
	}),
});

const bio = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string().optional(),
	}),
});

const projectDetails = defineCollection({
	type: 'content',
	schema: z.object({
		projectId: z.string(),
		title: z.string(),
		lead: z.string(),
	}),
});

export const collections = {
	portfolio,
	bio,
	projectDetails,
};
