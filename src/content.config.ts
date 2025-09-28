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
	research,
	portfolio,
	bio,
	projectDetails,
};
