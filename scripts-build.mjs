import cpy from "cpy";
import copyGlobs from "./scripts-build-copy-globs.json" assert { type: "json" };
import tsconfig from "./tsconfig.json" assert { type: "json" };

await cpy(copyGlobs, tsconfig.compilerOptions.outDir);
