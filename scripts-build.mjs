import cpy from "cpy";
import copyGlobs from "./scripts-build-copy-globs.json" assert { type: "json" };
import tsconfig from "./tsconfig-build.json" assert { type: "json" };

// Exclude debug files
const copyGlobs2 = [...copyGlobs, "!src/**/*-debug.*", "!src/**/debug-*.*"];

await cpy(copyGlobs2, tsconfig.compilerOptions.outDir);
