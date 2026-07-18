import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getCreditsTool from "./tools/get-credits";
import generateTextTool from "./tools/generate-text";
import generateImageTool from "./tools/generate-image";
import searchAssetsTool from "./tools/search-assets";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy, which mcp-js rejects.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "zentry-qor-mcp",
  title: "Zentry Qor",
  version: "0.1.0",
  instructions:
    "Zentry Qor MCP server. Use `search_assets` to find editing assets (LUTs, overlays, sound FX, templates) with download links. Use `get_credits` to check the signed-in user's AI credit balance, `generate_text` to run an AI text prompt (10 credits), and `generate_image` to render an image (30 credits).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getCreditsTool, generateTextTool, generateImageTool, searchAssetsTool],
});
