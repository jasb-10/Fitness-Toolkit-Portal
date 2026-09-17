import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedDir = path.resolve(
  import.meta.dirname,
  "..",
  "api-zod",
  "src",
  "generated",
);

async function rewriteDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteDirectory(filePath);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;

    const original = await readFile(filePath, "utf8");
    const compatible = original
      .replaceAll("zod.int()", "zod.number().int()")
      .replaceAll("zod.uuid()", "zod.string().uuid()")
      .replaceAll("zod.url()", "zod.string().url()");

    if (compatible !== original) {
      await writeFile(filePath, compatible);
    }
  }
}

await rewriteDirectory(generatedDir);