/**
 * ForgeShell — la **coquille de la forge à trois ateliers** (E2b §9) : barre supérieure (marque +
 * onglets `Team · Méthode · Kit` + charte + Réglages + « Livrer au Cockpit → »), puis — sous les
 * onglets — la **barre de gestes fichier** (`DocBar`) et le **titre de document** (`DocTitle`) de
 * l'onglet actif, enfin l'atelier dans un `.workbench`.
 *
 * Chaque onglet est un **document** (`useForgeDocument`, Q-1) : New/Open/Save/Save As/Close +
 * dirty + persistance `.md` dans la bibliothèque `iakaframe` (`IAKAFRAME_HOME`). Team/Méthode/Kit
 * s'instancient avec leur collection, leur gabarit vierge et leurs (dé)sérialiseurs frontmatter
 * (via `mappers`). Le « repart à zéro » de Méthode et Kit est **résolu** (persistance réelle).
 */
import { useEffect, useRef, useState } from "react";
import {
  buildTeamFromRoster,
  serializeTeamMd,
  serializeMethodMd,
  serializeKitMd,
  parseTeamMd,
  parseMethodMd,
  parseKitMd,
  DEFAULT_KIT_NODE,
  type Kit,
  type Method,
  type Team,
} from "@iakaframe/core";
import { useForgeHandoff } from "../hooks/useForgeHandoff";
import { useForgeDocument } from "./useForgeDocument";
import { IAKAFRAME_STARTER_METHOD } from "./useForgeMethod";
import { insertMethodRef, type MethodRef } from "./methodEdit";
import {
  teamToMd,
  mdToTeam,
  methodToMd,
  mdToMethod,
  kitToMd,
  mdToKit,
} from "./mappers";
import { CharteSelector } from "../components/CharteSelector";
import { SettingsRoot } from "../components/SettingsRoot";
import { DocBar } from "./DocBar";
import { DocTitle } from "./DocTitle";
import { TeamAtelier } from "./ateliers/TeamAtelier";
import { MethodeAtelier } from "./ateliers/MethodeAtelier";
import { KitAtelier } from "./ateliers/KitAtelier";

type Tab = "team" | "methode" | "kit";

const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "team", label: "Team", sub: "casting pur" },
  { key: "methode", label: "Méthode", sub: "discipline · workflow" },
  { key: "kit", label: "Kit", sub: "assemblage total" },
];

/** Corps `.md` minimal généré au Save (renvoie au récit humain de la bibliothèque). */
const teamBody = (t: Team): string =>
  `# ${t.name}\n\nAssemblage de casting (ids de \`library/personas/\`). Forgé par iakaFrameGUI.\n`;
const methodBody = (m: Method): string =>
  `# ${m.name}\n\nAssemblage de discipline (ids vers \`library/*\`). Forgé par iakaFrameGUI.\n`;
const kitBody = (k: Kit): string =>
  `# Kit ${k.id || "sans-titre"}\n\nManifeste d'assemblage (méthode + team + binding). Forgé par iakaFrameGUI.\n`;

