# Tubo — Video con Ricerca Guidata da Intelligenza Artificiale

**Tubo** è un'applicazione web moderna e personale per guardare video di YouTube senza distrazioni né acchiappa-clic, in cui la ricerca e la selezione qualitativa sono guidate dall'intelligenza artificiale scelta dall'utente.

---

## Caratteristiche Principali

- 🧠 **Ricerca in linguaggio naturale con AI**: Descrivi liberamente ciò che desideri apprendere o guardare (es. *«lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco»*).
- 🤖 **3 AI selezionabili** (nel selettore si vede nome e mini-descrizione):
  - **Nemotron 3.5 — locale sul Mac Studio** (`nemotron`): privato, nessun costo.
  - **Claude — Anthropic, nel cloud** (`claude`): analisi dei testi più raffinata.
  - **Argon — Gemini Flash, nel cloud, rapido** (`argon`).
- ⚡ **Il Flusso di Ricerca a 3 Passi**:
  1. **Passo 1 (Pianificazione AI)**: l'AI prepara da 2 a 4 ricerche, ognuna **con la sua lingua** (`{"q": "...", "lingua": "de"}`; il vecchio formato a semplici testi è ancora accettato), le lingue preferite, la durata minima e i termini da escludere. **Tubo è pensato per video lunghi**: se non chiedi esplicitamente video brevi, la durata minima è 20 minuti; se chiedi video brevi o una durata precisa (es. «sotto i 10 minuti», «almeno 45 minuti»), l'AI rispetta la tua richiesta.
  2. **Passo 2 (YouTube)**: ogni ricerca usa la sua lingua (`relevanceLanguage`) e, se serve, la durata (`videoDuration`: solo «long», da 20 minuti in su; sotto i 20 minuti nessun filtro di durata a YouTube). Poi `videos.list` per i dettagli e **una sola** `channels.list` per sapere chi sono i canali (iscritti, descrizione, paese…).
  3. **Passo 3 (Selezione AI)**: l'AI riceve titolo, descrizione (fino a 800 caratteri) e dati del canale; dà un voto da 0 a 10 con il motivo, e indica **chi parla** e la sua **autorità** sull'argomento (alta / media / bassa / sconosciuta). Sulle schede compare la riga «👤 autore · autorità: livello».
