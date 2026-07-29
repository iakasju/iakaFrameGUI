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

/// Hôte LiteLLM par défaut (OpenAI-compatible) — utilisé par la découverte de modèles `/v1/models`
/// quand aucun `authoringEndpoint` n'est réglé (le proxy LiteLLM écoute sur le port 4000, loopback).
pub const DEFAULT_OPENAI_HOST: &str = "http://localhost:4000";

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

// ============================================================================================
// Provider `openai` — passerelle OpenAI-compatible (LiteLLM, feanor-source-inference-selecteur.md)
// --------------------------------------------------------------------------------------------
// SECOND provider (ADDITIF ; `ollama` inchangé). MÊME bornage (hôte allow-listé `host_allowed`,
// timeout dur, authoring BUILD-TIME) : la seule voie neuve est le WIRE — `POST {host}/v1/chat/
// completions`, corps OpenAI (`model`/`messages`/`stream`), réponse `choices[0].message.content`
// (bloquant) ou **SSE** `data: {json}\n\n` … `data: [DONE]` (streaming, delta `choices[0].delta.
// content`). Une clé API OPTIONNELLE part en `Authorization: Bearer <clé>` — **jamais** dans le
// corps, l'URL, un log ni un message d'erreur (frontière de sécurité, prouvée par construction).
// Lot 2b : quand le front demande une sortie STRUCTURÉE (schéma `format` présent — proposition
// d'élément/persona), le corps openai gagne un `response_format` OpenAI (`{"type":"json_object"}`
// au MVP, le plus largement honoré par les backends LiteLLM). Un backend qui n'honore PAS
// `response_format` et rend du texte non structuré retombe, au pire, sur l'AVEU honnête existant
// (`parse*` → `null` + `FALLBACK_UNREADABLE`) — JAMAIS une fausse proposition fabriquée. Découverte
// des modèles : `GET {host}/v1/models` (`llm_models`) — une liste vide (endpoint injoignable /
// réponse inattendue) est un AVEU honnête, jamais une fausse liste ; la clé n'y fuite jamais.
// ============================================================================================

/// Construit l'URL du wire OpenAI chat-completions à partir de l'hôte réglé. Pure (aucune clé).
pub fn openai_chat_url(host: &str) -> String {
    format!("{}/v1/chat/completions", host.trim_end_matches('/'))
}

/// Message d'aveu **« hôte refusé »** — pur et PARTAGÉ par les deux providers/chemins. Il ne porte
/// **que** l'hôte : aucune clé API n'y figure jamais (garantie de non-fuite, testée sans réseau).
fn host_refused_msg(host: &str) -> String {
    format!("hote refuse (hors allow-list localhost + endpoint regle) : {host}")
}

/// Mappe le schéma de sortie structuré du front (`format`, présent ⇒ on veut du JSON) vers le
/// `response_format` OpenAI. MVP (Lot 2b) : `{"type":"json_object"}` — le plus largement honoré par
/// les backends LiteLLM (le `json_schema` complet est peu fiable selon les backends). `format` absent
/// ⇒ `None` (chemin conseil/chat en texte libre). Pur, testable sans réseau. Ne porte JAMAIS de clé.
pub fn openai_response_format(format: Option<&serde_json::Value>) -> Option<serde_json::Value> {
    format.map(|_| serde_json::json!({ "type": "json_object" }))
}

/// Construit le corps `POST /v1/chat/completions` (OpenAI-compatible). `stream` distingue le chemin
/// bloquant (`false`) du streaming SSE (`true`). `response_format` (Lot 2b) est ajouté SEULEMENT s'il
/// est `Some` (sortie structurée demandée) — absent ⇒ texte libre. **La clé API n'est JAMAIS ici**
/// (elle vit dans le header `Authorization`) : le corps ne contient que `model`/`messages`/`stream`
/// (+ `response_format` optionnel) — prouvé par la signature (aucun paramètre de clé) et par le test
/// `build_openai_body_ne_contient_pas_de_cle`.
pub fn build_openai_body(
    model: &str,
    system: &str,
    user: &str,
    stream: bool,
    response_format: Option<serde_json::Value>,
) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": model,
        "stream": stream,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user }
        ],
    });
    if let Some(rf) = response_format {
        body["response_format"] = rf;
    }
    body
}

