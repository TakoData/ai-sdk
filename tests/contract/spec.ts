import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import YAML from "yaml";

/**
 * Tako's published OpenAPI document, vendored verbatim from
 * https://docs.tako.com/api-reference/openapi.yaml — the authoritative
 * description of the live API.
 *
 * Tests validate against it so a mismatch fails CI instead of shipping. The copy
 * is a pinned snapshot; refresh it with `pnpm spec:refresh`.
 */
const SPEC_PATH = fileURLToPath(new URL("./openapi.yaml", import.meta.url));

export const spec = YAML.parse(readFileSync(SPEC_PATH, "utf8"));

const ajv = new Ajv2020({
  strict: false, // the document carries OpenAPI keywords ajv doesn't know
  allErrors: true,
});
addFormats(ajv);
ajv.addSchema(spec, "openapi");

/**
 * Compile a validator for one `#/components/schemas/<name>` entry.
 *
 * Where a request schema declares `additionalProperties: false`, the API rejects
 * unknown properties with a 400 rather than ignoring them — so a body that fails
 * here fails against the live API too. Note that `ContentsRequest` does *not*
 * declare it, so unknown properties pass validation on that schema.
 */
export function validator(schemaName: string) {
  const validate = ajv.getSchema(`openapi#/components/schemas/${schemaName}`);
  if (!validate) throw new Error(`No such schema in the Tako spec: ${schemaName}`);
  return validate;
}

/** Validate `value`, returning the ajv error list (empty when valid). */
export function check(schemaName: string, value: unknown) {
  const validate = validator(schemaName);
  const valid = validate(value);
  return { valid, errors: validate.errors ?? [] };
}

/** The property names the spec allows on a schema. */
export function propertiesOf(schemaName: string): string[] {
  return Object.keys(spec.components.schemas[schemaName].properties ?? {});
}

/** The `required` list the spec declares for a schema. */
export function requiredOf(schemaName: string): string[] {
  return spec.components.schemas[schemaName].required ?? [];
}

/** Resolve a schema's enum values, following a single `$ref` hop if present. */
export function enumOf(schemaName: string): unknown[] {
  const schema = spec.components.schemas[schemaName];
  if (!schema) throw new Error(`No such schema in the Tako spec: ${schemaName}`);
  return schema.enum ?? [];
}
