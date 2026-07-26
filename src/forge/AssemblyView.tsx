/**
 * AssemblyView — l'écran d'ASSEMBLAGE de 1er ordre (Lot 1 pilote,
 * alignement-gui-modele-de-frame.md § 5). Il sort le récit « frères » de sa cachette (jusqu'ici
 * enfoui, en vrac, dans `OpenFramePanel` read-only) et le rend **comme la maquette validée**
 * `specs/mock/gui/03-assemblage.html` : un **frame** en nœud parent, puis **deux frères de même
 * niveau** — une **méthode** et une **team** côte à côte —, mariés par le **binding**. Jamais la
 * team imbriquée dans la méthode.
 *
 * READ-ONLY (MVP) : on charge (`loadFrame`, source unique = `buildFrame` du cœur) et on affiche ;
 * l'édition inline viendra avec la nav (Lot 2). Le seul geste mutant est la **bascule de frame
 * active** (pointeur `iakaframe.json`), reprise à l'identique d'`OpenFramePanel` (aucun 2ᵉ résolveur).
 * Aucune dérivation ne touche un contrat : la projection « frères » est une fonction pure
 * (`buildAssemblyModel`), pure addition au-dessus de `FrameAssembly` (invariant de parité § 3).
 */
import { useCallback, useEffect, useState } from "react";
import { backend, type Backend } from "../api/backend";
import { loadFrame, type Frame } from "./frame";
import { activeFrameIsDangling } from "@iakaframe/core";
import { buildAssemblyModel, type AssemblyPersonaVM } from "./assemblyModel";

/** Le pointeur désigne une frame disparue : on retombe sur `default`, mais on le DIT (I-4). */
export const DANGLING_FRAME_HINT =
  "pointeur de frame active cassé (frame introuvable dans le réservoir) — repli sur « default »";

/** Vignette d'une persona (initiales sur dégradé casté) — rendu pur du VM. */
function PersonaVignette({ p }: { p: AssemblyPersonaVM }) {
  return (
    <span
      className="mvg"
      style={{ background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }}
      aria-hidden="true"
    >
      {p.initials}
    </span>
  );
}