/// Construit l'URL de découverte des modèles OpenAI-compatible (`GET {host}/v1/models`, LiteLLM /
/// LM Studio / Ollama-`/v1`). Pure (aucune clé). Slash terminal toléré (pas de double slash).
pub fn openai_models_url(host: &str) -> String {
    format!("{}/v1/models", host.trim_end_matches('/'))
}

/// Parse **défensivement** la réponse `GET /v1/models` (OpenAI-compatible : `{ "data": [ { "id" },
/// … ] }`) → liste d'ids de modèles. Rend `[]` si la forme est inattendue (endpoint qui répond
/// autre chose) — une liste vide est un AVEU honnête, JAMAIS une fausse liste. Ids trimés, non
/// vides, dédupliqués, ordre préservé. Pur, testable sans réseau. Ne lève jamais.
pub fn parse_openai_models(resp: &serde_json::Value) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    if let Some(arr) = resp.get("data").and_then(|d| d.as_array()) {
        for item in arr {
            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                let id = id.trim();
                if !id.is_empty() && !out.iter().any(|x| x == id) {
                    out.push(id.to_string());
                }
            }
        }
    }
    out
}

/// Extrait `choices[0].message.content` d'une réponse OpenAI **bloquante**. `Err` si la forme est
/// inattendue (le résolveur front en fait un aveu honnête — jamais une fausse réponse).
pub fn extract_openai_content(resp: &serde_json::Value) -> Result<String, String> {
    resp.get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "reponse OpenAI sans choices[0].message.content".to_string())
}

/// Événement issu d'UNE ligne SSE OpenAI (`/v1/chat/completions`, `stream:true`) — miroir « SSE » de
/// `parse_stream_line` (NDJSON). `Ignore` = ligne sans charge utile (vide, commentaire `:`, champ
/// `event:`/`id:`) ; `Token` = fragment `choices[0].delta.content` (vide toléré) ; `Done` = sentinelle
/// `data: [DONE]` (fin PROPRE).
#[derive(Clone, Debug, PartialEq)]
pub enum SseEvent {
    Ignore,
    Token(String),
    Done,
}

/// Parse **défensivement** UNE ligne SSE OpenAI. Rend :
///   - `Ok(SseEvent::Ignore)` : ligne vide / commentaire / champ non-`data:` (à ignorer) ;
///   - `Ok(SseEvent::Done)`   : `data: [DONE]` (fin propre du flux) ;
///   - `Ok(SseEvent::Token)`  : le delta `choices[0].delta.content` (vide toléré) ;
///   - `Err(msg)`             : `data:` avec un JSON illisible (flux corrompu) — jamais un panic.
pub fn parse_openai_sse_line(line: &str) -> Result<SseEvent, String> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return Ok(SseEvent::Ignore);
    }
    // SSE : seule la ligne `data:` porte une charge utile ; le reste (`:` keep-alive, `event:`…) est ignoré.
    let Some(payload) = trimmed.strip_prefix("data:") else {
        return Ok(SseEvent::Ignore);
    };
    let payload = payload.trim();
    if payload == "[DONE]" {
        return Ok(SseEvent::Done);
    }
    let v: serde_json::Value =
        serde_json::from_str(payload).map_err(|e| format!("ligne SSE illisible : {e}"))?;
    let text = v
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("delta"))
        .and_then(|d| d.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();
    Ok(SseEvent::Token(text))
}

/// Traite UNE ligne SSE : émet un `Token` (delta non vide) via `emit`, rend `Ok(true)` sur `[DONE]`
/// (flux clos), `Ok(false)` sinon, `Err` sur ligne illisible. Miroir SSE de `handle_ndjson_line` —
/// point d'unité partagé par le shell async et par `drive_sse` (tests) : émission prouvée SANS réseau.
pub fn handle_sse_line<F: FnMut(StreamChunk)>(line: &str, emit: &mut F) -> Result<bool, String> {
    match parse_openai_sse_line(line)? {
        SseEvent::Ignore => Ok(false),
        SseEvent::Token(text) => {
            if !text.is_empty() {
                emit(StreamChunk::Token { text });
            }
            Ok(false)
        }
        SseEvent::Done => Ok(true),
    }
}

