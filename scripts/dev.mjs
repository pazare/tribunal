// Boots the API server and the web dev server together. Ctrl-C stops both.
import { spawn } from "node:child_process";

const procs = [
  spawn("npx", ["tsx", "watch", "apps/server/src/index.ts"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev", "--workspace", "@tribunal/web"], { stdio: "inherit" }),
];

for (const p of procs) {
  p.on("exit", (code) => {
    for (const q of procs) if (q !== p) q.kill();
    process.exit(code ?? 0);
  });
}
process.on("SIGINT", () => {
  for (const p of procs) p.kill("SIGINT");
});