- 📅 **Periodo e attualità**:
  - **Criterio «Periodo»** accanto alla ricerca (Mac/iPad: menu 📅 nella barra; iPhone: pulsanti «Pubblicati:» nella ricerca a tutto schermo): *Ogni data* (decide l'AI), ultima settimana, ultimo mese, 6 mesi, 1 anno, 3 anni, 5 anni. Va a YouTube come `publishedAfter` e finisce nell'indirizzo (`&periodo=30g`). Non si ricorda tra una visita e l'altra: ogni volta si riparte da *Ogni data*.
  - **L'AI capisce l'attualità** (passo 1): `"attualita": true` per notizie, «ultimi», situazione attuale…; `"pubblicato_dopo"` / `"pubblicato_prima"` quando la richiesta indica un periodo («dal 2020», «dopo il 24 febbraio 2022»). Attualità senza date → ultimo anno. Il periodo scelto dall'utente vince sempre.
  - **La data pesa nel voto** (passo 3): l'AI riceve la data di ogni video e la data di oggi; con l'attualità premia i recenti e penalizza i vecchi o superati, altrimenti non penalizza lezioni e classici. A parità di voto, con l'attualità, prima i più recenti.
  - **Anno sempre visibile**: sulla miniatura di ogni scheda (📅 «mar 2019», «3 giorni fa» per i recentissimi) e nei suggeriti della pagina video. Nei risultati si può ordinare per **Voto AI** o **Più recenti**.
- ⏹️ **Annulla ricerca**: durante l'avanzamento c'è il pulsante «Annulla». Una nuova ricerca annulla automaticamente quella in corso; una ricerca annullata non cambia i risultati e non mostra errori.
- 👤 **Chi parla e con quale autorità** (pagina video, sotto la valutazione): l'AI prepara una scheda con
  - **il canale** (persona, università, istituto, editore, divulgatore, aggregatore…; da quando esiste, iscritti, video, paese);
  - **l'autore/relatore** (nome, ruolo, affiliazione, opere note);
  - **la legittimazione** sull'argomento cercato, con livello e l'eventuale orientamento o parzialità dichiarata;
  - **le fonti** come link cliccabili.
  L'AI prova prima **cercando in rete** (`web: true` al ponte); se il ponte non può, riprova senza rete. Il badge dice se il dato è **«verificato in rete»** o **«dedotto»** (da titolo e descrizione). Regola: niente titoli o affiliazioni inventati, se non si sa scrive «non risulta». Il pulsante **«Aggiorna»** rifà l'analisi.
- 📺 **Pagina canale**: scheda del canale con i dati di YouTube (iscritti, video, visualizzazioni, anno di nascita, paese, descrizione), il giudizio dell'AI («Chi è questo canale?») e gli **ultimi video veri** del canale (costa circa 3 unità di quota, contro le 100 di una ricerca).
- 🎬 **Pagina Video Dedicata**: Player ufficiale incorporato (`youtube-nocookie.com/embed/ID`), titolo, canale, data, visualizzazioni, descrizione espandibile e barra laterale dei video suggeriti dalla stessa ricerca.
- 📚 **Funzionalità Complete**: Home, lista **Guarda più tardi** e **Cronologia** visualizzazioni (con cancellazione sicura).

---

## Indirizzi delle pagine (Indietro e ricarica funzionano)

Ogni pagina ha il suo indirizzo dopo il `#`, così il tasto **Indietro** del browser o dell'iPad torna alla pagina precedente dentro Tubo, e ricaricando si resta dove si era:

| Pagina | Indirizzo |
|---|---|
| Home | `#/` |
| Risultati di una ricerca | `#/cerca?q=...&ai=...` |
| Video | `#/video/<id>` |
| Canale | `#/canale/<id>` |
| Cronologia | `#/cronologia` |
| Guarda più tardi | `#/dopo` |
| Impostazioni | `#/impostazioni` |

- Ricaricando `#/video/<id>` il video si riapre dai dati salvati (cronologia, ricerche); se non c'è, Tubo lo chiede a YouTube (1 unità).
- Ricaricando `#/cerca?q=...` si riapre la **ricerca salvata** senza far lavorare di nuovo l'AI; se su quel dispositivo non è salvata, Tubo chiede prima di rifarla.
- Il pulsante **«Condividi»** nella pagina video copia l'indirizzo di Tubo per quel video.

## Memoria sul dispositivo (cache)

Per risparmiare la quota di YouTube (10.000 unità al giorno; una ricerca `search.list` costa 100) e il lavoro dell'AI, Tubo ricorda nel `localStorage`:

| Cosa | Per quanto |
|---|---|
| Risultati di ogni ricerca YouTube (stessa ricerca + lingua + durata) | 24 ore |
| Dati dei canali (`channels.list`) | 7 giorni |
| «Chi parla» per video e giudizio per canale | 30 giorni (o finché premi «Aggiorna») |
| Riassunti, commenti e capitoli dalla trascrizione | ultimi 200-300 video |
| Ultime ricerche complete | ultime 15 |
- 🎨 **Interfaccia Pulita e Temi**: Tema scuro moderno e tema chiaro, reattiva su Mac, iPad, tablet Android e smartphone.
- 📱 **Progressive Web App (PWA)**: Installabile sulla schermata Home come app nativa grazie al file `manifest.json` e icone vettoriali SVG.
- 🛡️ **Privacy & Sicurezza**: Nessuna chiave o credenziale è hardcodata; tutto è memorizzato esclusivamente nel `localStorage` del tuo browser.

---

## Prova Subito: Modalità Dimostrazione (Offline)

Se non hai ancora configurato la chiave YouTube o il token del ponte AI, Tubo si avvia **automaticamente in modalità dimostrazione**:
- Catalogo ricco di video tematici (filosofia, fisica teorica, machine learning, musica analitica, design).
- Anteprime disegnate interamente in **SVG/CSS** (nessuna immagine esterna copiata).
- Motore AI simulato che illustra fedelmente tutti i 3 passi della ricerca e la motivazione delle valutazioni.

Puoi provare subito la query di riferimento consigliata:
> *«lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco»*

---

## Come Avviare e Provare l'App in Locale

Assicurati di avere **Node.js** (versione 18 o superiore) installato.

1. **Installa le dipendenze**:
   ```bash
   cd ~/work/tubo
   npm install
   ```

2. **Esegui i test automatici**:
   ```bash
   npm test
   ```
   Tutti i test unitari (moduli `ponte.ts`, `youtube.ts`, `searchOrchestrator.ts`, `chiParla.ts`, `router.ts` e `storage.ts`) usano solo dati finti: nessuna chiamata vera a YouTube o al ponte.

3. **Compila la versione statica**:
   ```bash
   npm run build
   ```
   Genera i file ottimizzati e pronti per la pubblicazione nella cartella `dist/`.

4. **Avvia l'anteprima statica**:
   ```bash
   npm run preview
   ```
   Apri il link indicato nel terminale (es. `http://localhost:4173/`) nel tuo browser.

---

## Come Collegare la Vera YouTube API e il Ponte AI

Quando desideri utilizzare Tubo con video reali di YouTube e i tuoi modelli AI:

1. Apri Tubo nel browser e clicca sull'icona delle **Impostazioni** (o in basso su smartphone).
2. Inserisci:
   - **Chiave YouTube Data API v3**: generata dalla Google Cloud Console con abilitata l'API YouTube Data v3.
   - **Indirizzo del ponte**: l'indirizzo Tailscale del ponte di PDF Penna sul tuo Mac, es. `https://<nome-mac>.<tailnet>.ts.net:8443`.
   - **Token del ponte**: il token Bearer per autenticare le richieste a `/ask`.
   - **AI predefinita**: scegli il tuo modello preferito (Nemotron 3.5, Claude o Argon).
3. Clicca su **Salva impostazioni**.
4. Puoi premere **Testa connessione al ponte** per verificare immediatamente la raggiungibilità del tuo Mac Studio o server locale.

---

## Come Pubblicare Tubo su GitHub Pages (o altri hosting statici)

La configurazione di Vite utilizza `base: './'` (percorsi relativi). Questo permette di pubblicare il contenuto della cartella `dist/` in qualsiasi sottocartella senza modifiche al codice. Grazie agli indirizzi con `#` non serve nessuna regola speciale sul server.

### Esempio: Pubblicazione su GitHub Pages (sottocartella `/tubo/`)

1. Esegui la build:
   ```bash
   npm run build
   ```
2. Copia il contenuto di `dist/` sul ramo `gh-pages` e fai un commit «Pubblica Tubo (build dal main <sha>)», poi `git push origin gh-pages`.
3. Il sito sarà immediatamente consultabile all'indirizzo:
   `https://<tuo-utente>.github.io/tubo/`

---

## Installazione come PWA (iPad, Android, Mac)

- **iPad / iPhone (Safari)**: Tocca il pulsante *Condividi* e seleziona *Aggiungi alla schermata Home*.
- **Android (Chrome)**: Tocca i tre puntini del menu e seleziona *Installa app* o *Aggiungi a schermata Home*.
- **Mac (Chrome / Safari / Edge)**: Clicca sull'icona di installazione nella barra degli indirizzi o scegli *Aggiungi al Dock*.

---

## TuboF — la versione di famiglia (https://tubof.vercel.app)

Stesso codice, costruito con `VITE_MODALITA=famiglia` e pubblicato su Vercel (progetto `tubof`, regione fra1). Il Tubo di Marco (GitHub Pages + ponte dello Studio) non cambia.

- **Accesso solo su invito**: l'amministratore crea l'invito in *Impostazioni › Famiglia* e manda il link (`/#/invito?c=…`, vale 7 giorni, una volta sola); chi lo apre sceglie la sua password (minimo 10 caratteri). «Nuova password» crea un link per reimpostarla; «Togli accesso» chiude subito le sessioni di quella persona.
- **Chiavi solo sul server** (variabili di Vercel): `OLLAMA_API_KEY`, `YOUTUBE_API_KEY`, `SEGRETO_SESSIONE`; il primo account (amministratore) nasce da `PRIMO_INVITO` + `ADMIN_EMAIL` finché non esiste nessun account.
- **AI = Ollama Cloud** (`api/ask.js`, stessi eventi SSE del ponte): Nemotron 3 Super, GLM 5.3 (accurato), DeepSeek V4.1 Flash (rapido); modelli cambiabili con `MODELLO_NEMOTRON` / `MODELLO_CLAUDE` / `MODELLO_ARGON`. Niente ricerca in rete (la scheda «Chi parla» resta «dedotto») e niente trascrizioni.
- **YouTube** passa da `api/yt.js` (solo search, videos, channels, playlistItems). Le ricerche si riusano per 6 ore per tutta la famiglia.
- **Limiti al giorno** a testa: 3000 unità YouTube (≈ 30 search.list, cioè circa 10 ricerche AI) e 200 risposte AI; amministratore 4000/400. Cambiabili con `LIMITE_UNITA`, `LIMITE_AI`, `LIMITE_UNITA_ADMIN`, `LIMITE_AI_ADMIN`.
- **Archivio**: account e inviti in un Vercel Blob privato (`tubof/utenti.json`, `tubof/inviti.json`, password con scrypt); contatori e tentativi di accesso nella Runtime Cache di Vercel.
- **Pubblicare** (dal Mini, cartella collegata al progetto): `npx vercel deploy --prod`. Chiave YouTube: `scripts/tubof-chiave-youtube.sh` (la chiede senza mostrarla e ripubblica).
