import cpy from "cpy";
import path from "path";
import chokidar from "chokidar";
import copyGlobs from "./build-copy-globs.json" assert { type: "json" };
import tsconfig from "./tsconfig.json" assert { type: "json" };

console.log(
  path.dirname(
    path.relative(tsconfig.compilerOptions.rootDir, "src/js/helpers/util.js")
  )
);

// Take the file's full path, remove the file name, remove the source root dir, and add the destination dir
const destDir = (pathStr) =>
  path.join(
    tsconfig.compilerOptions.outDir,
    path.relative(tsconfig.compilerOptions.rootDir, path.dirname(pathStr))
  );

// cpy("src/manifest.json", "build", { flat: true });

const copyFile = async (path) => {
  // console.log("add/change: ", p);
  // Using `flat` because we don't want to replicate the source directory structure
  const outputs = await cpy(path, destDir(path), { flat: true });
  console.log(
    new Date().toLocaleTimeString("en-US") + " - " + outputs.join("\n")
  );
};

chokidar
  .watch(copyGlobs)
  .on("ready", () => console.log("Watching..."))
  .on("add", copyFile)
  .on("change", copyFile)
  .on("error", (err) => {
    console.error(err);
  });
