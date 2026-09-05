import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (_pi: ExtensionAPI) {
  if (!process.env.OPENCODE) {
    process.env.OPENCODE = "1";
  }
}
