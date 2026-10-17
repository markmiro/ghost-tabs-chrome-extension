import cpy from "cpy";
import path from "node:path";
import chokidar from "chokidar";
import tsconfigBase from "./tsconfig.json" with { type: "json" };
import tsconfig from "./tsconfig-watch.json" with { type: "json" };
import { shouldIgnoreAsset } from "./scripts/asset-filter.mjs";

// Take the file's full path, remove the file name, remove the source root dir, and add the destination dir
const destDir = (filePath) =>
  path.join(
    tsconfig.compilerOptions.outDir,
    path.relative(tsconfigBase.compilerOptions.rootDir, path.dirname(filePath))
  );

const copyFile = async (filePath) => {
  try {
    // Using `flat` because we don't want to replicate the source directory structure
    const outputs = await cpy(filePath, destDir(filePath), { flat: true });
    console.log(
      new Date().toLocaleTimeString("en-US") + " - " + outputs.join("\n")
    );
  } catch (error) {
    console.error(error);
  }
};

chokidar
  .watch("src", { ignored: shouldIgnoreAsset })
  .on("ready", () => console.log("Watching..."))
  .on("add", copyFile)
  .on("change", copyFile)
  .on("error", (error) => {
    console.error(error);
  });
