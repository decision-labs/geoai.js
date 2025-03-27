import { describe } from "vitest";
import { queryAgent } from "../src/geobase-agent";
import { it } from "vitest";
import { mapboxParams } from "./constants";

describe("queryAgent", () => {
  it("should select the correct task and return formatted response", async () => {
    const queries = [
      "What are the green areas on this map?",
      "Can you highlight the buildings in this region?",
      "Show me the roads in this area.",
      "Can you categorize this area by land use?",
      "Which parts of this map are parks?",
      "Can you find the residential areas here?",
      "Where are the commercial zones in this map?",
      "Identify the water bodies in this region.",
      "Can you show me the industrial areas on this map?",
      "identify the wind turbines in this region.",
    ];

    await Promise.all(
      queries.map(async userQuery => {
        const response = await queryAgent(userQuery, mapboxParams);
        console.log({
          response: response.task,
          model_id: response.model_id,
          userQuery,
        });
      })
    );
  });
});
