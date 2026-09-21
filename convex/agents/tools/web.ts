import { createTool } from "@convex-dev/agent";
import { FirecrawlClient } from "@firecrawl/firecrawl-convex";
import { z } from "zod/v4";

import { components } from "../../_generated/api";

const firecrawl = new FirecrawlClient(
  components.firecrawl,
);

type WebSource = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  content: string | null;
};

function normalizeWebSource(
  source: any,
): WebSource {
  const metadata = source?.metadata ?? {};

  return {
    url:
      source?.url ??
      metadata?.url ??
      "",

    title:
      source?.title ??
      metadata?.title ??
      null,

    description:
      source?.description ??
      metadata?.description ??
      metadata?.ogDescription ??
      null,

    image:
      source?.image ??
      metadata?.ogImage ??
      metadata?.image ??
      null,

    favicon:
      source?.favicon ??
      metadata?.favicon ??
      null,

    content:
      source?.markdown ??
      source?.content ??
      null,
  };
}

function normalizeSearchResults(
  result: any,
): WebSource[] {
  const sources =
    Array.isArray(result?.web)
      ? result.web
      : Array.isArray(result?.results)
        ? result.results
        : Array.isArray(result)
          ? result
          : [];

  return sources
    .map(normalizeWebSource)
    .filter((source) => Boolean(source.url));
}

export const searchWeb = createTool({
  description: `
Search the live web for current or external information.

Use this when the user's problem requires information that should be
verified against current web sources.

The results include webpage metadata and, when available, extracted
content. Use the returned URLs to identify useful sources.

Do not persist every search result. Decide whether a source is important
enough to record in the Case or turn into a Case widget.
`.trim(),

  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(500),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.search(
      ctx,
      input.query,
      {
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      },
    );

    return {
      query: input.query,
      results: normalizeSearchResults(result),
    };
  },
});

export const scrapeUrl = createTool({
  description: `
Read a specific webpage.

Use this when you already have a URL from the user, a search result, or
another source and need the actual page content.

The response contains normalized webpage metadata suitable for reasoning
and for creating a website/source widget when appropriate.
`.trim(),

  inputSchema: z.object({
    url: z
      .string()
      .url(),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.scrape(
      ctx,
      input.url,
      {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    );

    return normalizeWebSource(result);
  },
});

export const mapSite = createTool({
  description: `
Discover pages belonging to a website.

Use this when you know the website but do not yet know which page
contains the relevant information.

This tool only discovers URLs. Scrape the relevant URL afterward when
you need its content or metadata.

Do not persist mapped URLs as Case widgets unless one is actually useful
to the user or to the Case.
`.trim(),

  inputSchema: z.object({
    url: z
      .string()
      .url(),

    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),
  }),

  execute: async (
    ctx,
    input,
  ): Promise<unknown> => {
    const result = await firecrawl.map(
      ctx,
      input.url,
      {
        limit: input.limit ?? 50,
      },
    );

    const links =
      Array.isArray(result?.links)
        ? result.links
        : Array.isArray(result)
          ? result
          : [];

    return {
      url: input.url,
      links: links.filter(
        (link): link is string =>
          typeof link === "string" &&
          link.length > 0,
      ),
    };
  },
});
