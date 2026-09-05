import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOCAL_CONTEXT_FILE_NAMES = [
  "AGENTS.local.md",
  "CLAUDE.local.md",
] as const;

type ContextFile = {
  path: string;
  content: string;
};

function getDirectoryChain(cwd: string): string[] {
  const directories: string[] = [];
  let directory = resolve(cwd);
  while (true) {
    directories.unshift(directory);
    const parent = dirname(directory);
    if (parent === directory) {
      return directories;
    }
    directory = parent;
  }
}

async function maybeReadFile(path: string): Promise<ContextFile | null> {
  try {
    return {
      path,
      content: await readFile(path, "utf8"),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function discoverLocalContext(cwd: string): Promise<ContextFile[]> {
  const files: ContextFile[] = [];
  for (const directory of getDirectoryChain(cwd)) {
    for (const fileName of LOCAL_CONTEXT_FILE_NAMES) {
      const file = await maybeReadFile(join(directory, fileName));
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
}

function formatContextFile(file: ContextFile): string {
  return `<project_instructions path="${file.path}">
${file.content}
</project_instructions>`;
}

export default function (pi: ExtensionAPI) {
  let localContextFiles: ContextFile[] = [];

  pi.on("session_start", async (_event, ctx) => {
    localContextFiles = await discoverLocalContext(ctx.cwd);
    if (ctx.hasUI && localContextFiles.length > 0) {
      ctx.ui.notify(`${localContextFiles.length} local contexts loaded`, 'info')
    }
  });

  pi.on("before_agent_start", event => {
    const alreadyLoaded = new Set(
      (event.systemPromptOptions.contextFiles ?? []).map(file =>
        resolve(file.path),
      ),
    );
    const additionalContextFiles = localContextFiles.filter(
      file => !alreadyLoaded.has(resolve(file.path)),
    );
    if (additionalContextFiles.length === 0) {
      return;
    }
    const context = additionalContextFiles.map(formatContextFile).join("\n\n");
    return {
      systemPrompt: `${event.systemPrompt}
<project_context>
User-local project instructions:
${context}
</project_context>`,
    };
  });
}
