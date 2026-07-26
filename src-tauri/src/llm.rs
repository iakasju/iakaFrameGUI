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

/// Construit le corps `POST /api/chat` en mode **STREAMING** (`stream:true`) — même contrat que
/// `build_chat_body` (messages système/user, `format`), seul `stream` diffère. Additif : ne touche
/// pas `build_chat_body` (le chemin bloquant `llm_complete` reste byte-identique).
pub fn build_stream_chat_body(
    model: &str,
    system: &str,
    user: &str,
    format: Option<serde_json::Value>,
) -> serde_json::Value {
    let mut body = build_chat_body(model, system, user, format);
    body["stream"] = serde_json::Value::Bool(true);
    body
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

// ============================================================================================
// STREAMING d'authoring (feanor-extensions-mvpb-streaming-web-live.md, brique STREAMING)
// --------------------------------------------------------------------------------------------
// ADDITIF au chemin bloquant `llm_complete` (conservé — la proposition B en dépend). MÊME bornage
// (provider `ollama` seul, hôte allow-listé `host_allowed`, timeout dur) : le streaming parle au
// MÊME hôte Ollama LAN, il n'élargit RIEN. La seule différence : `stream:true` + lecture NDJSON
// (`/api/chat`, un objet JSON par ligne, objet final `done:true`) et émission des deltas au front
// via un **Channel Tauri v2** (canal Rust → JS), token par token.
//
// HONNÊTETÉ (AC-S2) portée jusqu'ici : un flux coupé / illisible / terminé sans `done:true` est un
// AVEU explicite (chunk `Error` + `Err`), JAMAIS un partiel passé pour une réponse complète.
// ============================================================================================

/// Un événement de streaming émis vers le front via le Channel Tauri v2. Sérialisé en interne-tagged
/// (`{"kind":"token","text":…}` / `{"kind":"done"}` / `{"kind":"error","message":…}`) pour coller à
/// l'union TypeScript `LlmStreamChunk` (façade `backend.ts`).
#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum StreamChunk {
    /// Un fragment de texte (delta de `message.content`) — la réponse se remplit progressivement.
    Token { text: String },
    /// Fin PROPRE du flux (l'objet Ollama `done:true` a été vu) — la réponse est complète.
    Done,
    /// Erreur en milieu de flux (réseau coupé / ligne illisible / fin sans `done`) — AVEU honnête :
    /// le partiel N'EST PAS complet ni fiable (jamais présenté comme une réponse aboutie).
    Error { message: String },
}

/// Parse **défensivement** UNE ligne NDJSON d'Ollama `/api/chat` (`stream:true`). Rend :
///   - `Ok(None)`   : ligne vide / blanche (à ignorer) ;
///   - `Ok(Some((delta, done)))` : le fragment `message.content` (vide toléré) + le flag `done` ;
///   - `Err(msg)`   : ligne non-JSON (flux corrompu) — jamais un panic.
pub fn parse_stream_line(line: &str) -> Result<Option<(String, bool)>, String> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let v: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("ligne NDJSON illisible : {e}"))?;
    let text = v
        .get("message")
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();
    let done = v.get("done").and_then(|d| d.as_bool()).unwrap_or(false);
    Ok(Some((text, done)))
}

/// Traite UNE ligne NDJSON complète : émet un `Token` (si le delta est non vide) via `emit`, et rend
/// `Ok(done)` (le flux est-il clos ?) ou `Err` (ligne illisible). Point d'unité partagé par le shell
/// async et par `drive_ndjson` (tests) — la logique d'émission est donc prouvée SANS réseau.
pub fn handle_ndjson_line<F: FnMut(StreamChunk)>(
    line: &str,
    emit: &mut F,
) -> Result<bool, String> {
    match parse_stream_line(line)? {
        None => Ok(false),
        Some((text, done)) => {
            if !text.is_empty() {
                emit(StreamChunk::Token { text });
            }
            Ok(done)
        }
    }
}

/// Déroule un lot de lignes NDJSON, émettant chaque token via `emit`, et clôt par `Done` dès qu'une
/// ligne porte `done:true`. Rend `Ok(true)` si le flux a été clos proprement, `Ok(false)` si le lot
/// s'épuise SANS `done` (incomplet — l'appelant en fait un aveu), `Err` sur ligne illisible. Pur,
/// testable sans réseau — c'est le cœur de la discipline d'honnêteté du streaming.
pub fn drive_ndjson<F: FnMut(StreamChunk)>(lines: &[&str], emit: &mut F) -> Result<bool, String> {
    for line in lines {
        if handle_ndjson_line(line, emit)? {
            emit(StreamChunk::Done);
            return Ok(true);
        }
    }
    Ok(false)
}

