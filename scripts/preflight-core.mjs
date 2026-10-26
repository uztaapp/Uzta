export function dockerEndpointIsLocal(endpoint) {
  return (
    typeof endpoint === "string" &&
    /^(?:npipe:\/\/\/\/\.\/pipe\/[^\r\n]+|unix:\/\/\/[^\r\n]+)$/.test(endpoint)
  );
}
export function inspectDocker({ run, env = process.env }) {
  if (env.DOCKER_HOST && !dockerEndpointIsLocal(env.DOCKER_HOST))
    return "DOCKER_HOST apunta a un motor externo o no permitido.";
  const context = run([
    "context",
    "inspect",
    "--format",
    "{{.Endpoints.docker.Host}}",
  ]);
  if (context.error?.code === "ENOENT")
    return "Docker no está instalado o no está en PATH.";
  if (context.error || context.status !== 0)
    return "No se puede leer la configuración local de Docker.";
  const endpoint = env.DOCKER_HOST || context.stdout?.trim();
  if (!dockerEndpointIsLocal(endpoint))
    return "El contexto Docker no apunta a un motor local. No se ha contactado ese motor.";
  const info = run(["info", "--format", "{{.ServerVersion}}"]);
  if (info.error || info.status !== 0)
    return "Docker está instalado pero su motor local no responde.";
  const network = run(["network", "inspect", "uzta-local-network"]);
  if (network.status === 0) {
    try {
      const [config] = JSON.parse(network.stdout);
      if (
        config?.Options?.["com.docker.network.bridge.host_binding_ipv4"] !==
        "127.0.0.1"
      )
        return "La red uzta-local-network existente no limita los puertos a 127.0.0.1. No se modifica automáticamente.";
    } catch {
      return "No se puede verificar la red local de UZTA.";
    }
  }
  return "";
}