export function AssemblyView({ api = backend }: { api?: Backend }) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [pointer, setPointer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setFrame(await loadFrame(api));
      setPointer((await api.activeFrameId?.().catch(() => null)) ?? null);
    } catch {
      setError("Chargement du frame impossible (racine introuvable ?).");
    } finally {
      setBusy(false);
    }
  }, [api]);

  // Écran de 1er ordre : on charge au montage (contrairement au panneau « Ouvrir un frame »).
  useEffect(() => {
    void load();
  }, [load]);

  /** Bascule la frame active (pointeur `iakaframe.json`) puis recharge — repris d'`OpenFramePanel`. */
  const selectFrame = useCallback(
    async (frameId: string) => {
      setBusy(true);
      setError(null);
      try {
        await api.setActiveFrameId(frameId);
        setFrame(await loadFrame(api));
        setPointer((await api.activeFrameId?.().catch(() => null)) ?? null);
      } catch {
        setError(
          "Bascule impossible : aucun dossier de projet réglé, ou iakaframe.json illisible.",
        );
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const model = frame ? buildAssemblyModel(frame.assembly) : null;
  const integrity = frame?.integrity ?? null;
  const dangling = frame ? activeFrameIsDangling(frame.frames, pointer) : false;

  return (
    <section className="assembly-view" aria-label="Assemblage du frame — méthode + team (frères)">
      <div className="crumb">FRAMES / ASSEMBLAGE</div>
      <div className="h1">Comment un frame s'assemble</div>
      <p className="sub">
        Un <strong>frame possède deux frères</strong> de même niveau : une <strong>méthode</strong>{" "}
        (des rôles abstraits + des éléments référencés) et une <strong>team</strong> (des personas).
        Le <strong>binding</strong> les marie — par référence, jamais par copie.
      </p>

      {error && (
        <p className="load-err" role="alert">
          {error}
        </p>
      )}

      {/* Réservoir + sélecteur de frame active (réutilise la logique selectFrame). */}
      {frame && frame.frames.length > 0 && (
        <div className="frame-picker">
          <span className="lab">frame active</span>
          {frame.frames.map((f) => {
            const active = frame.assembly.frame?.id === f.id;
            return (
              <button
                key={f.id}
                type="button"
                disabled={busy || active}
                aria-pressed={active}
                title={`Méthode ${f.methodId} · Team ${f.teamId}${f.default ? " · défaut" : ""}`}
                onClick={() => void selectFrame(f.id)}
              >
                {f.name || f.id}
                {f.default ? " ★" : ""}
              </button>
            );
          })}
        </div>
      )}

      {dangling && (
        <p className="dangling" role="alert">
          {DANGLING_FRAME_HINT}
        </p>
      )}

      {model && model.hasAssembly ? (
        <>
          <div className="tree">
            {/* Nœud parent : le frame. */}
            <div className="node-frame">
              <div className="lab">FRAME</div>
              <div className="ttl">🧩 {model.frame?.name ?? "assemblage résolu"}</div>
              <div className="path">
                {model.frame ? (
                  <>
                    <b>{model.frame.id}</b>
                    {model.frame.version ? ` — ${model.frame.version}` : ""}
                    {model.frame.default ? " ★" : ""} — methodId + teamId
                  </>
                ) : (
                  <>repli legacy (1er binding) — methodId + teamId</>
                )}
              </div>
            </div>
            <div className="drop" />

            {/* Deux frères de MÊME niveau : méthode ⟷ team (jamais imbriqués). */}
            <div className="brothers">
              <div className="bcol">
                <div className="dropv" />
                <div className="frere">frère · méthode</div>
                <div className="box method">
                  <div className="bh">
                    <span className="em">🧭</span>
                    <span className="t">Méthode</span>
                    <span className="p">{model.method?.id ?? "—"}</span>
                  </div>
                  <div className="bb">
                    {model.method ? (
                      <>
                        <div className="row">
                          <div className="k">workflowId</div>
                          <div className="refchips">
                            {model.method.workflowId ? (
                              <span className="ref wf">{model.method.workflowId}</span>
                            ) : (
                              <span className="empty-ref">—</span>
                            )}
                          </div>
                        </div>
                        <div className="row">
                          <div className="k">roleKeys · rôles ABSTRAITS</div>
                          <div className="refchips">
                            {model.method.roleKeys.length > 0 ? (
                              model.method.roleKeys.map((rk) => (
                                <span className="ref rk" key={rk}>
                                  {rk}
                                </span>
                              ))
                            ) : (
                              <span className="empty-ref">—</span>
                            )}
                          </div>
                          <div className="abstract-note">la méthode ne nomme AUCUNE persona</div>
                        </div>
                        <div className="row">
                          <div className="k">principleIds</div>
                          <div className="refchips">
                            {model.method.principleIds.length > 0 ? (
                              model.method.principleIds.map((id) => (
                                <span className="ref pr" key={id}>
                                  {id}
                                </span>
                              ))
                            ) : (
                              <span className="empty-ref">—</span>
                            )}
                          </div>
                        </div>
                        <div className="row">
                          <div className="k">guardrailIds</div>
                          <div className="refchips">
                            {model.method.guardrailIds.length > 0 ? (
                              model.method.guardrailIds.map((id) => (
                                <span className="ref gd" key={id}>
                                  {id}
                                </span>
                              ))
                            ) : (
                              <span className="empty-ref">—</span>
                            )}
                          </div>
                        </div>
                        <div className="row">
                          <div className="k">ritualIds · scaffoldIds</div>
                          <div className="refchips">
                            {model.method.ritualIds.map((id) => (
                              <span className="ref rt" key={`rt-${id}`}>
                                {id}
                              </span>
                            ))}
                            {model.method.scaffoldIds.map((id) => (
                              <span className="ref sc" key={`sc-${id}`}>
                                scaffold · {id}
                              </span>
                            ))}
                            {model.method.ritualIds.length === 0 &&
                              model.method.scaffoldIds.length === 0 && (
                                <span className="empty-ref">—</span>
                              )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="empty-ref">Aucune méthode résolue dans ce frame.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bcol">
                <div className="dropv" />
                <div className="frere">frère · team</div>
                <div className="box team">
                  <div className="bh">
                    <span className="em">👥</span>
                    <span className="t">Team</span>
                    <span className="p">{model.team?.id ?? "—"}</span>
                  </div>
                  <div className="bb">
                    {model.team ? (
                      <div className="row">
                        <div className="k">
                          personas · casting
                          {model.team.coordinatorId
                            ? ` (coordinator = ${model.team.coordinatorId})`
                            : ""}
                        </div>
                        <div className="tmembers">
                          {model.team.members.length > 0 ? (
                            model.team.members.map((p) => (
                              <div className={`mem${p.isCoordinator ? " coord" : ""}`} key={p.id}>
                                <PersonaVignette p={p} />
                                <div>
                                  <div className="mn">{p.name}</div>
                                  <div className="mr">{p.roleKey ?? "—"}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="empty-ref">—</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="empty-ref">Aucune team résolue dans ce frame.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Binding — le mariage roleKey (méthode) → persona (team). */}
          {model.binding && model.binding.rows.length > 0 && (
            <div className="binding" aria-label="Binding — le mariage roleKey → persona">
              <div className="bh">
                <span className="marker" aria-hidden="true">
                  ⚭
                </span>
                <span className="t">Binding — le mariage</span>
                <span className="sub2">{model.binding.id}</span>
              </div>
              <table className="mtable">
                <thead>
                  <tr>
                    <th>roleKey (méthode)</th>
                    <th style={{ textAlign: "center" }}>marie</th>
                    <th>persona (team)</th>
                    <th>runner · model</th>
                  </tr>
                </thead>
                <tbody>
                  {model.binding.rows.map((r) => (
                    <tr key={r.persona.id}>
                      <td className="rkcell">{r.roleKey ?? "—"}</td>
                      <td className="marry" aria-label="marie">
                        ⟶
                      </td>
                      <td>
                        <div className="pcell">
                          <PersonaVignette p={r.persona} />
                          <span className="pn">{r.persona.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="runner">
                          {(r.runner || "—") + " · " + (r.model || "—")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="note">
            ⛓️
            <div>
              <b>Aucun corps d'élément n'est recopié</b> dans l'assemblage — que des <b>ids par
              référence</b>. Chaque persona de la team <b>couvre</b> un roleKey de la méthode.
            </div>
          </div>

          {/* Orphelin du mariage : un roleKey de la méthode qu'aucune persona ne couvre. */}
          {model.uncoveredRoleKeys.length > 0 && (
            <div className="note orphan" role="alert">
              ⚠️
              <div>
                <b>Rôle(s) non couvert(s)</b> par la team : {model.uncoveredRoleKeys.join(", ")} —
                aucune persona ne caste ce roleKey.
              </div>
            </div>
          )}

          {/* Verdict d'intégrité référentielle du frame (orphelin d'intégrité, source autoritaire). */}
          {integrity && (
            <div
              className={`note integrity${integrity.ok ? " ok" : " err"}`}
              role={integrity.ok ? undefined : "alert"}
            >
              {integrity.ok ? "✓" : "⚠️"}
              <div>
                {integrity.ok ? (
                  <>
                    <b>Intégrité référentielle</b> : 0 référence cassée.
                  </>
                ) : (
                  <>
                    <b>Intégrité</b> : {integrity.missing.length} référence(s) cassée(s) —{" "}
                    {integrity.missing.map((m) => `${m.source}.${m.field} → ${m.id}`).join(", ")}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        !error && (
          <p className="placeholder">
            {busy
              ? "Chargement de l'assemblage…"
              : "Aucun assemblage résolu — ouvre un frame (Réglages → racine de la bibliothèque)."}
          </p>
        )
      )}
    </section>
  );
}
