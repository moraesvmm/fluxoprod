import type { Handler } from "@netlify/functions";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// MCP Server Setup
const server = new Server(
  {
    name: "fluxo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_empresa_info",
        description: "Get information about the current company/tenant",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_produtos",
        description: "List all products in the inventory",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of products to return",
            },
          },
        },
      },
      {
        name: "list_vendas",
        description: "List all sales transactions",
        inputSchema: {
          type: "object",
          properties: {
            date_from: {
              type: "string",
              description: "Start date (YYYY-MM-DD)",
            },
            date_to: {
              type: "string",
              description: "End date (YYYY-MM-DD)",
            },
          },
        },
      },
      {
        name: "get_estoque_status",
        description: "Get current inventory status",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_empresa_info":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Company info retrieved",
                // TODO: Implement actual Supabase query
              }),
            },
          ],
        };

      case "list_produtos":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Products listed",
                limit: args?.limit || 50,
                // TODO: Implement actual Supabase query
              }),
            },
          ],
        };

      case "list_vendas":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Sales listed",
                date_from: args?.date_from,
                date_to: args?.date_to,
                // TODO: Implement actual Supabase query
              }),
            },
          ],
        };

      case "get_estoque_status":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Inventory status retrieved",
                // TODO: Implement actual Supabase query
              }),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Netlify Function Handler
const handler: Handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // Process MCP request
    const response = await server.request(body);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
