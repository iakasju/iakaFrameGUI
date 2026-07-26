//! project_conf — le **pointeur de frame active**, dans `<projectDir>/iakaframe.json`.
//!
//! Arbitrage du décideur (2026-07-26, `specs/instructions/pointeur-frame-active.md`) : le pointeur
//! **n'est pas un réglage de la GUI**, c'est une **propriété du lieu**, partagée avec le CLI.
//! D'où ce module distinct de `settings.rs` : `settings.json` dit *où est le projet*,
//! `iakaframe.json` dit *quelle frame y est active*.
//!
//! **Contrat d'écriture — non destructif (I-2).** `iakaframe.json` appartient d'abord au CLI, qui y
//! porte `runner`/`node`/`target`/`note`/`aiderModel`. On relit, on ne touche QUE la clé `frame`, on
//! réécrit. Symétrique du geste du CLI, qui fusionne déjà de son côté — c'est ce qui rend la
//! co-écriture sûre dans les deux sens.
//!
//! Défensif : dossier ou fichier absent, JSON illisible → `None` à la lecture, jamais d'erreur
//! bloquante. À l'écriture, un JSON existant illisible est **refusé** plutôt qu'écrasé : écraser
//! ferait perdre en silence les clés du CLI.

use std::path::{Path, PathBuf};

/// Nom du fichier de conf projet (partagé avec le CLI `iakaframe config`).
pub const PROJECT_CONF_FILE: &str = "iakaframe.json";

/// Clé JSON du pointeur de frame active (id du descripteur `frames/<id>.md`).
/// **Nom à confirmer au dépôt canon** avant que le CLI ne s'y branche (cf. instruction § 1.2).
pub const FRAME_KEY: &str = "frame";

/// Chemin du fichier de conf d'un dossier de projet.
pub fn conf_path(project_dir: &Path) -> PathBuf {
    project_dir.join(PROJECT_CONF_FILE)
}

/// Lit le pointeur de frame active (`None` si fichier absent/illisible, clé absente ou vide).
pub fn read_active_frame(project_dir: &Path) -> Option<String> {
    let content = std::fs::read_to_string(conf_path(project_dir)).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;
    let raw = value.get(FRAME_KEY)?.as_str()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Écrit/fusionne le pointeur. Une valeur vide **retire** la clé (retour au défaut du réservoir).
///
/// **Ne crée pas le dossier de projet** : un projet est un lieu qui existe déjà. En revanche, un
/// `iakaframe.json` absent est créé (le projet peut n'avoir jamais été configuré par le CLI).
pub fn write_active_frame(project_dir: &Path, frame_id: &str) -> Result<(), String> {
    if !project_dir.is_dir() {
        return Err(format!(
            "dossier de projet introuvable : {}",
            project_dir.display()
        ));
    }
    let path = conf_path(project_dir);

    // Fichier existant : on le relit pour PRÉSERVER les clés du CLI. S'il est illisible, on
    // REFUSE d'écrire — l'écraser perdrait runner/node/target en silence.
    let mut obj = match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
            Ok(serde_json::Value::Object(map)) => map,
            _ => {
                return Err(format!(
                    "{} existe mais n'est pas un objet JSON lisible — écriture refusée \
                     (l'écraser perdrait les clés du CLI)",
                    path.display()
                ))
            }
        },
        Err(_) => serde_json::Map::new(), // fichier absent : on le crée
    };

    let trimmed = frame_id.trim();
    if trimmed.is_empty() {
        obj.remove(FRAME_KEY);
    } else {
        obj.insert(
            FRAME_KEY.to_string(),
            serde_json::Value::String(trimmed.to_string()),
        );
    }

    let text = serde_json::to_string_pretty(&serde_json::Value::Object(obj))
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, text + "\n").map_err(|e| e.to_string())
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Pointeur de frame active du projet réglé — `null` si pas de projet réglé, pas de fichier, ou
/// pas de clé. Ne lève jamais.
#[tauri::command]
pub fn active_frame_id() -> Option<String> {
    let dir = crate::settings::read_project_dir(&crate::paths::resolve_settings_file())?;
    read_active_frame(Path::new(&dir))
}