export function ForgeShell() {
  const handoff = useForgeHandoff();
  const [tab, setTab] = useState<Tab>("team");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // --- Trois documents (Q-1) : Team · Méthode · Kit ---
  const teamDoc = useForgeDocument<Team>({
    collection: "teams",
    blank: () => buildTeamFromRoster("Team iakaframe", "iakaframe"),
    serialize: (t) => serializeTeamMd(teamToMd(t), teamBody(t)),
    parse: (txt) => {
      const md = parseTeamMd(txt);
      return md ? mdToTeam(md) : null;
    },
    idOf: (t) => t.id,
    nameOf: (t) => t.name,
  });

  const methodDoc = useForgeDocument<Method>({
    collection: "methods",
    blank: () => ({ ...IAKAFRAME_STARTER_METHOD }),
    serialize: (m) => serializeMethodMd(methodToMd(m), methodBody(m)),
    parse: (txt) => {
      const md = parseMethodMd(txt);
      return md ? mdToMethod(md) : null;
    },
    idOf: (m) => m.id,
    nameOf: (m) => m.name,
  });

  const kitDoc = useForgeDocument<Kit>({
    collection: "kits",
    blank: (): Kit => ({
      id: "iakaframe-kit",
      methodId: "iakaframe",
      teamId: "iakaframe",
      node: DEFAULT_KIT_NODE,
    }),
    serialize: (k) => serializeKitMd(kitToMd(k), kitBody(k)),
    parse: (txt) => {
      const md = parseKitMd(txt);
      return md ? mdToKit(md) : null;
    },
    idOf: (k) => k.id,
    nameOf: (k) => k.id,
  });

  // Sème un artefact vierge dans chaque onglet au premier montage (un élément à éditer).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    teamDoc.requestNew();
    methodDoc.requestNew();
    kitDoc.requestNew();
  }, [teamDoc, methodDoc, kitDoc]);

  const team = teamDoc.artifact;
  const method = methodDoc.artifact;
  const kit = kitDoc.artifact;

  const activeDoc = (
    tab === "team" ? teamDoc : tab === "methode" ? methodDoc : kitDoc
  ) as unknown as import("./useForgeDocument").UseForgeDocument<unknown>;

  return (
    <div className="forge">
      <div className="topbar">
        <span className="brand">
          iaka<span className="f">Frame</span>GUI
        </span>
        <div className="tabs" role="tablist" aria-label="Ateliers de la forge">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab${tab === t.key ? " on" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="subl">{t.sub}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="charte-pick">
          <CharteSelector />
        </span>
        <button
          type="button"
          className="settings-toggle"
          aria-pressed={settingsOpen}
          title="Réglages — racine de la bibliothèque"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          Réglages
        </button>
        <button
          type="button"
          className="to-cockpit"
          disabled={team === null || handoff.delivering}
          title={team ? "Livrer le kit assemblé au Cockpit (handoff)" : "Aucune team à livrer"}
          onClick={() => team && void handoff.deliver(team)}
        >
          <span className="d" />
          {handoff.delivering ? "Livraison…" : "Livrer au Cockpit →"}
        </button>
      </div>

      {/* Barre de gestes fichier + titre de document de l'onglet actif. */}
      <DocBar doc={activeDoc} />
      <DocTitle name={activeDoc.name} dirty={activeDoc.dirty} />

      {settingsOpen && (
        <div className="settings-panel">
          <SettingsRoot />
        </div>
      )}

      <div className="workbench">
        {tab === "team" ? (
          team === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <TeamAtelier team={team} onTeamChange={(t) => teamDoc.edit(t)} />
          )
        ) : tab === "methode" ? (
          method === null ? (
            <div className="edit">
              <p className="empty">Aucun artefact ouvert — New ou Open.</p>
            </div>
          ) : (
            <MethodeAtelier
              method={method}
              insert={(ref: MethodRef, id: string) =>
                methodDoc.edit(insertMethodRef(method, ref, id))
              }
            />
          )
        ) : kit === null ? (
          <div className="edit">
            <p className="empty">Aucun artefact ouvert — New ou Open.</p>
          </div>
        ) : (
          <KitAtelier
            method={method ?? { ...IAKAFRAME_STARTER_METHOD }}
            team={team ?? buildTeamFromRoster("Team iakaframe", "iakaframe")}
            kit={kit}
            onKitChange={(updater) =>
              kitDoc.edit(typeof updater === "function" ? updater(kit) : updater)
            }
          />
        )}
      </div>

      {handoff.result && (
        <div style={{ padding: "8px 22px" }}>
          {handoff.result.error ? (
            <p className="empty" role="alert">
              Échec de la livraison : {handoff.result.error}
            </p>
          ) : (
            <p className="empty">
              Livré dans <code>{handoff.result.dir}</code> — empreinte{" "}
              <code>{handoff.result.originHash}</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
