/**
 * guardrailPersist — source réelle + écriture disque **non-destructive** du pool garde-fou (Lot 5c).
 * Calque de `principlePersist` (5b), avec un **adaptateur** : le disque porte l'atome plat
 * `GuardrailAtom {id,label,kind,hook,policy}`, tandis que l'hôte d'authoring (`guardrailKind`) parle
 * le type riche P3b `Guardrail {id,kind,label,scope,rendering}`. On mappe atome → riche pour la
 * grille (enrichissement `scope`/`rendering` depuis le catalogue par `kind`, pour l'affichage) ;
 * l'écriture, elle, ne touche que `label` (patch), préservant `kind`/`hook`/`policy` du disque à
 * l'octet. La richesse d'authoring (éditer `policy`) est différée (« champs riches », cf. instruction).
 */
import {
  patchFrontmatter,
  guardrailByKind,
  guardrailFrontmatterPatch,
  serializeGuardrailMd,
  parseGuardrail,
  parseFrontmatter,
  type Guardrail,
  type GuardrailKind,
  type GuardrailScope,
} from "@iakaframe/core";
import { backend, type Backend } from "../api/backend";
import { loadFrame } from "./frame";

/** Mappe l'atome disque → le type riche attendu par la grille (scope/rendering enrichis, display). */
function atomToRich(a: {
  id: string;
  label: string;
  kind: string;
  hook: string;
  policy: string;
}): Guardrail {
  const kind = a.kind as GuardrailKind;
  const cat = guardrailByKind(kind); // catalogue (scope/rendering d'affichage) si `kind` connu
  return {
    id: a.id,
    label: a.label,
    kind,
    scope: (cat?.scope ?? "persona") as GuardrailScope,
    rendering: cat?.rendering ?? {},
  };
}

/** Source du réservoir : les gardes-fous RÉELS parsés (`frame.guardrails`), mappés au type riche. */
export async function loadGuardrailsReservoir(api: Backend = backend): Promise<Guardrail[]> {
  try {
    return (await loadFrame(api)).guardrails.map(atomToRich);
  } catch {
    return [];
  }
}

/**
 * Persiste un garde-fou dans `<IAKAFRAME_HOME>/library/guardrails/<id>.md`. Édition → patch
 * **non-destructif** du seul `label` (relit l'atome réel, préserve `kind`/`hook`/`policy` + corps à
 * l'octet) ; création → `serializeGuardrailMd` (`hook`/`policy` vides pour un garde neuf, MVP).
 */
export async function persistGuardrail(g: Guardrail, api: Backend = backend): Promise<void> {
  const existing = await api.poolRead("guardrails", g.id);
  let md: string;
  if (existing != null) {
    // Repart de l'atome réel du disque (préserve kind/hook/policy) ; applique le `label` voulu.
    const atom = parseGuardrail(parseFrontmatter(existing).data) ?? {
      id: g.id, label: g.label, kind: g.kind, hook: "", policy: "",
    };
    md = patchFrontmatter(existing, guardrailFrontmatterPatch({ ...atom, label: g.label }));
  } else {
    md = serializeGuardrailMd({ id: g.id, label: g.label, kind: g.kind, hook: "", policy: "" });
  }
  await api.poolWrite("guardrails", g.id, md);
}
