//! settings — persistance minimale des réglages GUI dans `<workspace>/settings.json`.
//!
//! Au MVP, un seul réglage : l'**override de la racine bibliothèque** `iakaframeHome` (§5). Rust
//! reste passe-plat : il lit/écrit un objet JSON opaque (aucun schéma métier), et ne fait que
//! **fusionner** la clé `iakaframeHome` (les autres clés éventuelles sont préservées). Défensif :
//! fichier absent/illisible → pas d'override (jamais d'erreur bloquante à la lecture).

use std::path::Path;

/// Clé JSON de l'override de racine bibliothèque (partagée avec l'affichage Réglages).
const HOME_KEY: &str = "iakaframeHome";

/// Lit l'override `iakaframeHome` depuis `settings_file` (`None` si absent/illisible/vide).
pub fn read_home_override(settings_file: &Path) -> Option<String> {
    let content = std::fs::read_to_string(settings_file).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;
    let raw = value.get(HOME_KEY)?.as_str()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Écrit/fusionne l'override dans `settings_file`. Un `path` vide **retire** la clé (retour à
/// env/auto). Crée le dossier parent au besoin. Préserve les autres clés du fichier.
pub fn write_home_override(settings_file: &Path, path: &str) -> Result<(), String> {
    if let Some(parent) = settings_file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut obj = std::fs::read_to_string(settings_file)
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();

    let trimmed = path.trim();
    if trimmed.is_empty() {
        obj.remove(HOME_KEY);
    } else {
        obj.insert(
            HOME_KEY.to_string(),
            serde_json::Value::String(trimmed.to_string()),
        );
    }
    let text = serde_json::to_string_pretty(&serde_json::Value::Object(obj))
        .map_err(|e| e.to_string())?;
    std::fs::write(settings_file, text).map_err(|e| e.to_string())
}

// --- Commandes Tauri (façade unique côté front : `src/api/backend.ts`) ---

/// Racine bibliothèque résolue (§5) — `null` si introuvable (l'UI invite à la définir).
#[tauri::command]
pub fn iakaframe_home() -> Option<String> {
    crate::paths::resolve_iakaframe_home().map(|p| p.to_string_lossy().to_string())
}

/// Définit (ou retire, si vide) l'override persisté de la racine bibliothèque.
#[tauri::command]
pub fn set_iakaframe_home(path: String) -> Result<(), String> {
    write_home_override(&crate::paths::resolve_settings_file(), &path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn tmp_file(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        p.push(format!("iakaframegui-settings-{tag}-{nanos}"));
        p.push("settings.json");
        p
    }

    #[test]
    fn absent_renvoie_none() {
        let f = tmp_file("absent");
        assert_eq!(read_home_override(&f), None);
    }

    #[test]
    fn write_puis_read_roundtrip() {
        let f = tmp_file("rt");
        write_home_override(&f, "/home/user/work/iakaframe").unwrap();
        assert_eq!(
            read_home_override(&f),
            Some("/home/user/work/iakaframe".to_string())
        );
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    #[test]
    fn write_vide_retire_la_cle() {
        let f = tmp_file("clear");
        write_home_override(&f, "/lib").unwrap();
        write_home_override(&f, "   ").unwrap();
        assert_eq!(read_home_override(&f), None);
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    #[test]
    fn preserve_les_autres_cles() {
        let f = tmp_file("merge");
        std::fs::create_dir_all(f.parent().unwrap()).unwrap();
        std::fs::write(&f, r#"{"theme":"cinabre"}"#).unwrap();
        write_home_override(&f, "/lib").unwrap();
        let back = std::fs::read_to_string(&f).unwrap();
        assert!(back.contains("\"theme\""));
        assert!(back.contains("cinabre"));
        assert!(back.contains("/lib"));
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    #[test]
    fn json_illisible_renvoie_none() {
        let f = tmp_file("bad");
        std::fs::create_dir_all(f.parent().unwrap()).unwrap();
        std::fs::write(&f, "pas du json {").unwrap();
        assert_eq!(read_home_override(&f), None);
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }
}
