import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const src = "docs/bondfin - Cycle workflow.mmd";
const png = "docs/bondfin - Cycle workflow.png";
const md = "docs/cycle-workflow.md";

const diagram = readFileSync(src, "utf8").trimEnd();
const fence = "`".repeat(3);
writeFileSync(
  md,
  `# BondFin Cycle Workflow\n\n> Generated from \`${src}\` by \`npm run diagrams\`. Do not edit by hand.\n\n${fence}mermaid\n${diagram}\n${fence}\n`
);
execSync(`npx @mermaid-js/mermaid-cli -i "${src}" -o "${png}" -s 2 -b white`, { stdio: "inherit" });
console.log("Updated", md, "and", png);
