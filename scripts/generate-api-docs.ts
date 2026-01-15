/**
 * Generates API documentation from Zod schemas.
 * Uses Zod v4's native z.toJSONSchema() function.
 *
 * Usage: bun run scripts/generate-api-docs.ts
 */

import { z } from "zod";
import * as schemas from "../src/shared/schemas";

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  nullable?: boolean;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
};

/** Formats a JSON Schema type to a readable string. */
const formatType = (schema: JsonSchema, defs?: Record<string, JsonSchema>): string => {
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop()!;
    if (defs?.[refName]) {
      return formatType(defs[refName], defs);
    }
    return refName;
  }

  if (schema.anyOf) {
    const types = schema.anyOf.map((s) => formatType(s, defs));
    // Filter out null for nullable types
    const nonNull = types.filter((t) => t !== "null");
    const hasNull = types.includes("null");
    if (hasNull && nonNull.length === 1) {
      return `${nonNull[0]} \\| null`;
    }
    return types.join(" \\| ");
  }

  if (schema.enum) {
    return schema.enum.map((v) => `"${v}"`).join(" \\| ");
  }

  if (schema.type === "array" && schema.items) {
    return `${formatType(schema.items, defs)}[]`;
  }

  if (schema.format === "uuid") {
    return "uuid";
  }

  return schema.type || "unknown";
};

/** Generates a Markdown table for a schema's properties. */
const schemaToMarkdown = (name: string, jsonSchema: JsonSchema): string => {
  const lines: string[] = [];
  const displayName = name.replace(/Schema$/, "");

  lines.push(`### ${displayName}\n`);

  if (!jsonSchema.properties) {
    // Enum or simple type
    if (jsonSchema.enum) {
      lines.push(`**Type:** \`${jsonSchema.enum.map((v) => `"${v}"`).join(" | ")}\`\n`);
    } else if (jsonSchema.anyOf) {
      lines.push(`**Union type**\n`);
    } else if (jsonSchema.type) {
      lines.push(`**Type:** \`${jsonSchema.type}\`\n`);
    }
    return lines.join("\n");
  }

  const props = jsonSchema.properties;
  const required = new Set(jsonSchema.required || []);
  const defs = jsonSchema.$defs;

  lines.push("| Field | Type | Required |");
  lines.push("|-------|------|----------|");

  for (const [field, fieldSchema] of Object.entries(props)) {
    const type = formatType(fieldSchema, defs);
    const isRequired = required.has(field) ? "Yes" : "No";
    lines.push(`| \`${field}\` | \`${type}\` | ${isRequired} |`);
  }

  lines.push("");
  return lines.join("\n");
};

/** Main generation function. */
const generate = () => {
  const output: string[] = [];

  output.push("<!-- Auto-generated from Zod schemas. Do not edit manually. -->\n");

  // Group schemas by category
  const categories: Record<string, string[]> = {
    User: ["UserSchema", "UpdateUserSchema", "UpdateUserRoleSchema"],
    Authentication: [
      "RegisterSchema",
      "LoginSchema",
      "ResetPasswordSchema",
      "ChangePasswordSchema",
      "AuthResponseSchema",
    ],
    Chatroom: [
      "ChatroomSchema",
      "CreateChatroomSchema",
      "UpdateChatroomSchema",
      "ChatroomRoleSchema",
      "ChatroomMemberSchema",
      "AddMemberSchema",
      "JoinByTokenSchema",
    ],
    Message: ["MessageTypeSchema", "MessageDataSchema"],
    WebSocket: ["WsQuerySchema", "WsClientMessageSchema", "WsServerMessageSchema"],
    Pagination: ["PaginationQuerySchema", "PaginationResponseSchema", "ErrorResponseSchema", "MessageResponseSchema"],
  };

  for (const [category, schemaNames] of Object.entries(categories)) {
    output.push(`## ${category}\n`);

    for (const name of schemaNames) {
      const schema = (schemas as Record<string, z.ZodType>)[name];
      if (!schema) {
        console.warn(`Schema not found: ${name}`);
        continue;
      }

      try {
        const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" }) as JsonSchema;
        output.push(schemaToMarkdown(name, jsonSchema));
      } catch (err) {
        console.error(`Error converting ${name}:`, err);
      }
    }
  }

  return output.join("\n");
};

// Generate and write
const content = generate();
const outPath = "docs/schemas.generated.md";

await Bun.write(outPath, content);
console.log(`Generated ${outPath}`);
