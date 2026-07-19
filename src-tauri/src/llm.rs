//! llm — inférence d'authoring **live** (copilote-inference-live.md, D1).
//!
//! ⚠️ DÉROGATION ASSUMÉE ET BORNÉE à l'invariant AR-1/AR-6 (« backend passe-plat, AUCUNE commande
//! réseau, AUCUN appel runner »). Ce module — et LUI SEUL — fait **UN** appel HTTP sortant, dans le
//! MÊME esprit que le pilote `review`/`remove` (sous-processus allow-listé) : c'est de l'**authoring
//! BUILD-TIME**, jamais un runner d'EXÉCUTION du Binding. Le bornage est TRIPLE :
//!   - **provider** : `ollama` SEUL (tout autre est refusé côté front avant d'arriver ici) ;
//!   - **hôte** : loopback (`localhost`/`127.0.0.1`/`::1`) OU l'endpoint d'authoring RÉGLÉ
//!     (`authoringEndpoint`) — jamais une URL arbitraire (`host_allowed`, testé sans réseau) ;
//!   - **temps** : timeout dur sur le client.
//! Ce n'est PAS un runner d'exécution : on compose la CHARTE d'un élément (quels sous-éléments), on
//! ne fait tourner aucun agent. La frontière authoring ≠ exécution reste entière.

/// Hôte Ollama par défaut (D3) — utilisé quand aucun `authoringEndpoint` n'est réglé.
pub const DEFAULT_HOST: &str = "http://localhost:11434";

/// Extrait le hostname d'une URL `http(s)://host[:port][/...]` (minuscule). `None` si mal formée.
fn host_of(url: &str) -> Option<String> {
    let rest = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))?;
    // Coupe au premier `/`, `:` (port) → il reste l'hôte.
    let host = rest
        .split(['/', ':'])
        .next()
        .filter(|h| !h.is_empty())?;
    Some(host.to_ascii_lowercase())
}

/// Un hôte est-il une adresse loopback (jamais routée hors machine) ?
fn is_loopback(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "::1" | "[::1]")
}

/**
 * Garde d'hôte (CA9) — **pure, testable sans réseau**. Autorise `host` si, et seulement si :
 *   - son schéma est `http`/`https` ET
 *   - son hostname est **loopback**, OU il **égale l'hôte de l'endpoint configuré** (LAN réglé).
 *
 * Tout le reste (URL arbitraire, hôte public non réglé) est **refusé**. `configured` = la valeur
 * persistée `authoringEndpoint` (`None` si non réglée → seul le loopback passe).
 */
pub fn host_allowed(host: &str, configured: Option<&str>) -> bool {
    let Some(h) = host_of(host) else {
        return false; // schéma non http(s) / URL malformée
    };
    if is_loopback(&h) {
        return true;
    }
    match configured.and_then(host_of) {
        Some(c) => h == c,
        None => false,
    }
}

/// Construit le corps `POST /api/chat` (D4) : `stream:false`, messages système/user, `format`.
/// `format` = le schéma JSON transmis par le front (D4) ; à défaut, le mode JSON générique.
pub fn build_chat_body(
    model: &str,
    system: &str,
    user: &str,
    format: Option<serde_json::Value>,
) -> serde_json::Value {
    serde_json::json!({
        "model": model,
        "stream": false,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user }
        ],
        "format": format.unwrap_or_else(|| serde_json::Value::String("json".to_string())),
    })
}

/// Extrait `message.content` de la réponse Ollama `/api/chat`. `Err` si la forme est inattendue.
pub fn extract_content(resp: &serde_json::Value) -> Result<String, String> {
    resp.get("message")
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "reponse Ollama sans message.content".to_string())
}

