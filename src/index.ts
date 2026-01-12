import { tool } from "@ai-sdk/provider-utils";
import { z } from "zod";
import type { TakoSearchConfig, TakoSearchResponse } from "./types";

export function takoSearch(config: TakoSearchConfig = {}) {
  const {
    apiKey = process.env.TAKO_API_KEY || process.env.TAKO_API_TOKEN,
    sourceIndexes = ["tako", "web"],
    searchEffort = "auto",
    outputSettings,
    countryCode = "US",
    locale = "en-US",
  } = config;

  return tool({
    description: "Search Tako's knowledge base for visualized data, insights, and information. Use this to find knowledge cards with charts, data visualizations, and well-sourced answers to questions.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("The search query - use natural language to describe what you're looking for"),
    }),
    execute: async ({ query }: { query: string }) => {
      if (!apiKey) {
        throw new Error(
          "TAKO_API_KEY is required. Set it in environment variables or pass it in config."
        );
      }

      const requestBody: any = {
        inputs: {
          text: query,
        },
        source_indexes: sourceIndexes,
        search_effort: searchEffort,
        country_code: countryCode,
        locale: locale,
      };

      if (outputSettings) {
        requestBody.output_settings = {
          knowledge_card_settings: {
            image_dark_mode: outputSettings.knowledgeCardSettings?.imageDarkMode,
          },
        };
      }

      try {
        const response = await fetch(
          "https://trytako.com/api/v1/knowledge_search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Tako API error: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json() as TakoSearchResponse;
        return data;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to search with Tako: ${error.message}`);
        }
        throw error;
      }
    },
  });
}

export type {
  TakoSearchConfig,
  TakoSearchResponse,
  TakoKnowledgeCard,
  TakoSource,
  TakoVisualizationData,
} from "./types";
