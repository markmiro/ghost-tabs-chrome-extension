import cpy from "cpy";

await cpy(["src/**/*", "!src/**/*.md", "!src/**/*.sh"], "build");
