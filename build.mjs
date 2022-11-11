import cpy from "cpy";
import copyGlobs from "./build-copy-globs.json" assert { type: "json" };
import tsconfig from "./tsconfig.json" assert { type: "json" };

await cpy(copyGlobs, tsconfig.compilerOptions.outDir);

