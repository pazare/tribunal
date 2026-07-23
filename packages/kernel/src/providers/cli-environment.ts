/**
 * Construct the deliberately small environment inherited by provider CLIs.
 *
 * Provider transports must not receive arbitrary application secrets merely
 * because the server process has them. Authentication for protected-data CLI
 * runs therefore comes from the provider CLI's owner-only credential store,
 * not API-key environment variables. Callers may add only reviewed, non-secret
 * controls (for example a model selector or a telemetry-disable flag).
 */
export function minimalCliEnvironment(
  extra: Readonly<Record<string, string>> = {},
): NodeJS.ProcessEnv {
  const inheritedNames = [
    "PATH",
    "HOME",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
  ] as const;
  const environment: NodeJS.ProcessEnv = {};
  for (const name of inheritedNames) {
    const value = process.env[name];
    if (value) environment[name] = value;
  }
  environment.NO_COLOR = "1";
  environment.CI = "1";
  const reviewedControls = new Set([
    "ANTHROPIC_SMALL_FAST_MODEL",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
  ]);
  for (const [name, value] of Object.entries(extra)) {
    if (!reviewedControls.has(name)) {
      throw new Error(`refusing unreviewed provider child environment variable: ${name}`);
    }
    environment[name] = value;
  }
  return environment;
}
