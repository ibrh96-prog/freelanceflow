import { defineConfig } from "orval";

export default defineConfig({
  freelanceflow: {
    input: "./openapi.yaml",
    output: {
      mode: "tags-split",
      target: "../api-client-react/src/generated",
      schemas: "../api-zod/src/generated",
      client: "react-query",
      override: {
        mutator: {
          path: "../api-client-react/src/mutator.ts",
          name: "customInstance",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
