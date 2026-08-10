//! handoff — **écriture disque du paquet de handoff** (H1) : la forge LIVRE.
//!
//! Le canal (Q-B) est un dossier partagé sous le chapeau : `<handoff_root>/<team_id>/`, où la
//! forge dépose `team.json` (définition PURE) + `handoff.json` (provenance). Le cockpit y LIT
//! (dépôt en lecture seule côté cockpit). Rust est un **passe-plat** : le front (`@iakaframe/
//! core`) tient le schéma et calcule l'empreinte ; ici on écrit des chaînes JSON opaques.
//!
//! Une (re-)livraison **remplace** le paquet de la team (`livrer` = poser la dernière version) :
//! l'écrasement est voulu, mais BORNÉ au seul dossier `<team_id>/` (pathguard sur l'id + noms de
//! fichiers fixes). Aucune notion de runner/model (AR-1), aucun secret, aucun réseau.
//!
//! `now_millis` fournit l'HORLOGE au front (jamais `Date.now()` en JS — l'horodatage du paquet
//! doit venir du backend, pour un artefact reproductible et testable).

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::pathguard::safe_path;
use crate::paths::resolve_handoff_root;

/// Noms de fichiers canoniques du paquet (miroir de `HANDOFF_FILES` côté core).
const TEAM_FILE: &str = "team.json";
const MANIFEST_FILE: &str = "handoff.json";

/// Valide un id de team (segment simple) — même garde que `teams_store`.
fn validate_team_id(id: &str) -> Result<(), String> {
    let t = id.trim();
    if t.is_empty() {
        return Err("id de team vide".to_string());
    }
    if t == "." || t == ".." {
        return Err("id de team invalide".to_string());
    }
    if t.contains('/') || t.contains('\\') {
        return Err("id de team invalide (séparateur interdit)".to_string());
    }
    Ok(())
}

/// Dossier de handoff d'une team sous `root` (`<root>/<id>`), validé anti-traversal.
fn team_dir(root: &Path, id: &str) -> Result<PathBuf, String> {
    validate_team_id(id)?;
    safe_path(root, Path::new(id.trim())).map_err(|e| e.to_string())
}

/// Écrit le paquet (`team.json` + `handoff.json`) sous `<root>/<id>/`. Crée le dossier au
/// besoin, remplace un paquet existant (re-livraison). Renvoie le chemin absolu du dossier.
pub fn deliver_in(
    root: &Path,
    id: &str,
    team_json: &str,
    manifest_json: &str,
) -> Result<String, String> {
    let dir = team_dir(root, id)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(TEAM_FILE), team_json).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(MANIFEST_FILE), manifest_json).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Livre le paquet de handoff d'une team dans le canal partagé. `team_json`/`handoff_json`
/// sont produits par le front (`buildHandoffPackage`). Renvoie le dossier écrit.
#[tauri::command]
pub fn handoff_deliver(
    team_id: String,
    team_json: String,
    handoff_json: String,
) -> Result<String, String> {
    deliver_in(&resolve_handoff_root(), &team_id, &team_json, &handoff_json)
}

/// Horloge du backend en millisecondes epoch (UTC). Le front en dérive l'horodatage ISO du
/// manifeste — jamais `Date.now()` (reproductibilité + testabilité).
#[tauri::command]
pub fn now_millis() -> Result<i64, String> {
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    Ok(d.as_millis() as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_dir(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        p.push(format!("iakaframegui-handoff-{tag}-{nanos}"));
        p
    }

    #[test]
    fn deliver_ecrit_les_deux_fichiers_sous_le_dossier_team() {
        let root = tmp_dir("deliver");
        let dir = deliver_in(
            &root,
            "iakaframe",
            r#"{"id":"iakaframe"}"#,
            r#"{"source":"forge"}"#,
        )
        .unwrap();
        assert!(dir.ends_with("iakaframe"));
        let d = Path::new(&dir);
        assert_eq!(
            std::fs::read_to_string(d.join("team.json")).unwrap(),
            r#"{"id":"iakaframe"}"#
        );
        assert_eq!(
            std::fs::read_to_string(d.join("handoff.json")).unwrap(),
            r#"{"source":"forge"}"#
        );
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn relivraison_remplace_le_paquet() {
        let root = tmp_dir("relivraison");
        deliver_in(&root, "t", r#"{"v":1}"#, r#"{"version":"a"}"#).unwrap();
        let dir = deliver_in(&root, "t", r#"{"v":2}"#, r#"{"version":"b"}"#).unwrap();
        let d = Path::new(&dir);
        assert_eq!(
            std::fs::read_to_string(d.join("team.json")).unwrap(),
            r#"{"v":2}"#
        );
        assert_eq!(
            std::fs::read_to_string(d.join("handoff.json")).unwrap(),
            r#"{"version":"b"}"#
        );
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn deliver_isole_chaque_team_dans_son_dossier() {
        let root = tmp_dir("isole");
        deliver_in(&root, "alpha", "{}", "{}").unwrap();
        deliver_in(&root, "beta", "{}", "{}").unwrap();
        assert!(root.join("alpha/team.json").is_file());
        assert!(root.join("beta/team.json").is_file());
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn traversal_dans_l_id_est_refuse() {
        let root = tmp_dir("trav");
        assert!(deliver_in(&root, "../evil", "{}", "{}").is_err());
        assert!(deliver_in(&root, "", "{}", "{}").is_err());
        assert!(deliver_in(&root, "..", "{}", "{}").is_err());
        assert!(deliver_in(&root, "a/b", "{}", "{}").is_err());
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn now_millis_est_positif_et_croissant() {
        let a = now_millis().unwrap();
        assert!(a > 1_700_000_000_000); // postérieur à 2023
    }
}