/// Déroule un lot de lignes SSE, émettant chaque token via `emit`, et clôt par `Done` dès la
/// sentinelle `data: [DONE]`. Rend `Ok(true)` si le flux a été clos proprement, `Ok(false)` si le lot
/// s'épuise SANS `[DONE]` (incomplet — l'appelant en fait un aveu), `Err` sur ligne illisible. Pur,
/// testable sans réseau — miroir SSE de `drive_ndjson` (même discipline d'honnêteté).
pub fn drive_sse<F: FnMut(StreamChunk)>(lines: &[&str], emit: &mut F) -> Result<bool, String> {
    for line in lines {
        if handle_sse_line(line, emit)? {
            emit(StreamChunk::Done);
            return Ok(true);
        }
    }
    Ok(false)
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
    api_key: Option<String>,
) -> Result<String, String> {
    // Provider : `ollama` (natif) OU `openai` (passerelle OpenAI-compatible, LiteLLM). Défense en
    // profondeur (le front filtre déjà). Tout autre provider → aveu clair (jamais un appel réseau).
    let provider_l = provider.to_ascii_lowercase();
    let openai = provider_l == "openai";
    if provider_l != "ollama" && !openai {
        return Err(format!("provider non supporte (ollama|openai) : {provider}"));
    }
    // Garde d'hôte (CA9) : loopback OU endpoint d'authoring réglé — jamais une URL arbitraire.
    // INCHANGÉE : `http://localhost:4000` (LiteLLM) passe par le loopback ; un LiteLLM LAN doit
    // égaler l'`authoringEndpoint` réglé. Le message d'aveu ne porte QUE l'hôte (jamais la clé).
    let configured = crate::settings::read_authoring_endpoint(&resolve_settings_file());
    if !host_allowed(&host, configured.as_deref()) {
        return Err(host_refused_msg(&host));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("client HTTP : {e}"))?;
    // Dispatch par provider : URL + corps du wire. `openai` mappe `format` (présent ⇒ sortie
    // structurée) vers `response_format` OpenAI (Lot 2b) ; absent ⇒ texte libre (conseil/chat).
    let (url, body, vendor) = if openai {
        let rf = openai_response_format(format.as_ref());
        (openai_chat_url(&host), build_openai_body(&model, &system, &user, false, rf), "LiteLLM")
    } else {
        (format!("{}/api/chat", host.trim_end_matches('/')), build_chat_body(&model, &system, &user, format), "Ollama")
    };

    let mut request = client.post(&url).json(&body);
    // Clé API OPTIONNELLE → `Authorization: Bearer <clé>` sur le SEUL provider openai. Elle ne touche
    // QUE ce header (jamais le corps/l'URL/un log/un message d'erreur) — frontière de non-fuite.
    if openai {
        if let Some(key) = api_key.as_deref() {
            let key = key.trim();
            if !key.is_empty() {
                request = request.bearer_auth(key);
            }
        }
    }
    let resp = request
        .send()
        .await
        .map_err(|e| format!("appel {vendor} echoue : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("{vendor} a repondu {} sur {url}", resp.status()));
    }
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("reponse {vendor} illisible : {e}"))?;
    if openai {
        extract_openai_content(&json)
    } else {
        extract_content(&json)
    }
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
    api_key: Option<String>,
    on_event: tauri::ipc::Channel<StreamChunk>,
) -> Result<(), String> {
    use futures_util::StreamExt;

    // Provider : `ollama` (NDJSON) OU `openai` (SSE, LiteLLM). Défense en profondeur (front filtre déjà).
    let provider_l = provider.to_ascii_lowercase();
    let openai = provider_l == "openai";
    if provider_l != "ollama" && !openai {
        return Err(format!("provider non supporte (ollama|openai) : {provider}"));
    }
    // Garde d'hôte (CA9) : loopback OU endpoint d'authoring réglé — MÊME allow-list que llm_complete,
    // aucun élargissement (le web live serait un autre hôte, hors périmètre). Aveu = hôte seul, sans clé.
    let configured = crate::settings::read_authoring_endpoint(&resolve_settings_file());
    if !host_allowed(&host, configured.as_deref()) {
        return Err(host_refused_msg(&host));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("client HTTP : {e}"))?;
    // Dispatch par provider : `openai` → SSE sur `/v1/chat/completions` (mappe `format` →
    // `response_format`, Lot 2b ; le conseil/chat streaming ne pose PAS de `format` → texte libre) ;
    // `ollama` → NDJSON sur `/api/chat`. La lecture de flux (SSE vs NDJSON) est choisie plus bas.
    let (url, body, vendor) = if openai {
        let rf = openai_response_format(format.as_ref());
        (openai_chat_url(&host), build_openai_body(&model, &system, &user, true, rf), "LiteLLM")
    } else {
        (format!("{}/api/chat", host.trim_end_matches('/')), build_stream_chat_body(&model, &system, &user, format), "Ollama")
    };

    let mut request = client.post(&url).json(&body);
    // Clé API OPTIONNELLE → `Authorization: Bearer <clé>` sur le SEUL provider openai (jamais loguée).
    if openai {
        if let Some(key) = api_key.as_deref() {
            let key = key.trim();
            if !key.is_empty() {
                request = request.bearer_auth(key);
            }
        }
    }
    // Erreurs PRÉ-flux (connexion, statut) : `Err` sec, AUCUN chunk émis — le résolveur front
    // retombe en repli honnête (rien n'a été affiché comme réponse).
    let resp = request
        .send()
        .await
        .map_err(|e| format!("appel {vendor} echoue : {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("{vendor} a repondu {} sur {url}", resp.status()));
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
            // Lecture selon le provider : SSE (`data:` … `[DONE]`) pour openai, NDJSON pour ollama.
            let handled = if openai {
                handle_sse_line(&line, &mut emit)
            } else {
                handle_ndjson_line(&line, &mut emit)
            };
            match handled {
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
        let handled = if openai {
            handle_sse_line(&buf, &mut emit)
        } else {
            handle_ndjson_line(&buf, &mut emit)
        };
        match handled {
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

// ============================================================================================
// Découverte des modèles (Lot 2b) — `GET {host}/v1/models` (OpenAI-compatible / LiteLLM)
// --------------------------------------------------------------------------------------------
// Peuple un dropdown de modèles côté GUI (au lieu d'une saisie libre) quand la source est openai.
// MÊME bornage que `llm_complete` (garde d'hôte `host_allowed`, timeout dur, Bearer optionnel).
// HONNÊTETÉ : **ne lève JAMAIS** — endpoint injoignable / réponse inattendue → liste VIDE + `reason`
// (jamais de stack, jamais une fausse liste). La clé n'apparaît JAMAIS dans `reason` (non-fuite).
// ============================================================================================

/// Résultat de la découverte des modèles : la liste (peut être vide) + une `reason` honnête quand
/// elle est vide (hôte refusé / injoignable / réponse illisible / aucun modèle). `reason == None`
/// ⇔ la liste porte au moins un modèle. Sérialisé en camelCase pour la façade TS.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsResult {
    pub models: Vec<String>,
    pub reason: Option<String>,
}

impl ModelsResult {
    fn ok(models: Vec<String>) -> Self {
        ModelsResult { models, reason: None }
    }
    fn empty(reason: impl Into<String>) -> Self {
        ModelsResult { models: Vec::new(), reason: Some(reason.into()) }
    }
}

/**
 * Commande Tauri : découverte des modèles d'une source **OpenAI-compatible** (`GET {host}/v1/models`).
 *
 * Bornage identique à `llm_complete` : garde d'hôte (`host_allowed` vs `authoringEndpoint` réglé),
 * timeout dur, Bearer optionnel. **Ne renvoie JAMAIS d'`Err`** : tout échec (hôte refusé / réseau /
 * statut non-2xx / corps illisible / aucun modèle) devient `{ models: [], reason: Some(...) }` — le
 * GUI affiche alors l'aveu et laisse la **saisie manuelle** (jamais une fausse liste).
 *
 * **Non-fuite de la clé.** Le GUI ne détient JAMAIS la valeur de `authoringApiKey` (secret) : il ne
 * peut donc pas la passer. La clé effective est donc lue **côté Rust** — `api_key` reçu (override
 * d'une saisie non encore persistée) OU, à défaut, la clé persistée `authoringApiKey` (même patron
 * que `authoringEndpoint` dans `llm_complete`). Elle part en `Authorization: Bearer <clé>` et
 * n'apparaît **jamais** dans `reason`, un log ou l'URL.
 */
#[tauri::command]
pub async fn llm_models(
    endpoint: String,
    api_key: Option<String>,
    timeout_ms: Option<u64>,
) -> ModelsResult {
    // Hôte : l'endpoint réglé, ou le défaut LiteLLM (`localhost:4000`) si vide.
    let host = {
        let e = endpoint.trim();
        if e.is_empty() { DEFAULT_OPENAI_HOST.to_string() } else { e.to_string() }
    };
    // Garde d'hôte (CA9) INCHANGÉE : loopback OU endpoint d'authoring réglé. L'aveu ne porte que l'hôte.
    let settings_file = resolve_settings_file();
    let configured = crate::settings::read_authoring_endpoint(&settings_file);
    if !host_allowed(&host, configured.as_deref()) {
        return ModelsResult::empty(host_refused_msg(&host));
    }

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms.unwrap_or(10_000)))
        .build()
    {
        Ok(c) => c,
        Err(e) => return ModelsResult::empty(format!("client HTTP : {e}")),
    };

    let url = openai_models_url(&host);
    let mut request = client.get(&url);
    // Clé effective : l'override reçu (saisie non encore persistée), sinon la clé persistée lue côté
    // Rust (le GUI ne détient jamais le secret). Header SEUL (jamais URL / log / `reason`) — non-fuite.
    let effective_key = api_key
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
        .or_else(|| crate::settings::read_authoring_api_key(&settings_file));
    if let Some(key) = effective_key {
        let key = key.trim();
        if !key.is_empty() {
            request = request.bearer_auth(key);
        }
    }

    let resp = match request.send().await {
        Ok(r) => r,
        // Injoignable (réseau / timeout) : aveu honnête (message SANS clé), jamais une fausse liste.
        Err(e) => return ModelsResult::empty(format!("modeles indisponibles (endpoint injoignable) : {e}")),
    };
    if !resp.status().is_success() {
        return ModelsResult::empty(format!("LiteLLM a repondu {} sur {url}", resp.status()));
    }
    let json: serde_json::Value = match resp.json().await {
        Ok(v) => v,
        Err(e) => return ModelsResult::empty(format!("reponse /v1/models illisible : {e}")),
    };
    let models = parse_openai_models(&json);
    if models.is_empty() {
        return ModelsResult::empty("aucun modele expose par la source".to_string());
    }
    ModelsResult::ok(models)
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

    // --- Provider `openai` (passerelle LiteLLM, feanor-source-inference-selecteur.md) ---

    #[test]
    fn openai_chat_url_pose_le_bon_chemin() {
        assert_eq!(openai_chat_url("http://localhost:4000"), "http://localhost:4000/v1/chat/completions");
        // Slash terminal toléré (pas de double slash).
        assert_eq!(openai_chat_url("http://localhost:4000/"), "http://localhost:4000/v1/chat/completions");
    }

    #[test]
    fn build_openai_body_respecte_le_wire() {
        let b = build_openai_body("claude-3-5-sonnet", "sys", "usr", false, None);
        assert_eq!(b["model"], serde_json::json!("claude-3-5-sonnet"));
        assert_eq!(b["stream"], serde_json::json!(false));
        assert_eq!(b["messages"][0]["role"], serde_json::json!("system"));
        assert_eq!(b["messages"][0]["content"], serde_json::json!("sys"));
        assert_eq!(b["messages"][1]["role"], serde_json::json!("user"));
        assert_eq!(b["messages"][1]["content"], serde_json::json!("usr"));
        // Variante streaming : seul `stream` bascule.
        assert_eq!(build_openai_body("m", "s", "u", true, None)["stream"], serde_json::json!(true));
        // Sans response_format demandé (conseil/chat texte libre) : la clé n'apparaît PAS dans le corps.
        assert!(b.get("response_format").is_none());
    }

    #[test]
    fn build_openai_body_ne_contient_pas_de_cle() {
        // SÉCURITÉ : le corps ne porte JAMAIS de clé (elle vit dans le header Authorization). Prouvé
        // par la signature (aucun paramètre de clé) ET par l'absence de tout champ auth dans le JSON.
        // Y compris quand un response_format structuré est demandé (Lot 2b).
        let rf = openai_response_format(Some(&serde_json::json!({ "type": "object" })));
        let body = build_openai_body("gpt-4o", "systeme", "question", false, rf)
            .to_string()
            .to_lowercase();
        assert!(!body.contains("authorization"));
        assert!(!body.contains("bearer"));
        assert!(!body.contains("api_key"));
        assert!(!body.contains("apikey"));
    }

    // --- Lot 2b : response_format structuré + découverte /v1/models ---

    #[test]
    fn openai_response_format_map_json_object_ou_none() {
        // Un schéma présent (front demande du structuré) ⇒ `{"type":"json_object"}` (MVP le + honoré).
        let rf = openai_response_format(Some(&serde_json::json!({ "type": "object", "properties": {} })));
        assert_eq!(rf, Some(serde_json::json!({ "type": "json_object" })));
        // Absent (conseil/chat texte libre) ⇒ aucun response_format.
        assert_eq!(openai_response_format(None), None);
    }

    #[test]
    fn build_openai_body_pose_le_response_format_quand_structure() {
        // Structuré demandé : le corps porte `response_format:{type:json_object}` (Lot 2b).
        let rf = openai_response_format(Some(&serde_json::json!({ "type": "object" })));
        let b = build_openai_body("gpt-4o", "s", "u", false, rf);
        assert_eq!(b["response_format"], serde_json::json!({ "type": "json_object" }));
        // Non structuré : aucun response_format (non-régression conseil/chat).
        let b2 = build_openai_body("gpt-4o", "s", "u", false, None);
        assert!(b2.get("response_format").is_none());
    }

    #[test]
    fn openai_models_url_pose_le_bon_chemin() {
        assert_eq!(openai_models_url("http://localhost:4000"), "http://localhost:4000/v1/models");
        // Slash terminal toléré (pas de double slash).
        assert_eq!(openai_models_url("http://localhost:4000/"), "http://localhost:4000/v1/models");
    }

    #[test]
    fn parse_openai_models_extrait_les_ids() {
        let resp = serde_json::json!({
            "data": [
                { "id": "claude-3-5-sonnet", "object": "model" },
                { "id": "gpt-4o", "object": "model" },
                { "id": "qwen2.5-coder", "object": "model" }
            ]
        });
        assert_eq!(
            parse_openai_models(&resp),
            vec!["claude-3-5-sonnet".to_string(), "gpt-4o".to_string(), "qwen2.5-coder".to_string()]
        );
    }

    #[test]
    fn parse_openai_models_forme_inattendue_rend_liste_vide() {
        // AVEU honnête : une réponse qui n'est pas `{data:[{id}]}` → liste vide, jamais une fausse liste.
        assert!(parse_openai_models(&serde_json::json!({ "unexpected": true })).is_empty());
        assert!(parse_openai_models(&serde_json::json!({ "data": "pas un tableau" })).is_empty());
        assert!(parse_openai_models(&serde_json::json!({ "data": [] })).is_empty());
        // Entrées sans `id` string / vides → ignorées.
        let mixed = serde_json::json!({ "data": [ { "id": "" }, { "object": "model" }, { "id": "  gpt-4o  " } ] });
        assert_eq!(parse_openai_models(&mixed), vec!["gpt-4o".to_string()]);
    }

    #[test]
    fn parse_openai_models_deduplique_en_preservant_lordre() {
        let resp = serde_json::json!({
            "data": [ { "id": "gpt-4o" }, { "id": "claude" }, { "id": "gpt-4o" } ]
        });
        assert_eq!(parse_openai_models(&resp), vec!["gpt-4o".to_string(), "claude".to_string()]);
    }

    #[test]
    fn models_result_reason_ne_contient_jamais_la_cle() {
        // SÉCURITÉ : l'aveu « hôte refusé » de la découverte ne porte que l'hôte (jamais la clé).
        let r = ModelsResult::empty(host_refused_msg("http://evil.example.com:4000"));
        assert!(r.models.is_empty());
        let reason = r.reason.unwrap();
        assert!(reason.contains("http://evil.example.com:4000"));
        assert!(!reason.contains("sk-"));
        assert!(!reason.to_lowercase().contains("bearer"));
    }

    #[test]
    fn host_refused_msg_ne_contient_jamais_la_cle() {
        // SÉCURITÉ : l'aveu « hôte refusé » (renvoyé AVANT tout usage de la clé) ne porte que l'hôte.
        let msg = host_refused_msg("http://evil.example.com:4000");
        assert!(msg.contains("http://evil.example.com:4000"));
        assert!(!msg.contains("sk-"));
        assert!(!msg.to_lowercase().contains("bearer"));
    }

    #[test]
    fn extract_openai_content_ok_et_ko() {
        let ok = serde_json::json!({
            "choices": [ { "message": { "role": "assistant", "content": "Voici mon conseil." } } ]
        });
        assert_eq!(extract_openai_content(&ok).unwrap(), "Voici mon conseil.");
        let ko = serde_json::json!({ "choices": [] });
        assert!(extract_openai_content(&ko).is_err());
        let ko2 = serde_json::json!({ "unexpected": true });
        assert!(extract_openai_content(&ko2).is_err());
    }

    #[test]
    fn parse_openai_sse_line_delta_done_ignore_et_illisible() {
        // Delta de contenu.
        let ev = parse_openai_sse_line("data: {\"choices\":[{\"delta\":{\"content\":\"Salut\"}}]}").unwrap();
        assert_eq!(ev, SseEvent::Token("Salut".into()));
        // Sentinelle de fin.
        assert_eq!(parse_openai_sse_line("data: [DONE]").unwrap(), SseEvent::Done);
        // Delta vide (rôle initial, pas de contenu) → Token vide, toléré.
        let ev2 = parse_openai_sse_line("data: {\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}").unwrap();
        assert_eq!(ev2, SseEvent::Token(String::new()));
        // Ligne blanche / commentaire keep-alive `:` / champ `event:` → ignorés.
        assert_eq!(parse_openai_sse_line("").unwrap(), SseEvent::Ignore);
        assert_eq!(parse_openai_sse_line(": ping").unwrap(), SseEvent::Ignore);
        assert_eq!(parse_openai_sse_line("event: message").unwrap(), SseEvent::Ignore);
        // `data:` avec un JSON illisible → Err (flux corrompu), jamais un panic.
        let e = parse_openai_sse_line("data: pas du json").unwrap_err();
        assert!(e.contains("illisible"));
        assert!(!e.contains("panic"));
    }

    #[test]
    fn drive_sse_emet_tokens_puis_done() {
        let lines = [
            "data: {\"choices\":[{\"delta\":{\"content\":\"Bon\"}}]}",
            "",
            "data: {\"choices\":[{\"delta\":{\"content\":\"jour\"}}]}",
            "",
            "data: [DONE]",
        ];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let closed = drive_sse(&lines, &mut |c| chunks.push(c)).unwrap();
        assert!(closed, "le flux doit se clore proprement sur [DONE]");
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
    fn drive_sse_flux_sans_done_ne_ment_pas() {
        // Des deltas arrivent mais AUCUN `[DONE]` → Ok(false), PAS de Done émis (partiel honnête).
        let lines = ["data: {\"choices\":[{\"delta\":{\"content\":\"partiel\"}}]}"];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let closed = drive_sse(&lines, &mut |c| chunks.push(c)).unwrap();
        assert!(!closed, "sans [DONE], le flux n'est PAS clos (partiel honnête)");
        assert_eq!(chunks, vec![StreamChunk::Token { text: "partiel".into() }]);
        assert!(!chunks.contains(&StreamChunk::Done));
    }

    #[test]
    fn drive_sse_ligne_illisible_propage_err() {
        let lines = [
            "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}",
            "data: {ceci n'est pas du json",
        ];
        let mut chunks: Vec<StreamChunk> = Vec::new();
        let res = drive_sse(&lines, &mut |c| chunks.push(c));
        assert!(res.is_err(), "une ligne SSE illisible interrompt le flux (aveu)");
        assert_eq!(chunks, vec![StreamChunk::Token { text: "ok".into() }]);
    }

    #[test]
    fn openai_reutilise_la_meme_garde_dhote() {
        // Non-régression : la garde d'hôte est PARTAGÉE (openai n'ouvre rien de plus). localhost:4000
        // (LiteLLM) passe par le loopback ; un LiteLLM LAN doit égaler l'endpoint réglé.
        assert!(host_allowed("http://localhost:4000", None));
        assert!(!host_allowed("http://192.168.2.11:4000", None));
        assert!(host_allowed("http://192.168.2.11:4000", Some("http://192.168.2.11:4000")));
    }
}
