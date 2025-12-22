/**
 * Search Tools - Web search for suppliers and products
 *
 * Paper reference (line 103-104): "research products using a search engine (Perplexity)"
 * Paper reference (line 153-157): "Agent researches popular vending machine products...
 *   looks for contact information of wholesalers"
 * Vending-Bench 2: "Internet search"
 */

import { webSearch } from "@exalabs/ai-sdk";

/**
 * Pre-configured web search for vending machine operations
 *
 * Uses Exa AI for real-time web search results.
 * Requires EXA_API_KEY environment variable.
 */
export const searchTool = webSearch({
  type: "auto",
  numResults: 5,
  contents: {
    text: { maxCharacters: 2000 },
    livecrawl: "fallback",
  },
});
