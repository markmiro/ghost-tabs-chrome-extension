import cpy from "cpy";
import copyGlobs from "./scripts-build-copy-globs.json" with { type: "json" };
import tsconfig from "./tsconfig-build.json" with { type: "json" };

// Exclude debug files from the production package.
const copyGlobs2 = [...copyGlobs, "!src/**/*-debug.*", "!src/**/debug-*.*"];

const outputs = await cpy(copyGlobs2, tsconfig.compilerOptions.outDir);
console.log(
  `Copied ${outputs.length} files to ${tsconfig.compilerOptions.outDir}`
);
