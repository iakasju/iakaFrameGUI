//! settings — persistance minimale des réglages GUI dans `<workspace>/settings.json`.
//!
//! Au MVP, un seul réglage : l'**override de la racine bibliothèque** `iakaframeHome` (§5). Rust
//! reste passe-plat : il lit/écrit un objet JSON opaque (aucun schéma métier), et ne fait que
//! **fusionner** la clé `iakaframeHome` (les autres clés éventuelles sont préservées). Défensif :
//! fichier absent/illisible → pas d'override (jamais d'erreur bloquante à la lecture).

use std::path::Path;

/// Clé JSON de l'override de racine bibliothèque (partagée avec l'affichage Réglages).
const HOME_KEY: &str = "iakaframeHome";
/// Clé JSON du **modèle d'authoring** unique et global (§ Volet B) — l'identifiant/endpoint de
/// modèle utilisé par TOUS les prompts d'authoring de la forge (tous les étages, pas par persona).
const AUTHORING_MODEL_KEY: &str = "authoringModel";
/// Clé JSON de l'**endpoint d'authoring** optionnel (§ D3) — l'hôte Ollama à joindre pour
/// l'inférence LIVE (ex. un Ollama sur le LAN). Vide/absent ⇒ défaut `http://localhost:11434`.
const AUTHORING_ENDPOINT_KEY: &str = "authoringEndpoint";
/// Clé JSON du **dossier de projet** courant (arbitrage 2026-07-26). C'est un **confort d'outil**
/// de la forge : il dit OÙ est le projet, pas quelle frame est active. Le pointeur de frame active,
/// lui, vit dans `<projectDir>/iakaframe.json` — **propriété du lieu**, partagée avec le CLI
/// (`project_conf.rs`). Les mélanger ferait du pointeur un état de la GUI (interdit, I-5).
const PROJECT_DIR_KEY: &str = "projectDir";
/// Clé JSON de la **clé API d'authoring** OPTIONNELLE (Lot 2 — passerelle OpenAI-compatible LiteLLM).
/// Transmise en `Authorization: Bearer <clé>` par `llm.rs` sur le SEUL provider openai. **Secret
/// LOCAL** : vit dans `<workspace>/settings.json` (hors dépôt, jamais commité) — **jamais loguée**,
/// jamais renvoyée dans un message d'erreur. Absente ⇒ aucun en-tête (LiteLLM sans auth).
const AUTHORING_API_KEY_KEY: &str = "authoringApiKey";

