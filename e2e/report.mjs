// Collects the favicons Chrome showed during a run and writes them out as a filmstrip, so a human
// can look at what the assertions saw.
import fs from "node:fs";
import path from "node:path";

export function createRecorder() {
  /** @type {{ scenario: string, label: string, t: number, favIconUrl: string, stats: any }[]} */
  const frames = [];
  const start = Date.now();
  return {
    frames,
    add(scenario, label, tabState) {
      frames.push({
        scenario,
        label,
        t: Date.now() - start,
        favIconUrl: tabState.favIconUrl,
        stats: tabState.stats,
      });
    },
    write(dir, summary = {}) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "frames.json"),
        JSON.stringify({ summary, frames }, null, 2),
      );
      fs.writeFileSync(
        path.join(dir, "filmstrip.html"),
        filmstrip(frames, summary),
      );
      return dir;
    },
  };
}

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function filmstrip(frames, summary) {
  const byScenario = Map.groupBy(frames, (f) => f.scenario);
  const rows = [...byScenario]
    .map(
      ([scenario, fs]) => `
    <section>
      <h2>${esc(scenario)}</h2>
      <div class="strip">
        ${fs
          .map(
            (f) => `
          <figure>
            <div class="tab"><img src="${esc(f.favIconUrl)}" alt=""></div>
            <figcaption>
              <b>${esc(f.label)}</b><br>
              ${f.stats ? `α ${f.stats.alpha.toFixed(2)} · sat ${f.stats.saturation.toFixed(2)}${f.stats.blueFraction > 0.01 ? " · 🔵" : ""}` : "n/a"}<br>
              <span class="t">${(f.t / 1000).toFixed(1)}s</span>
            </figcaption>
          </figure>`,
          )
          .join("")}
      </div>
    </section>`,
    )
    .join("");
  return `<!doctype html>
<meta charset="utf-8">
<title>Ghost Tabs e2e filmstrip</title>
<style>
  body { font: 13px system-ui, sans-serif; margin: 24px; color: #222; }
  pre { background: #f4f4f4; padding: 8px; }
  .strip { display: flex; flex-wrap: wrap; gap: 8px; }
  figure { margin: 0; width: 110px; text-align: center; }
  .tab { display: inline-flex; padding: 8px 14px; border-radius: 8px 8px 0 0; background: #dee1e6; }
  .tab img { width: 32px; height: 32px; image-rendering: pixelated; }
  figcaption { font-size: 11px; color: #555; }
  .t { color: #999; }
</style>
<h1>Ghost Tabs e2e filmstrip</h1>
<pre>${esc(JSON.stringify(summary, null, 2))}</pre>
${rows}
`;
}
