import cpy from "cpy";
import path from "path";
import chokidar from "chokidar";
import copyGlobs from "./scripts-build-copy-globs.json" assert { type: "json" };
import tsconfigBase from "./tsconfig.json" assert { type: "json" };
import tsconfig from "./tsconfig-watch.json" assert { type: "json" };

// Take the file's full path, remove the file name, remove the source root dir, and add the destination dir
const destDir = (pathStr) =>
  path.join(
    tsconfig.compilerOptions.outDir,
    path.relative(tsconfigBase.compilerOptions.rootDir, path.dirname(pathStr))
  );

const copyFile = async (path) => {
  if (path.endsWith(".DS_Store")) return;
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