/// Lit une clé chaîne du `settings_file` (`None` si absent/illisible/vide). Générique et partagée
/// par tous les réglages simples (racine bibliothèque, modèle d'authoring…).
fn read_string_key(settings_file: &Path, key: &str) -> Option<String> {
    let content = std::fs::read_to_string(settings_file).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;
    let raw = value.get(key)?.as_str()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Écrit/fusionne une clé chaîne dans `settings_file`. Une valeur vide **retire** la clé. Crée le
/// dossier parent au besoin. **Préserve les autres clés** du fichier (fusion, jamais d'écrasement).
fn write_string_key(settings_file: &Path, key: &str, value: &str) -> Result<(), String> {
    if let Some(parent) = settings_file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut obj = std::fs::read_to_string(settings_file)
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();

    let trimmed = value.trim();
    if trimmed.is_empty() {
        obj.remove(key);
    } else {
        obj.insert(
            key.to_string(),
            serde_json::Value::String(trimmed.to_string()),
        );
    }
    let text =
        serde_json::to_string_pretty(&serde_json::Value::Object(obj)).map_err(|e| e.to_string())?;
    std::fs::write(settings_file, text).map_err(|e| e.to_string())
}

/// Lit l'override `iakaframeHome` depuis `settings_file` (`None` si absent/illisible/vide).
pub fn read_home_override(settings_file: &Path) -> Option<String> {
    read_string_key(settings_file, HOME_KEY)
}

/// Écrit/fusionne l'override dans `settings_file`. Un `path` vide **retire** la clé (retour à
/// env/auto). Crée le dossier parent au besoin. Préserve les autres clés du fichier.
pub fn write_home_override(settings_file: &Path, path: &str) -> Result<(), String> {
    write_string_key(settings_file, HOME_KEY, path)
}

/// Lit le **modèle d'authoring** persisté (`None` si absent/illisible/vide → l'UI affiche le défaut).
pub fn read_authoring_model(settings_file: &Path) -> Option<String> {
    read_string_key(settings_file, AUTHORING_MODEL_KEY)
}

/// Écrit/fusionne le **modèle d'authoring**. Une valeur vide **retire** la clé (retour au défaut).
/// Même contrat de fusion non destructive que l'override de racine (préserve les autres clés).
pub fn write_authoring_model(settings_file: &Path, model: &str) -> Result<(), String> {
    write_string_key(settings_file, AUTHORING_MODEL_KEY, model)
}

/// Lit l'**endpoint d'authoring** persisté (`None` si absent/illisible/vide → défaut localhost côté appelant).
pub fn read_authoring_endpoint(settings_file: &Path) -> Option<String> {
    read_string_key(settings_file, AUTHORING_ENDPOINT_KEY)
}

/// Écrit/fusionne l'**endpoint d'authoring**. Une valeur vide **retire** la clé (retour au défaut localhost).
/// Même contrat de fusion non destructive que les autres réglages (préserve les autres clés).
pub fn write_authoring_endpoint(settings_file: &Path, endpoint: &str) -> Result<(), String> {
    write_string_key(settings_file, AUTHORING_ENDPOINT_KEY, endpoint)
}

/// Lit la **clé API d'authoring** persistée (`None` si absent/illisible/vide → aucun en-tête Bearer).
/// **Ne jamais logger** la valeur rendue : c'est un secret local (frontière de non-fuite).
pub fn read_authoring_api_key(settings_file: &Path) -> Option<String> {
    read_string_key(settings_file, AUTHORING_API_KEY_KEY)
}

/// Écrit/fusionne la **clé API d'authoring**. Une valeur vide **retire** la clé. Même contrat de
/// fusion non destructive que les autres réglages (préserve les autres clés).
pub fn write_authoring_api_key(settings_file: &Path, api_key: &str) -> Result<(), String> {
    write_string_key(settings_file, AUTHORING_API_KEY_KEY, api_key)
}

/// Lit le **dossier de projet** persisté (`None` si absent/illisible/vide).
pub fn read_project_dir(settings_file: &Path) -> Option<String> {
    read_string_key(settings_file, PROJECT_DIR_KEY)
}

/// Écrit/fusionne le **dossier de projet**. Une valeur vide **retire** la clé. Même contrat de
/// fusion non destructive que les autres réglages.
pub fn write_project_dir(settings_file: &Path, dir: &str) -> Result<(), String> {
    write_string_key(settings_file, PROJECT_DIR_KEY, dir)
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

/// **Modèle d'authoring** unique et global persisté — `null` si non défini (l'UI affiche le défaut).
/// Réglage build-time, DISTINCT du runner d'EXÉCUTION du Binding (frontière authoring ≠ exécution).
#[tauri::command]
pub fn authoring_model() -> Option<String> {
    read_authoring_model(&crate::paths::resolve_settings_file())
}

/// Définit (ou retire, si vide) le modèle d'authoring persisté dans `<workspace>/settings.json`.
#[tauri::command]
pub fn set_authoring_model(model: String) -> Result<(), String> {
    write_authoring_model(&crate::paths::resolve_settings_file(), &model)
}

/// **Endpoint d'authoring** optionnel persisté (§ D3) — `null` si non défini (défaut localhost).
/// Réglage build-time, DISTINCT du runner d'EXÉCUTION du Binding (frontière authoring ≠ exécution).
#[tauri::command]
pub fn authoring_endpoint() -> Option<String> {
    read_authoring_endpoint(&crate::paths::resolve_settings_file())
}

/// Définit (ou retire, si vide) l'endpoint d'authoring persisté dans `<workspace>/settings.json`.
/// Dossier de projet courant — `null` si non réglé (l'UI invite à le définir).
#[tauri::command]
pub fn project_dir() -> Option<String> {
    read_project_dir(&crate::paths::resolve_settings_file())
}

/// Règle le dossier de projet. Chaîne vide ⇒ retrait du réglage.
#[tauri::command]
pub fn set_project_dir(dir: String) -> Result<(), String> {
    write_project_dir(&crate::paths::resolve_settings_file(), &dir)
}

#[tauri::command]
pub fn set_authoring_endpoint(endpoint: String) -> Result<(), String> {
    write_authoring_endpoint(&crate::paths::resolve_settings_file(), &endpoint)
}

/// **Clé API d'authoring** OPTIONNELLE persistée (Lot 2) — `null` si non définie (aucun en-tête Bearer).
/// Réglage LOCAL build-time (jamais commité, jamais logué), DISTINCT du runner d'EXÉCUTION du Binding.
#[tauri::command]
pub fn authoring_api_key() -> Option<String> {
    read_authoring_api_key(&crate::paths::resolve_settings_file())
}

/// Définit (ou retire, si vide) la clé API d'authoring persistée dans `<workspace>/settings.json`.
#[tauri::command]
pub fn set_authoring_api_key(api_key: String) -> Result<(), String> {
    write_authoring_api_key(&crate::paths::resolve_settings_file(), &api_key)
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

    // --- Modèle d'authoring (Volet B) : même contrat que l'override de racine. ---

    #[test]
    fn authoring_model_absent_renvoie_none() {
        let f = tmp_file("am-absent");
        assert_eq!(read_authoring_model(&f), None);
    }

    #[test]
    fn authoring_model_write_puis_read_roundtrip() {
        let f = tmp_file("am-rt");
        write_authoring_model(&f, "ollama:qwen2.5-coder").unwrap();
        assert_eq!(
            read_authoring_model(&f),
            Some("ollama:qwen2.5-coder".to_string())
        );
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    #[test]
    fn authoring_model_vide_retire_la_cle() {
        let f = tmp_file("am-clear");
        write_authoring_model(&f, "gpt-4o").unwrap();
        write_authoring_model(&f, "   ").unwrap();
        assert_eq!(read_authoring_model(&f), None);
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    #[test]
    fn authoring_model_coexiste_avec_home_sans_ecraser() {
        // Les deux réglages vivent dans le MÊME settings.json — fusion non destructive.
        let f = tmp_file("am-coexist");
        write_home_override(&f, "/lib").unwrap();
        write_authoring_model(&f, "claude-code").unwrap();
        assert_eq!(read_home_override(&f), Some("/lib".to_string()));
        assert_eq!(read_authoring_model(&f), Some("claude-code".to_string()));
        // Retirer le modèle ne touche pas la racine.
        write_authoring_model(&f, "").unwrap();
        assert_eq!(read_authoring_model(&f), None);
        assert_eq!(read_home_override(&f), Some("/lib".to_string()));
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    // --- Endpoint d'authoring (D3) : même contrat, coexistence non destructive. ---

    #[test]
    fn authoring_endpoint_absent_renvoie_none() {
        let f = tmp_file("ae-absent");
        assert_eq!(read_authoring_endpoint(&f), None);
    }

    #[test]
    fn authoring_endpoint_roundtrip_et_coexistence() {
        let f = tmp_file("ae-rt");
        write_authoring_model(&f, "ollama:qwen2.5-coder").unwrap();
        write_authoring_endpoint(&f, "http://192.168.2.11:11434").unwrap();
        assert_eq!(
            read_authoring_endpoint(&f),
            Some("http://192.168.2.11:11434".to_string())
        );
        // Effacer l'endpoint ne touche pas le modèle.
        write_authoring_endpoint(&f, "").unwrap();
        assert_eq!(read_authoring_endpoint(&f), None);
        assert_eq!(
            read_authoring_model(&f),
            Some("ollama:qwen2.5-coder".to_string())
        );
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }

    // --- Clé API d'authoring (Lot 2, LiteLLM) : même contrat, coexistence non destructive. ---

    #[test]
    fn authoring_api_key_absent_renvoie_none() {
        let f = tmp_file("ak-absent");
        assert_eq!(read_authoring_api_key(&f), None);
    }

    #[test]
    fn authoring_api_key_roundtrip_et_coexistence_non_destructive() {
        let f = tmp_file("ak-rt");
        write_authoring_model(&f, "openai:claude-3-5-sonnet").unwrap();
        write_authoring_endpoint(&f, "http://localhost:4000").unwrap();
        write_authoring_api_key(&f, "sk-secret-litellm").unwrap();
        assert_eq!(
            read_authoring_api_key(&f),
            Some("sk-secret-litellm".to_string())
        );
        // Effacer la clé ne touche ni le modèle ni l'endpoint (fusion non destructive).
        write_authoring_api_key(&f, "").unwrap();
        assert_eq!(read_authoring_api_key(&f), None);
        assert_eq!(
            read_authoring_model(&f),
            Some("openai:claude-3-5-sonnet".to_string())
        );
        assert_eq!(
            read_authoring_endpoint(&f),
            Some("http://localhost:4000".to_string())
        );
        std::fs::remove_dir_all(f.parent().unwrap()).ok();
    }
}