/**
 * Commande Tauri : inférence d'authoring **live en STREAMING** (Ollama `POST {host}/api/chat`,
 * `stream:true`). ADDITIVE à `llm_complete` (bloquant, conservé). Même bornage (provider `ollama`
 * seul, `host_allowed` vs `authoringEndpoint`, timeout dur). Lit la réponse **NDJSON ligne par
 * ligne** et pousse chaque delta au front via `on_event` (Channel Tauri v2) : `Token` (fragment),
 * puis `Done` (fin propre). Toute rupture (hôte refusé / réseau / flux coupé / ligne illisible / fin
 * sans `done`) est un aveu honnête : `Err(String)` (jamais un panic), doublé d'un chunk `Error`
 * quand le flux avait déjà commencé — le partiel n'est JAMAIS passé pour complet (AC-S2).
 */
#[tauri::command]
pub async fn llm_complete_stream(
    provider: String,
    model: String,
    host: String,
    system: String,
    user: String,
    timeout_ms: u64,
    format: Option<serde_json::Value>,
    on_event: tauri::ipc::Channel<StreamChunk>,
) -> Result<(), String> {
    use futures_util::StreamExt;

    // Provider : ollama SEUL (défense en profondeur, le front filtre déjà). Aveu clair sinon.
    if provider.to_ascii_lowercase() != "ollama" {
        return Err(format!("provider non supporte au MVP (ollama) : {provider}"));
    }
    // Garde d'hôte (CA9) : loopback OU endpoint d'authoring réglé — MÊME allow-list que llm_complete,
    // aucun élargissement (le web live serait un autre hôte, hors périmètre).
    let configured = crate::settings::read_authoring_endpoint(&resolve_settings_file());
    if !host_allowed(&host, configured.as_deref()) {
        return Err(format!(
            "hote refuse (hors allow-list localhost + endpoint regle) : {host}"
        ));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("client HTTP : {e}"))?;
    let url = format!("{}/api/chat", host.trim_end_matches('/'));
    let body = build_stream_chat_body(&model, &system, &user, format);

    // Erreurs PRÉ-flux (connexion, statut) : `Err` sec, AUCUN chunk émis — le résolveur front
    // retombe en repli honnête (rien n'a été affiché comme réponse).
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("appel Ollama echoue : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Ollama a repondu {} sur {url}", resp.status()));
    }

    // Lecture NDJSON incrémentale : on accumule les octets, on traite chaque ligne COMPLETE (\n),
    // on garde le reste en tampon. `emit` pousse un chunk au front (le canal peut être fermé côté
    // JS : `.ok()` ignore alors l'échec d'envoi sans paniquer).
    let mut stream = resp.bytes_stream();
    let mut buf = String::new();
    let mut done = false;
    let mut emit = |chunk: StreamChunk| {
        on_event.send(chunk).ok();
    };

    while let Some(next) = stream.next().await {
        let bytes = match next {
            Ok(b) => b,
            Err(e) => {
                // Flux coupé en cours de route (réseau) : AVEU honnête, le partiel n'est pas complet.
                let msg = format!("flux interrompu : {e}");
                emit(StreamChunk::Error { message: msg.clone() });
                return Err(msg);
            }
        };
        buf.push_str(&String::from_utf8_lossy(&bytes));
        while let Some(nl) = buf.find('\n') {
            let line: String = buf.drain(..=nl).collect();
            match handle_ndjson_line(&line, &mut emit) {
                Ok(is_done) => {
                    if is_done {
                        done = true;
                        break;
                    }
                }
                Err(e) => {
                    // Ligne illisible = flux corrompu : aveu, jamais un partiel passé pour fiable.
                    emit(StreamChunk::Error { message: e.clone() });
                    return Err(e);
                }
            }
        }
        if done {
            break;
        }
    }

    // Dernier objet éventuel sans `\n` terminal.
    if !done && !buf.trim().is_empty() {
        match handle_ndjson_line(&buf, &mut emit) {
            Ok(is_done) => done = is_done,
            Err(e) => {
                emit(StreamChunk::Error { message: e.clone() });
                return Err(e);
            }
        }
    }

    if !done {
        // Flux terminé SANS objet `done:true` : incomplet → aveu (jamais passé pour complet).
        let msg = "flux termine sans marqueur de fin (done)".to_string();
        emit(StreamChunk::Error { message: msg.clone() });
        return Err(msg);
    }
    emit(StreamChunk::Done);
    Ok(())
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

    // --- STREAMING (feanor-extensions-mvpb-streaming-web-live.md) ---

    #[test]
    fn build_stream_chat_body_active_stream_true() {
        let b = build_stream_chat_body("qwen2.5-coder", "sys", "usr", None);
        // Seule différence avec le bloquant : stream = true (le reste du contrat identique).
        assert_eq!(b["stream"], serde_json::json!(true));
        assert_eq!(b["model"], serde_json::json!("qwen2.5-coder"));
        assert_eq!(b["messages"][0]["role"], serde_json::json!("system"));
        assert_eq!(b["messages"][1]["role"], serde_json::json!("user"));
        // Le bloquant reste bien stream:false (non-régression, chemin B).
        assert_eq!(build_chat_body("m", "s", "u", None)["stream"], serde_json::json!(false));
    }

    #[test]
    fn parse_stream_line_delta_done_et_vide() {
        // Delta de contenu, pas encore fini.
        let (t, d) = parse_stream_line("{\"message\":{\"content\":\"Salut\"},\"done\":false}")
            .unwrap()
            .unwrap();
        assert_eq!(t, "Salut");
        assert!(!d);
        // Objet final Ollama : content vide + done:true.
        let (t2, d2) = parse_stream_line("{\"message\":{\"content\":\"\"},\"done\":true}")
            .unwrap()
            .unwrap();
        assert_eq!(t2, "");
        assert!(d2);
        // Ligne blanche → ignorée.
        assert_eq!(parse_stream_line("   ").unwrap(), None);
    }

    #[test]
    fn parse_stream_line_illisible_est_err_jamais_panic() {
        let e = parse_stream_line("pas du json du tout").unwrap_err();
        assert!(e.contains("illisible"));
        assert!(!e.contains("panic"));
    }

    #[test]
    fn drive_ndjson_emet_tokens_puis_done() {
        let lines = [
            "{\"message\":{\"content\":\"Bon\"},\"done\":false}",
            "{\"message\":{\"content\":\"jour\"},\"done\":false}",
            "{\"message\":{\"content\":\"\"},\"done\":true}",
        ];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let closed = drive_ndjson(&lines, &mut |c| chunks.push(c)).unwrap();
        assert!(closed, "le flux doit se clore proprement sur done:true");
        assert_eq!(
            chunks,
            vec![
                StreamChunk::Token { text: "Bon".into() },
                StreamChunk::Token { text: "jour".into() },
                StreamChunk::Done,
            ]
        );
    }

    #[test]
    fn drive_ndjson_flux_coupe_sans_done_ne_ment_pas() {
        // Des tokens arrivent mais le flux s'épuise SANS objet done:true → Ok(false), PAS de Done émis.
        let lines = [
            "{\"message\":{\"content\":\"partiel\"},\"done\":false}",
        ];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let closed = drive_ndjson(&lines, &mut |c| chunks.push(c)).unwrap();
        assert!(!closed, "sans done:true, le flux n'est PAS clos (partiel honnête)");
        // Le token partiel est passé, mais AUCUN Done : l'appelant en fera un aveu (jamais complet).
        assert_eq!(chunks, vec![StreamChunk::Token { text: "partiel".into() }]);
        assert!(!chunks.contains(&StreamChunk::Done));
    }

    #[test]
    fn drive_ndjson_ligne_illisible_propage_err() {
        let lines = [
            "{\"message\":{\"content\":\"ok\"},\"done\":false}",
            "ligne corrompue",
        ];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let res = drive_ndjson(&lines, &mut |c| chunks.push(c));
        assert!(res.is_err(), "une ligne illisible interrompt le flux (aveu)");
        // Le premier token valide a bien été émis avant l'erreur ; aucun Done fabriqué.
        assert_eq!(chunks, vec![StreamChunk::Token { text: "ok".into() }]);
    }

    #[test]
    fn stream_chunk_serialise_en_union_tagged() {
        // Contrat de sérialisation vers l'union TS `LlmStreamChunk`.
        assert_eq!(
            serde_json::to_value(StreamChunk::Token { text: "x".into() }).unwrap(),
            serde_json::json!({ "kind": "token", "text": "x" })
        );
        assert_eq!(
            serde_json::to_value(StreamChunk::Done).unwrap(),
            serde_json::json!({ "kind": "done" })
        );
        assert_eq!(
            serde_json::to_value(StreamChunk::Error { message: "coupe".into() }).unwrap(),
            serde_json::json!({ "kind": "error", "message": "coupe" })
        );
    }
}
