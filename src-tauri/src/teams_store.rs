//! teams_store — persistance des teams PURES en **fichiers JSON** (un par team).
//!
//! Calque de l'esprit du socle Cockpit (`config`/`pathguard`), version fichier : chaque
//! team vit dans `<workspace>/teams/<id>.json`. Rust est un **passe-plat** — il ne
//! (dé)sérialise PAS le schéma de team (le front tient le schéma via `@iakaframe/core`) :
//! il lit/écrit des chaînes JSON opaques. Aucune notion de runner/model ici (AR-1),
//! aucun secret, aucun appel réseau, aucun appel runner.
//!
//! Sécurité : l'`id` de team est validé (segment simple, non vide, sans séparateur) puis
//! le chemin est résolu via `pathguard::safe_path` (anti-traversal) — jamais hors workspace.
//!
//! Les fonctions `*_in(dir, …)` sont **pures** (dossier injecté) → testables en `cargo test`
//! sur un dossier temporaire ; les commandes Tauri ne font que résoudre le workspace réel.

use std::path::{Path, PathBuf};

use crate::pathguard::safe_path;
use crate::paths::resolve_teams_dir;

/// Extension des fichiers de team.
const TEAM_EXT: &str = "json";

/// Valide un id de team : non vide, sans séparateur de chemin ni `.`/`..`.
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

/// Chemin absolu et validé du fichier d'une team sous `dir` (`<dir>/<id>.json`).
fn team_file(dir: &Path, id: &str) -> Result<PathBuf, String> {
    validate_team_id(id)?;
    let filename = format!("{}.{}", id.trim(), TEAM_EXT);
    safe_path(dir, Path::new(&filename)).map_err(|e| e.to_string())
}

/// Liste le contenu JSON brut de chaque fichier `*.json` sous `dir` (dossier absent = `[]`).
/// Les fichiers illisibles sont ignorés (jamais d'erreur bloquante ; le front parse ensuite).
pub fn list_in(dir: &Path) -> Vec<String> {
    let mut out = Vec::new();
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return out,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some(TEAM_EXT) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                out.push(content);
            }
        }
    }
    out
}

/// Lit le contenu JSON d'une team sous `dir` (`None` si le fichier n'existe pas).
pub fn read_in(dir: &Path, id: &str) -> Result<Option<String>, String> {
    let file = team_file(dir, id)?;
    match std::fs::read_to_string(&file) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Écrit (ou remplace) le fichier team sous `dir`. Crée le dossier au besoin.
pub fn write_in(dir: &Path, id: &str, json: &str) -> Result<(), String> {
    let file = team_file(dir, id)?;
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    std::fs::write(&file, json).map_err(|e| e.to_string())
}

/// Supprime le fichier team sous `dir` (no-op si absent).
pub fn delete_in(dir: &Path, id: &str) -> Result<(), String> {
    let file = team_file(dir, id)?;
    match std::fs::remove_file(&file) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Liste le contenu JSON de chaque team du workspace.
#[tauri::command]
pub fn team_list() -> Result<Vec<String>, String> {
    Ok(list_in(&resolve_teams_dir()))
}

/// Lit le JSON d'une team (`null` si absente).
#[tauri::command]
pub fn team_read(id: String) -> Result<Option<String>, String> {
    read_in(&resolve_teams_dir(), &id)
}

/// Écrit/remplace le fichier d'une team.
#[tauri::command]
pub fn team_write(id: String, json: String) -> Result<(), String> {
    write_in(&resolve_teams_dir(), &id, &json)
}

/// Supprime le fichier d'une team.
#[tauri::command]
pub fn team_delete(id: String) -> Result<(), String> {
    delete_in(&resolve_teams_dir(), &id)
}

/// Chemin absolu du dossier des teams (affichage Réglages).
#[tauri::command]
pub fn workspace_path() -> Result<String, String> {
    Ok(resolve_teams_dir().to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Dossier temporaire unique (sans dépendance externe).
    fn tmp_dir(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        p.push(format!("iakaframegui-test-{tag}-{nanos}"));
        p
    }

    #[test]
    fn write_then_read_roundtrip() {
        let dir = tmp_dir("rt");
        let json = r#"{"id":"iakaframe","name":"iakaframe","personas":[]}"#;
        write_in(&dir, "iakaframe", json).unwrap();
        assert_eq!(read_in(&dir, "iakaframe").unwrap(), Some(json.to_string()));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_absent_renvoie_none() {
        let dir = tmp_dir("absent");
        std::fs::create_dir_all(&dir).unwrap();
        assert_eq!(read_in(&dir, "inconnu").unwrap(), None);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_ignore_les_non_json_et_lit_les_teams() {
        let dir = tmp_dir("list");
        write_in(&dir, "a", r#"{"id":"a"}"#).unwrap();
        write_in(&dir, "b", r#"{"id":"b"}"#).unwrap();
        std::fs::write(dir.join("notes.txt"), "ignore").unwrap();
        let mut got = list_in(&dir);
        got.sort();
        assert_eq!(got.len(), 2);
        assert!(got.iter().any(|s| s.contains("\"a\"")));
        assert!(got.iter().any(|s| s.contains("\"b\"")));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_dossier_absent_renvoie_vide() {
        let dir = tmp_dir("void");
        assert!(list_in(&dir).is_empty());
    }

    #[test]
    fn delete_supprime_puis_est_no_op() {
        let dir = tmp_dir("del");
        write_in(&dir, "x", r#"{"id":"x"}"#).unwrap();
        delete_in(&dir, "x").unwrap();
        assert_eq!(read_in(&dir, "x").unwrap(), None);
        // Second delete = no-op (pas d'erreur).
        delete_in(&dir, "x").unwrap();
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn traversal_dans_l_id_est_refuse() {
        let dir = tmp_dir("trav");
        assert!(write_in(&dir, "../evil", "{}").is_err());
        assert!(read_in(&dir, "../../etc/passwd").is_err());
        assert!(team_file(&dir, "a/b").is_err());
        assert!(team_file(&dir, "").is_err());
        assert!(team_file(&dir, "..").is_err());
    }

    #[test]
    fn team_file_reste_sous_le_dossier() {
        let dir = PathBuf::from("/home/user/work/iakaframegui-workspace/teams");
        let f = team_file(&dir, "iakaframe").unwrap();
        assert_eq!(f, dir.join("iakaframe.json"));
    }

    #[test]
    fn le_json_ecrit_ne_contient_ni_runner_ni_model() {
        // Garde AR-1 côté store : le passe-plat n'ajoute jamais runner/model. On prouve
        // qu'un JSON pur reste pur après round-trip disque (le front garantit la pureté
        // en amont ; ce test verrouille le fait que Rust ne l'altère pas).
        let dir = tmp_dir("pure");
        let json = r#"{"id":"t","name":"t","methodId":"iakaframe","personas":[{"id":"p","name":"P","roleKey":"tests"}]}"#;
        write_in(&dir, "t", json).unwrap();
        let back = read_in(&dir, "t").unwrap().unwrap();
        assert!(!back.contains("runner"));
        assert!(!back.contains("model"));
        std::fs::remove_dir_all(&dir).ok();
    }
}