/**
 * Commande Tauri : appel d'inférence d'authoring **live** (Ollama `POST {host}/api/chat`).
 *
 * Bornage (cf. en-tête) : provider `ollama` seul, hôte allow-listé (`host_allowed` vs
 * `authoringEndpoint` réglé), timeout dur. Renvoie le **texte brut** de la complétion (le JSON
 * produit par le modèle) — le parsing défensif vit côté front (`@iakaframe/core`). Toute erreur
 * (hôte refusé / réseau / timeout / forme inattendue) est un `Err(String)` clair (jamais un panic).
 */
#[tauri::command]
pub async fn llm_complete(
    provider: String,
    model: String,
    host: String,
    system: String,
    user: String,
    timeout_ms: u64,
    format: Option<serde_json::Value>,
) -> Result<String, String> {
    // Provider : ollama SEUL au MVP (D2). Défense en profondeur (le front filtre déjà).
    if provider.to_ascii_lowercase() != "ollama" {
        return Err(format!("provider non supporte au MVP (ollama) : {provider}"));
    }
    // Garde d'hôte (CA9) : loopback OU endpoint d'authoring réglé — jamais une URL arbitraire.
    let configured = crate::settings::read_authoring_endpoint(&resolve_settings_file());
    if !host_allowed(&host, configured.as_deref()) {
        return Err(format!("hote refuse (hors allow-list localhost + endpoint regle) : {host}"));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("client HTTP : {e}"))?;
    let url = format!("{}/api/chat", host.trim_end_matches('/'));
    let body = build_chat_body(&model, &system, &user, format);

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("appel Ollama echoue : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Ollama a repondu {} sur {url}", resp.status()));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("reponse Ollama illisible : {e}"))?;
    extract_content(&json)
}

/// Indirection du chemin settings (aligne sur `settings.rs`).
fn resolve_settings_file() -> std::path::PathBuf {
    crate::paths::resolve_settings_file()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host_allowed_accepte_loopback() {
        assert!(host_allowed("http://localhost:11434", None));
        assert!(host_allowed("http://127.0.0.1:11434", None));
        assert!(host_allowed("http://localhost", None));
    }

    #[test]
    fn host_allowed_refuse_hote_arbitraire_sans_endpoint() {
        assert!(!host_allowed("http://evil.example.com:11434", None));
        assert!(!host_allowed("http://192.168.2.11:11434", None));
    }

    #[test]
    fn host_allowed_accepte_endpoint_regle() {
        let cfg = Some("http://192.168.2.11:11434");
        assert!(host_allowed("http://192.168.2.11:11434", cfg));
        // Un autre hôte que celui réglé reste refusé.
        assert!(!host_allowed("http://192.168.2.99:11434", cfg));
    }

    #[test]
    fn host_allowed_refuse_schema_non_http() {
        assert!(!host_allowed("ftp://localhost:11434", None));
        assert!(!host_allowed("file:///etc/passwd", None));
        assert!(!host_allowed("localhost:11434", None)); // pas de schéma
    }

    #[test]
    fn build_chat_body_respecte_d4() {
        let b = build_chat_body("qwen2.5-coder", "sys", "usr", None);
        assert_eq!(b["stream"], serde_json::json!(false));
        assert_eq!(b["model"], serde_json::json!("qwen2.5-coder"));
        assert_eq!(b["messages"][0]["role"], serde_json::json!("system"));
        assert_eq!(b["messages"][1]["role"], serde_json::json!("user"));
        // format par défaut = mode JSON générique.
        assert_eq!(b["format"], serde_json::json!("json"));
        // Un schéma fourni est transmis tel quel.
        let schema = serde_json::json!({ "type": "object" });
        let b2 = build_chat_body("m", "s", "u", Some(schema.clone()));
        assert_eq!(b2["format"], schema);
    }

    #[test]
    fn extract_content_ok_et_ko() {
        let ok = serde_json::json!({ "message": { "content": "{\"intro\":\"x\"}" } });
        assert_eq!(extract_content(&ok).unwrap(), "{\"intro\":\"x\"}");
        let ko = serde_json::json!({ "unexpected": true });
        assert!(extract_content(&ko).is_err());
    }
}
