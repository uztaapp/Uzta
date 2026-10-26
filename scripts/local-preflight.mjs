import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { inspectDocker } from "./preflight-core.mjs";
const reasons = [];
const config = readFileSync("supabase/config.toml", "utf8");
if (!/^project_id\s*=\s*"uzta-local"\s*$/m.test(config))
  reasons.push("La identidad de la base local no corresponde a UZTA.");
if (existsSync("supabase/.temp/project-ref"))
  reasons.push("El proyecto tiene un enlace externo: no se permite arrancar.");
for (const file of [".vercel", ".netlify", ".lovable"])
  if (existsSync(file))
    reasons.push(`Se ha detectado una configuración externa: ${file}.`);
if (!reasons.length) {
  const problem = inspectDocker({
    run: (args) =>
      spawnSync("docker", args, {
        encoding: "utf8",
        timeout: 8000,
        windowsHide: true,
      }),
  });
  if (problem) reasons.push(problem);
}
if (reasons.length) {
  console.log(
    "Supabase local aún no está listo:\n" +
      reasons.map((x) => `- ${x}`).join("\n"),
  );
  console.log(
    "La aplicación puede seguir funcionando con su guardado local. No se ha cambiado ni borrado nada.",
  );
  process.exitCode = 2;
} else
  console.log(
    "Comprobaciones previas correctas. Usa scripts/supabase-local.ps1 start para arrancar únicamente UZTA. No se ha iniciado ningún contenedor.",
  );
