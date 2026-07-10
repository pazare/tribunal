import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  CapabilityManifest,
  ControlFlags,
  InterventionChannel,
  InterventionKind,
  LedgerEvent,
  PanelAssignments,
  PackSummary,
  PanelChoice,
  PanelHealth,
  PanelMode,
  RunMeta,
  SeatAssignment,
  SeatingMode,
  Society,
} from "./api";
import { DOMAIN_META, EVENT_LABELS, SOCIETIES } from "./api";
import { compactRunId, formatDuration, type RunTelemetry } from "./lib/operator";

export interface OperatorConfig {
  panelChoice: PanelChoice;
  seed: number;
  maxSpans: number;
  flags: ControlFlags;
  providers: string[];
  seatingMode: SeatingMode;
  assignments: PanelAssignments;
  clientView: "answer_only" | "answer_plus_summary";
}

const controlClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-tribunal-gold/70 focus:ring-2 focus:ring-tribunal-gold/20 disabled:cursor-not-allowed disabled:opacity-50";

const FLAG_META: Record<keyof ControlFlags, { label: string; note: string }> = {
  blindRound: { label: "Blind commitments", note: "Seal each first ballot before reveal." },
  anonymizeFeedback: { label: "Anonymous feedback", note: "Remove seat identity from Delphi summaries." },
  randomizeCandidateOrder: { label: "Rotate ballot order", note: "Give each recipient a different candidate order." },
  debateRounds: { label: "Revision round", note: "Require objection response and rival steelman." },
  roleMemory: { label: "Deliberation memory", note: "Carry public decisions and dissent into later spans." },
  independentEvidence: { label: "Seat evidence bundles", note: "Give each mandate its own deterministic evidence view." },
  safetyVeto: { label: "Binding safety veto", note: "Allow the safety seat to block unsafe candidates." },
};

const OPENROUTER_PREFIX: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  xai: "x-ai",
  google: "google",
  microsoft: "microsoft",
  nvidia: "nvidia",
  meta: "meta-llama",
  deepseek: "deepseek",
  mistral: "mistralai",
};

function societyLabel(society: Society): string {
  return society.replace(/_/g, " ");
}

function seatError(
  mode: Exclude<PanelMode, "offline">,
  society: Society,
  seat: SeatAssignment,
  panel: PanelHealth | null,
  capabilities: CapabilityManifest | null,
): string | null {
  const label = societyLabel(society);
  if (!seat?.provider) return `${label}: choose a provider.`;

  if (mode === "cli") {
    if (!capabilities?.cliProviders.includes(seat.provider)) {
      return `${label}: ${seat.provider} is not a supported CLI provider.`;
    }
    if (!panel?.cli?.[seat.provider]?.present) {
      return `${label}: the ${seat.provider} CLI is not detected.`;
    }
    return null;
  }

  if (!capabilities?.openrouterProviders.includes(seat.provider)) {
    return `${label}: ${seat.provider} is not an allowed OpenRouter vendor.`;
  }
  const model = seat.model?.trim() ?? "";
  if (!model) return `${label}: enter an OpenRouter model slug.`;
  if (model.length > 200 || /[\u0000-\u001f\u007f]/.test(model)) {
    return `${label}: model slug must be a single printable value of 200 characters or fewer.`;
  }
  const prefix = OPENROUTER_PREFIX[seat.provider];
  if (prefix && !model.startsWith(`${prefix}/`)) {
    return `${label}: ${seat.provider} models must begin with ${prefix}/.`;
  }
  return null;
}

export function validatePanelConfig(
  config: OperatorConfig,
  resolvedMode: PanelMode,
  panel: PanelHealth | null,
  capabilities: CapabilityManifest | null,
): string[] {
  if (resolvedMode === "offline") return [];
  if (!capabilities || !panel) return ["Panel capabilities are still loading."];
  if (resolvedMode === "openrouter" && !panel.openrouter.available) {
    return ["OpenRouter is not configured on this server."];
  }

  if (config.seatingMode === "pool") {
    if (resolvedMode === "openrouter") return [];
    if (!config.providers.length) return ["Select at least one CLI provider for the pool."];
    const unavailable = config.providers.filter((provider) => !panel.cli?.[provider]?.present);
    return unavailable.length
      ? [`Remove unavailable CLI providers from the pool: ${unavailable.join(", ")}.`]
      : [];
  }

  return SOCIETIES.flatMap((society) => {
    const error = seatError(
      resolvedMode,
      society,
      config.assignments[resolvedMode][society],
      panel,
      capabilities,
    );
    return error ? [error] : [];
  });
}