/// Pose le pointeur de frame active dans le projet réglé. Chaîne vide ⇒ retrait de la clé.
#[tauri::command]
pub fn set_active_frame_id(frame_id: String) -> Result<(), String> {
    let dir = crate::settings::read_project_dir(&crate::paths::resolve_settings_file())
        .ok_or_else(|| "aucun dossier de projet réglé".to_string())?;
    write_active_frame(Path::new(&dir), &frame_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("iakaframegui-projconf-{tag}"));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Un `iakaframe.json` réaliste, tel que `iakaframe config` l'écrit.
    fn conf_cli() -> &'static str {
        r#"{
  "runner": "claude-code",
  "node": "claude",
  "target": "claude",
  "note": "Conf iakaframe du projet (runner du bouton Go, noeud de deploiement)."
}"#
    }

    #[test]
    fn lit_none_quand_le_fichier_est_absent() {
        let dir = tmp_dir("absent");
        std::fs::remove_file(conf_path(&dir)).ok();
        assert_eq!(read_active_frame(&dir), None);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn lit_none_quand_la_cle_est_absente_ou_vide() {
        let dir = tmp_dir("sanscle");
        std::fs::write(conf_path(&dir), conf_cli()).unwrap();
        assert_eq!(read_active_frame(&dir), None);

        std::fs::write(conf_path(&dir), r#"{"frame": "   "}"#).unwrap();
        assert_eq!(read_active_frame(&dir), None);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn lit_none_sur_un_json_illisible_sans_paniquer() {
        let dir = tmp_dir("illisible");
        std::fs::write(conf_path(&dir), "{ pas du json").unwrap();
        assert_eq!(read_active_frame(&dir), None);
        std::fs::remove_dir_all(&dir).ok();
    }

    /// **AC-4** — le geste d'écriture PRÉSERVE les clés du CLI.
    #[test]
    fn ecrire_le_pointeur_preserve_les_cles_du_cli() {
        let dir = tmp_dir("preserve");
        std::fs::write(conf_path(&dir), conf_cli()).unwrap();

        write_active_frame(&dir, "scrum").unwrap();

        let back = std::fs::read_to_string(conf_path(&dir)).unwrap();
        let v: serde_json::Value = serde_json::from_str(&back).unwrap();
        assert_eq!(v.get("frame").unwrap().as_str().unwrap(), "scrum");
        assert_eq!(v.get("runner").unwrap().as_str().unwrap(), "claude-code");
        assert_eq!(v.get("node").unwrap().as_str().unwrap(), "claude");
        assert_eq!(v.get("target").unwrap().as_str().unwrap(), "claude");
        assert!(v.get("note").is_some());
        assert_eq!(read_active_frame(&dir), Some("scrum".to_string()));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn ecrire_vide_retire_la_cle_sans_toucher_au_reste() {
        let dir = tmp_dir("retrait");
        std::fs::write(conf_path(&dir), conf_cli()).unwrap();
        write_active_frame(&dir, "scrum").unwrap();

        write_active_frame(&dir, "").unwrap();

        let v: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(conf_path(&dir)).unwrap()).unwrap();
        assert!(v.get("frame").is_none());
        assert_eq!(v.get("runner").unwrap().as_str().unwrap(), "claude-code");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn cree_le_fichier_quand_le_projet_n_a_pas_de_conf() {
        let dir = tmp_dir("creation");
        std::fs::remove_file(conf_path(&dir)).ok();
        write_active_frame(&dir, "iakaframe").unwrap();
        assert_eq!(read_active_frame(&dir), Some("iakaframe".to_string()));
        std::fs::remove_dir_all(&dir).ok();
    }

    /// Garde : plutôt REFUSER que d'écraser un JSON illisible — les clés du CLI y sont peut-être.
    #[test]
    fn refuse_d_ecraser_un_json_illisible() {
        let dir = tmp_dir("refus");
        std::fs::write(conf_path(&dir), "{ pas du json").unwrap();
        assert!(write_active_frame(&dir, "scrum").is_err());
        // Le fichier d'origine est intact.
        assert_eq!(
            std::fs::read_to_string(conf_path(&dir)).unwrap(),
            "{ pas du json"
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn refuse_un_dossier_de_projet_inexistant() {
        let absent = std::env::temp_dir().join("iakaframegui-projconf-nexiste-pas");
        std::fs::remove_dir_all(&absent).ok();
        assert!(write_active_frame(&absent, "scrum").is_err());
    }
}
