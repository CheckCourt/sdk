import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";

const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");

rmSync("dist", { recursive: true, force: true });
execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { stdio: "inherit" });
// tsc does not emit hand-written .d.ts files, so the generated API types are copied as-is.
copyFileSync("src/generated/schema.d.ts", "dist/generated/schema.d.ts");