export function RunConfigurator({
  pack,
  panel,
  capabilities,
  config,
  busy,
  probing,
  onChange,
  onStart,
  onProbe,
}: {
  pack: PackSummary | null;
  panel: PanelHealth | null;
  capabilities: CapabilityManifest | null;
  config: OperatorConfig;
  busy: boolean;
  probing: boolean;
  onChange: (next: OperatorConfig) => void;
  onStart: () => void;
  onProbe: () => void;
}) {
  const cliDetected = Object.values(panel?.cli ?? {}).some((item) => item.present);
  const resolvedMode: PanelMode =
    config.panelChoice === "auto"
      ? panel?.openrouter?.available
        ? "openrouter"
        : cliDetected
          ? "cli"
          : "offline"
      : config.panelChoice;
  const modes: { id: PanelChoice; label: string; disabled?: boolean }[] = [
    { id: "auto", label: `Auto · ${resolvedMode}` },
    { id: "cli", label: "Local CLIs", disabled: !cliDetected },
    { id: "openrouter", label: "OpenRouter", disabled: !panel?.openrouter?.available },
    { id: "offline", label: "Scripted" },
  ];

  const toggleFlag = (key: keyof ControlFlags) => {
    const flags = { ...config.flags };
    if (key === "debateRounds") flags.debateRounds = flags.debateRounds > 0 ? 0 : 1;
    else (flags as any)[key] = !(flags as any)[key];
    onChange({ ...config, flags });
  };

  const liveMode = resolvedMode === "offline" ? null : resolvedMode;
  const validationErrors = validatePanelConfig(config, resolvedMode, panel, capabilities);

  const updateSeat = (society: Society, nextSeat: SeatAssignment) => {
    if (!liveMode) return;
    onChange({
      ...config,
      assignments: {
        ...config.assignments,
        [liveMode]: {
          ...config.assignments[liveMode],
          [society]: nextSeat,
        },
      },
    });
  };

  const updateSeatProvider = (society: Society, provider: string) => {
    if (!liveMode) return;
    if (liveMode === "cli") {
      updateSeat(society, { provider });
      return;
    }
    const defaultSeat = capabilities?.defaults.assignments.openrouter[society];
    updateSeat(society, {
      provider,
      model: defaultSeat?.provider === provider ? defaultSeat.model : "",
    });
  };

  const resetExactAssignments = () => {
    if (!liveMode || !capabilities) return;
    const defaults = capabilities.defaults.assignments[liveMode];
    const reset = Object.fromEntries(
      SOCIETIES.map((society) => [society, { ...defaults[society] }]),
    ) as Record<Society, SeatAssignment>;
    onChange({
      ...config,
      assignments: { ...config.assignments, [liveMode]: reset },
    });
  };

  return (
    <section className="glass ledger-glow p-4 md:p-5 space-y-5" aria-labelledby="run-controls-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Operator console</p>
          <h2 id="run-controls-title" className="font-serif text-2xl text-zinc-100 mt-1">
            Configure the proceeding
          </h2>
        </div>
        <span className="status-chip status-chip-neutral">full control</span>
      </div>

      <fieldset>
        <legend className="field-label">Panel transport</legend>
        <div className="grid grid-cols-2 gap-2 mt-2" role="group" aria-label="Panel transport">
          {modes.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={option.disabled}
              aria-pressed={config.panelChoice === option.id}
              onClick={() => onChange({ ...config, panelChoice: option.id })}
              className={`segmented-button ${config.panelChoice === option.id ? "segmented-button-active" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="field-help mt-2">
          {resolvedMode === "offline"
            ? "Deterministic test panel. No model calls; interventions cannot land during paced replay."
            : resolvedMode === "cli"
              ? "Runs authenticated local agent CLIs. Detection is not proof of a live session."
              : "Runs OpenRouter with either the server default roster or your exact six-seat assignment."}
        </p>
      </fieldset>

      {liveMode && (
        <fieldset>
          <legend className="field-label">Seat assignment</legend>
          <div className="grid grid-cols-2 gap-2 mt-2" role="group" aria-label="Seat assignment strategy">
            <button
              type="button"
              aria-pressed={config.seatingMode === "pool"}
              onClick={() => onChange({ ...config, seatingMode: "pool" })}
              className={`segmented-button ${config.seatingMode === "pool" ? "segmented-button-active" : ""}`}
            >
              {liveMode === "cli" ? "Provider pool" : "Default roster"}
            </button>
            <button
              type="button"
              aria-pressed={config.seatingMode === "exact"}
              onClick={() => onChange({ ...config, seatingMode: "exact" })}
              className={`segmented-button ${config.seatingMode === "exact" ? "segmented-button-active" : ""}`}
            >
              Exact seating
            </button>
          </div>
          <p className="field-help mt-2">
            {config.seatingMode === "exact"
              ? "Assign every constitutional seat explicitly. The accepted roster is written into the run ledger."
              : liveMode === "cli"
                ? "The six seats are staffed round-robin from the selected, locally detected CLIs."
                : "Use the server's six-seat OpenRouter defaults from the capability manifest."}
          </p>
        </fieldset>
      )}

      {liveMode === "cli" && config.seatingMode === "pool" && (
        <fieldset>
          <legend className="field-label">CLI provider pool</legend>
          <div className="flex items-start justify-between gap-3 mt-1">
            <p className="field-help">Real probes invoke each detected CLI and may use quota.</p>
            <button type="button" className="text-button" onClick={onProbe} disabled={probing}>
              {probing ? "Probing…" : "Run real probes"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {(capabilities?.cliProviders ?? Object.keys(panel?.cli ?? {})).map((provider) => {
              const detected = Boolean(panel?.cli?.[provider]?.present);
              const probe = panel?.probes?.find((item) => item.provider === provider);
              const selected = config.providers.includes(provider);
              return (
                <label
                  key={provider}
                  className={`rounded-lg border p-2.5 transition ${
                    selected ? "border-tribunal-gold/50 bg-tribunal-gold/10" : "border-zinc-800 bg-zinc-950/30"
                  } ${!detected ? "opacity-45" : "cursor-pointer"}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!detected}
                      onChange={() =>
                        onChange({
                          ...config,
                          providers: selected
                            ? config.providers.filter((item) => item !== provider)
                            : [...config.providers, provider],
                        })
                      }
                    />
                    <span className="capitalize text-sm text-zinc-200">{provider}</span>
                  </span>
                  <span className={`mt-1.5 block text-[10px] ${probe?.live ? "text-emerald-300" : "text-zinc-500"}`}>
                    {probe
                      ? `${probe.live ? "verified live" : "probe failed"} · ${formatDuration(probe.latencyMs)}`
                      : detected
                        ? "binary detected"
                        : "not detected"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {liveMode && config.seatingMode === "exact" && (
        <fieldset className="rounded-xl border border-zinc-800 bg-zinc-950/25 p-3">
          <legend className="field-label px-1">Exact six-seat roster</legend>
          <div className="flex items-start justify-between gap-3">
            <p className="field-help max-w-sm">
              {liveMode === "cli"
                ? "Choose the authenticated CLI for each seat. Tribunal does not send a model override; each CLI uses its own configured model."
                : "Choose a model vendor and exact OpenRouter slug for every seat."}
            </p>
            <div className="flex flex-wrap justify-end gap-1">
              {liveMode === "cli" && (
                <button type="button" className="text-button shrink-0" onClick={onProbe} disabled={probing}>
                  {probing ? "Probing…" : "Run real probes"}
                </button>
              )}
              <button type="button" className="text-button shrink-0" onClick={resetExactAssignments}>
                Reset defaults
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {SOCIETIES.map((society, index) => {
              const seat = config.assignments[liveMode][society];
              const charter = capabilities?.charters.find((item) => item.society === society);
              const error = seatError(liveMode, society, seat, panel, capabilities);
              const providerId = `seat-${liveMode}-${society}-provider`;
              const modelId = `seat-${liveMode}-${society}-model`;
              const errorId = `seat-${liveMode}-${society}-error`;
              const providers =
                liveMode === "cli"
                  ? capabilities?.cliProviders ?? []
                  : capabilities?.openrouterProviders ?? [];

              return (
                <div
                  key={society}
                  className={`rounded-lg border p-3 ${error ? "border-rose-400/30 bg-rose-500/[0.04]" : "border-zinc-800 bg-zinc-950/35"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-zinc-200 capitalize">
                        {index + 1}. {societyLabel(society)}
                      </p>
                      {charter && <p className="text-[10px] text-zinc-500 mt-0.5">{charter.title}</p>}
                    </div>
                    {liveMode === "cli" && (
                      <span className={`status-chip ${panel?.cli?.[seat.provider]?.present ? "status-chip-live" : "status-chip-error"}`}>
                        {panel?.cli?.[seat.provider]?.present ? "detected" : "unavailable"}
                      </span>
                    )}
                  </div>

                  <div className={`grid gap-2 mt-2.5 ${liveMode === "openrouter" ? "sm:grid-cols-[0.8fr_1.2fr]" : "grid-cols-1"}`}>
                    <label htmlFor={providerId}>
                      <span className="field-label">{liveMode === "cli" ? "CLI provider" : "Model vendor"}</span>
                      <select
                        id={providerId}
                        className={`${controlClass} mt-1`}
                        value={seat.provider}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) => updateSeatProvider(society, event.target.value)}
                      >
                        <option value="" disabled>Choose…</option>
                        {providers.map((provider) => (
                          <option
                            key={provider}
                            value={provider}
                            disabled={liveMode === "cli" && !panel?.cli?.[provider]?.present}
                          >
                            {provider}
                            {liveMode === "cli" && !panel?.cli?.[provider]?.present ? " (not detected)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    {liveMode === "openrouter" && (
                      <label htmlFor={modelId}>
                        <span className="field-label">OpenRouter model slug</span>
                        <input
                          id={modelId}
                          className={`${controlClass} mt-1 font-mono text-xs`}
                          value={seat.model ?? ""}
                          placeholder={`${OPENROUTER_PREFIX[seat.provider] || seat.provider || "vendor"}/model-name`}
                          spellCheck={false}
                          autoComplete="off"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? errorId : undefined}
                          onChange={(event) => updateSeat(society, { ...seat, model: event.target.value })}
                        />
                      </label>
                    )}
                  </div>

                  {error && (
                    <p id={errorId} className="text-[10px] text-rose-300 mt-2" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <details className="rounded-xl border border-zinc-800 bg-zinc-950/25 p-3" open>
        <summary className="cursor-pointer text-sm font-medium text-zinc-300">Procedure and ablations</summary>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <label>
            <span className="field-label">Seed</span>
            <input
              className={`${controlClass} mt-1.5`}
              type="number"
              min={capabilities?.limits.seed.min ?? 0}
              max={capabilities?.limits.seed.max ?? 4294967295}
              value={config.seed}
              onChange={(event) => onChange({ ...config, seed: Number(event.target.value) })}
            />
          </label>
          <label>
            <span className="field-label">Span budget</span>
            <input
              className={`${controlClass} mt-1.5`}
              type="number"
              min={capabilities?.limits.maxSpans.min ?? 1}
              max={capabilities?.limits.maxSpans.max ?? 64}
              value={config.maxSpans}
              onChange={(event) => onChange({ ...config, maxSpans: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="space-y-2 mt-4">
          {(Object.keys(FLAG_META) as (keyof ControlFlags)[]).map((key) => {
            const enabled = key === "debateRounds" ? config.flags.debateRounds > 0 : Boolean(config.flags[key]);
            return (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggleFlag(key)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/30 p-2.5 text-left flex items-start gap-3 hover:border-zinc-700"
              >
                <span className={`switch-track ${enabled ? "switch-track-on" : ""}`} aria-hidden="true">
                  <span className={`switch-thumb ${enabled ? "translate-x-4" : "translate-x-0"}`} />
                </span>
                <span>
                  <span className="block text-xs font-medium text-zinc-200">{FLAG_META[key].label}</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">{FLAG_META[key].note}</span>
                </span>
              </button>
            );
          })}
        </div>

        <label className="block mt-4">
          <span className="field-label">Default client presentation</span>
          <select
            className={`${controlClass} mt-1.5`}
            value={config.clientView}
            onChange={(event) =>
              onChange({
                ...config,
                clientView: event.target.value as OperatorConfig["clientView"],
              })
            }
          >
            <option value="answer_plus_summary">Answer + deliberation summary</option>
            <option value="answer_only">Answer only until operator opens the record</option>
          </select>
          <span className="field-help mt-1 block">The full ledger is always recorded and available to the operator.</span>
        </label>
      </details>

      {capabilities?.charters?.length ? (
        <details className="rounded-xl border border-zinc-800 bg-zinc-950/25 p-3">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            Six seat charters and powers
          </summary>
          <div className="mt-3 space-y-2">
            {capabilities.charters.map((charter) => (
              <article key={charter.society} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-zinc-200">{charter.title}</p>
                    <p className="text-[10px] text-tribunal-gold mt-0.5">{charter.tagline}</p>
                  </div>
                  <span className="status-chip status-chip-neutral capitalize">{charter.society.replace(/_/g, " ")}</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">{charter.mandate}</p>
                <p className="text-[10px] text-zinc-600 mt-2">Powers: {charter.powers.join(" · ")}</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      {validationErrors.length > 0 && (
        <div id="panel-config-error" className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] px-3 py-2.5" role="alert">
          <p className="text-[11px] text-rose-300">{validationErrors[0]}</p>
          {validationErrors.length > 1 && (
            <p className="text-[10px] text-rose-300/70 mt-1">{validationErrors.length - 1} more seat assignment issue(s).</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!pack || busy || validationErrors.length > 0}
        aria-describedby={validationErrors.length ? "panel-config-error" : undefined}
        className="primary-button w-full"
        data-testid="start-run"
      >
        {busy ? "Opening proceeding…" : `Convene ${pack?.title ?? "selected case"}`}
      </button>
    </section>
  );
}

export function CaseFilePanel({ pack }: { pack: PackSummary }) {
  const meta = DOMAIN_META[pack.domain] ?? { label: pack.domain, statute: "", color: "text-zinc-200" };
  return (
    <section className="glass p-4 md:p-5" aria-labelledby="case-file-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`eyebrow ${meta.color}`}>{meta.label} docket</p>
          <h2 id="case-file-title" className="font-serif text-2xl mt-1">{pack.title}</h2>
          <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{pack.question}</p>
        </div>
        <span className="status-chip status-chip-neutral shrink-0">{meta.statute}</span>
      </div>
      <p className="text-sm text-zinc-400 mt-4 leading-relaxed">{pack.problemStatement}</p>

      <div className="grid sm:grid-cols-3 gap-2 mt-5">
        <CaseMetric label="Rules" value={pack.constraints.length} />
        <CaseMetric label="Evidence items" value={pack.evidence.length} />
        <CaseMetric label="Decision slots" value={pack.slots.length} />
      </div>

      <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3">
        <p className="field-label text-amber-200/80">Planted control</p>
        <p className="text-xs text-amber-100/70 mt-1 leading-relaxed">{pack.trapNote}</p>
      </div>

      <div className="mt-4 space-y-2">
        <CaseSection title={`Binding constraints · ${pack.constraints.length}`}>
          <ul className="divide-y divide-zinc-800/80">
            {pack.constraints.map((item) => (
              <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="status-chip status-chip-neutral">{item.kind}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{item.id}</span>
                </div>
                <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{item.text}</p>
                {item.cite && <p className="text-[10px] text-zinc-500 mt-1">{item.cite}</p>}
              </li>
            ))}
          </ul>
        </CaseSection>

        <CaseSection title={`Evidence register · ${pack.evidence.length}`}>
          <ul className="space-y-2">
            {pack.evidence.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] text-tribunal-mint">{item.id} · {item.source}</span>
                  <span className="font-mono text-[10px] text-zinc-500">quality {Math.round(item.quality * 100)}%</span>
                </div>
                <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{item.summary}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{item.citation}</p>
                {item.contradicts?.length ? (
                  <p className="text-[10px] text-rose-300 mt-1">Contradicts {item.contradicts.join(", ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CaseSection>

        <CaseSection title={`Source documents · ${pack.documents.length}`}>
          <div className="space-y-3">
            {pack.documents.map((document) => (
              <article key={document.id}>
                <p className="text-xs font-medium text-zinc-200">{document.title}</p>
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{document.id}</p>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{document.body}</p>
              </article>
            ))}
          </div>
        </CaseSection>

        <CaseSection title={`Decision sequence · ${pack.slots.length}`}>
          <ol className="space-y-3">
            {pack.slots.map((slot) => (
              <li key={slot.index} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tribunal-gold/10 font-mono text-[10px] text-tribunal-gold">
                  {slot.index + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-zinc-200">{slot.label}</p>
                  {slot.instruction && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{slot.instruction}</p>}
                </div>
              </li>
            ))}
          </ol>
        </CaseSection>
      </div>
    </section>
  );
}

function CaseMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2">
      <p className="font-serif text-xl text-zinc-200">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}

function CaseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-950/20 p-3">
      <summary className="cursor-pointer text-xs font-medium text-zinc-300">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export interface InterventionDraft {
  actor: string;
  kind: InterventionKind;
  channel: InterventionChannel;
  text: string;
  targetKey?: string;
  spanIndex: number;
}

export interface InterventionQueueView extends InterventionDraft {
  interventionId: string;
  state: "queued" | "processing" | "applied" | "not_applied";
  willApplyAtSpan?: number;
}

export function InterventionConsole({
  canIntervene,
  currentSpan,
  candidates,
  pendingMessage,
  queue,
  onSubmit,
  onCancel,
}: {
  canIntervene: boolean;
  currentSpan: number;
  candidates: { key: string; text: string; isStop: boolean; vetoed: boolean }[];
  pendingMessage: string;
  queue: InterventionQueueView[];
  onSubmit: (draft: InterventionDraft) => Promise<void>;
  onCancel: (interventionId: string) => Promise<void>;
}) {
  const [actor, setActor] = useState("Human auditor");
  const [kind, setKind] = useState<InterventionKind>("objection");
  const [channel, setChannel] = useState<InterventionChannel>("typed");
  const [text, setText] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [spanIndex, setSpanIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const targetOptions = candidates.filter((candidate) => !candidate.vetoed);

  useEffect(() => {
    setSpanIndex(-1);
  }, [currentSpan]);

  useEffect(() => {
    if (targetKey && !targetOptions.some((candidate) => candidate.key === targetKey)) setTargetKey("");
  }, [targetKey, targetOptions]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || (kind === "veto" && !targetKey)) return;
    setSubmitting(true);
    try {
      await onSubmit({
        actor: actor.trim() || "Human auditor",
        kind,
        channel,
        text: text.trim(),
        targetKey: targetKey || undefined,
        spanIndex,
      });
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="glass p-4" aria-labelledby="intervention-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Auditor in the loop</p>
          <h3 id="intervention-title" className="text-sm font-semibold text-zinc-200 mt-1">Intervene on the record</h3>
        </div>
        <span className={`status-chip ${canIntervene ? "status-chip-live" : "status-chip-neutral"}`}>
          {canIntervene ? "checkpoint open" : "read only"}
        </span>
      </div>
      <form className="space-y-3 mt-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="field-label">Action</span>
            <select className={`${controlClass} mt-1.5`} value={kind} onChange={(event) => setKind(event.target.value as InterventionKind)} disabled={!canIntervene}>
              <option value="objection">Objection</option>
              <option value="veto">Binding veto</option>
              <option value="question">Question</option>
              <option value="affirm">Affirm</option>
            </select>
          </label>
          <label>
            <span className="field-label">Channel</span>
            <select className={`${controlClass} mt-1.5`} value={channel} onChange={(event) => setChannel(event.target.value as InterventionChannel)} disabled={!canIntervene}>
              <option value="typed">Typed</option>
              <option value="voice">Voice transcript</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="field-label">Actor</span>
          <input className={`${controlClass} mt-1.5`} value={actor} onChange={(event) => setActor(event.target.value)} disabled={!canIntervene} />
        </label>
        <label className="block">
          <span className="field-label">Apply at</span>
          <select className={`${controlClass} mt-1.5`} value={spanIndex} onChange={(event) => setSpanIndex(Number(event.target.value))} disabled={!canIntervene}>
            <option value={-1}>Next available checkpoint</option>
            <option value={currentSpan}>Current span {currentSpan + 1}</option>
          </select>
        </label>
        {(kind === "veto" || targetOptions.length > 0) && (
          <label className="block">
            <span className="field-label">Candidate target {kind === "veto" ? "· required" : "· optional"}</span>
            <select className={`${controlClass} mt-1.5`} value={targetKey} onChange={(event) => setTargetKey(event.target.value)} disabled={!canIntervene}>
              <option value="">No specific candidate</option>
              {targetOptions.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.isStop ? "STOP" : candidate.text || candidate.key}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="field-label">Public text</span>
          <textarea
            className={`${controlClass} mt-1.5 min-h-24 resize-y`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="State the reason that should enter the ledger."
            disabled={!canIntervene}
          />
        </label>
        <button type="submit" className="secondary-button w-full" disabled={!canIntervene || submitting || !text.trim() || (kind === "veto" && !targetKey)}>
          {submitting ? "Queueing…" : "Queue intervention"}
        </button>
      </form>
      <p className="field-help mt-3" aria-live="polite">
        {pendingMessage || (canIntervene
          ? "Queued is not applied: receipt is proven only when a human_intervention event appears."
          : "Live interventions require a running CLI or OpenRouter panel.")}
      </p>
      {queue.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800" aria-label="Intervention queue">
          {queue.map((item) => (
            <li key={item.interventionId} className="p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-300 truncate">
                    <span className="uppercase text-[9px] text-sky-300 mr-1">{item.kind}</span>
                    {item.text}
                  </p>
                  <p className="font-mono text-[9px] text-zinc-600 mt-1 break-all">{item.interventionId}</p>
                </div>
                <span className={`status-chip ${item.state === "applied" ? "status-chip-live" : item.state === "not_applied" ? "status-chip-error" : "status-chip-neutral"}`}>
                  {item.state.replace("_", " ")}
                </span>
              </div>
              {item.state === "queued" && canIntervene && (
                <button type="button" className="text-button mt-2" onClick={() => onCancel(item.interventionId)}>
                  Remove before application
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function LedgerExplorer({
  events,
  selectedSeq,
  onSelectSeq,
}: {
  events: LedgerEvent[];
  selectedSeq: number | null;
  onSelectSeq: (seq: number) => void;
}) {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const kinds = useMemo(() => [...new Set(events.map((event) => event.kind))].sort(), [events]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (kind !== "all" && event.kind !== kind) return false;
      if (!needle) return true;
      return `${event.kind} ${event.seq} ${JSON.stringify(event.payload)}`.toLowerCase().includes(needle);
    });
  }, [events, kind, query]);
  const selected = events.find((event) => event.seq === selectedSeq) ?? filtered.at(-1) ?? null;

  return (
    <section className="glass overflow-hidden" aria-labelledby="ledger-explorer-title">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Verdict ledger</p>
            <h3 id="ledger-explorer-title" className="text-sm font-semibold text-zinc-200 mt-1">Inspect every event and payload</h3>
          </div>
          <span className="status-chip status-chip-neutral">{events.length} events</span>
        </div>
        <div className="grid sm:grid-cols-[180px_1fr] gap-2 mt-4">
          <select className={controlClass} value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Filter ledger by event kind">
            <option value="all">All event kinds</option>
            {kinds.map((item) => <option key={item} value={item}>{EVENT_LABELS[item] ?? item}</option>)}
          </select>
          <input className={controlClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payload text, event kind or sequence" aria-label="Search ledger" />
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] min-h-[420px]">
        <div className="max-h-[520px] overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-800">
          {filtered.map((event) => (
            <button
              key={`${event.runId}:${event.seq}`}
              type="button"
              onClick={() => onSelectSeq(event.seq)}
              className={`w-full border-b border-zinc-800/70 px-3 py-2.5 text-left transition hover:bg-zinc-800/40 ${selected?.seq === event.seq ? "bg-tribunal-gold/[0.08] border-l-2 border-l-tribunal-gold" : ""}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-200">{EVENT_LABELS[event.kind] ?? event.kind}</span>
                <span className="font-mono text-[10px] text-zinc-500">#{event.seq}</span>
              </span>
              <span className="mt-1 block truncate font-mono text-[10px] text-zinc-600">{event.hash}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="p-5 text-xs text-zinc-500">No events match this filter.</p>}
        </div>
        <div className="min-w-0 p-4 bg-zinc-950/20">
          {selected ? (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-[10px] font-mono">
                <HashField label="Event hash" value={selected.hash} />
                <HashField label="Previous hash" value={selected.prevHash} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="status-chip status-chip-neutral">seq {selected.seq}</span>
                <span className="status-chip status-chip-neutral">span {selected.spanIndex ?? "run"}</span>
                <span className="status-chip status-chip-neutral">{selected.kind}</span>
              </div>
              <pre className="mt-4 max-h-[390px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                {JSON.stringify(selected.payload, null, 2)}
              </pre>
            </>
          ) : (
            <p className="text-xs text-zinc-500">Select an event to inspect its public payload and hash linkage.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function HashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 min-w-0">
      <p className="uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="text-zinc-400 break-all mt-1">{value}</p>
    </div>
  );
}

export function TelemetryPanel({ telemetry }: { telemetry: RunTelemetry }) {
  return (
    <section className="glass p-4">
      <p className="eyebrow">Run telemetry</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <TelemetryValue label="Provider calls" value={telemetry.calls} />
        <TelemetryValue label="Failures" value={telemetry.failures} alert={telemetry.failures > 0} />
        {telemetry.cancelledCalls > 0 && <TelemetryValue label="Cancelled calls" value={telemetry.cancelledCalls} />}
        <TelemetryValue label="Output tokens" value={telemetry.tokensOut.toLocaleString()} />
        <TelemetryValue label="Panel latency" value={formatDuration(telemetry.latencyMs)} />
        <TelemetryValue label="Field repairs" value={telemetry.repaired} alert={telemetry.repaired > 0} />
        <TelemetryValue label="Stop reason" value={telemetry.stoppedBy?.replace(/_/g, " ") ?? "pending"} />
      </div>
      {telemetry.panel.length > 0 && (
        <details className="mt-3 rounded-lg border border-zinc-800 p-2.5">
          <summary className="cursor-pointer text-xs text-zinc-300">Seat and model roster</summary>
          <ul className="mt-2 divide-y divide-zinc-800/80">
            {telemetry.panel.map((seat) => (
              <li key={seat.seatId} className="py-2 first:pt-0 last:pb-0">
                <p className="text-[11px] text-zinc-300 capitalize">{seat.society.replace(/_/g, " ")} · {seat.provider}</p>
                <p className="font-mono text-[10px] text-zinc-600 mt-0.5 break-all">{seat.model}</p>
                {seat.modelSource && (
                  <p className="text-[9px] text-zinc-600 mt-0.5">
                    {seat.modelSource === "cli_config" ? "reported as CLI-configured, not API-confirmed" : `model source: ${seat.modelSource.replace("_", " ")}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {telemetry.servedModels.some((item) => item.servingProvider || item.requestedModel !== item.model) && (
        <details className="mt-3 rounded-lg border border-zinc-800 p-2.5">
          <summary className="cursor-pointer text-xs text-zinc-300">Router-reported serving provenance</summary>
          <ul className="mt-2 divide-y divide-zinc-800/80">
            {telemetry.servedModels.map((item) => (
              <li key={item.seatId} className="py-2 first:pt-0 last:pb-0">
                <p className="font-mono text-[10px] text-zinc-400 break-all">{item.model}</p>
                <p className="text-[9px] text-zinc-600 mt-0.5">
                  {item.servingProvider ? `served by ${item.servingProvider}` : "serving host not reported"}
                  {item.requestedModel && item.requestedModel !== item.model ? ` · requested ${item.requestedModel}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function TelemetryValue({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-2.5">
      <p className={`text-sm font-medium ${alert ? "text-rose-300" : "text-zinc-200"}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-zinc-600 mt-0.5">{label}</p>
    </div>
  );
}

export function RunLibrary({
  live,
  recorded,
  onAttach,
  onReplay,
  onOpen,
  onImport,
}: {
  live: RunMeta[];
  recorded: RunMeta[];
  onAttach: (run: RunMeta) => void;
  onReplay: (run: RunMeta) => void;
  onOpen: (run: RunMeta) => void;
  onImport: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return recorded;
    return recorded.filter((run) => `${run.label} ${run.runId} ${run.artifactId ?? ""}`.toLowerCase().includes(needle));
  }, [recorded, query]);
  const fileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-5">
      <section className="glass p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Run registry</p>
            <h2 className="font-serif text-2xl mt-1">Live proceedings</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
            Import ledger JSON
          </button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={fileChanged} />
        </div>
        {live.length ? (
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {live.map((run) => (
              <article key={run.runId} className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="status-chip status-chip-live">{run.status ?? "live"}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{run.events ?? 0} events</span>
                </div>
                <h3 className="text-sm text-zinc-200 mt-3">{run.label}</h3>
                <p className="font-mono text-[10px] text-zinc-600 mt-1">{compactRunId(run.runId)}</p>
                <button type="button" className="secondary-button w-full mt-4" onClick={() => onAttach(run)}>Attach to live stream</button>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mt-4">No live proceedings are registered on this server.</p>
        )}
      </section>

      <section className="glass p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Persisted artifacts</p>
            <h2 className="font-serif text-2xl mt-1">Recorded ledgers</h2>
            <p className="text-xs text-zinc-500 mt-1">Stored head hashes are externally anchorable; storage alone is not an external anchor.</p>
          </div>
          <input className={`${controlClass} sm:w-72`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter runs" aria-label="Filter recorded runs" />
        </div>
        <div className="space-y-2 mt-4">
          {filtered.map((run) => {
            const storageKey = run.artifactId ?? run.runId;
            const isCollisionCopy = storageKey !== run.runId;
            return (
              <article key={storageKey} className="rounded-lg border border-zinc-800 bg-zinc-950/25 p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-chip ${run.verified ? "status-chip-live" : "status-chip-neutral"}`}>{run.verified ? "verified at write" : "recorded"}</span>
                    <span className="status-chip status-chip-neutral">{run.mode}</span>
                    {run.auditability && <span className="status-chip status-chip-neutral">audit {run.auditability}</span>}
                    {isCollisionCopy && <span className="status-chip status-chip-warn">distinct artifact</span>}
                  </div>
                  <p className="text-xs text-zinc-300 mt-2 truncate">{run.label}</p>
                  <p className="font-mono text-[10px] text-zinc-600 mt-1 truncate" title={storageKey}>{storageKey}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="text-button" onClick={() => onOpen(run)}>Open</button>
                  <button type="button" className="secondary-button" onClick={() => onReplay(run)}>Replay</button>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-zinc-500 py-4">No recorded ledgers match this filter.</p>}
        </div>
      </section>
    </div>
  );
}
