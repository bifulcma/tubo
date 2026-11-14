# BRIEF 1 — Tubo: correzioni + «Chi parla e con quale autorità»

Repo: ~/work/tubo (GitHub bifulcma/tubo, branch main). Pubblicazione: ramo `gh-pages` (build di `dist/` dal main; vedi i commit "Pubblica Tubo (build dal main <sha>)" in `git log origin/gh-pages`). Sito: https://bifulcma.github.io/tubo/
Stack: React + TS + Vite, test con vitest. Interfaccia tutta in italiano. Utente non tecnico: testi semplici.
NON lanciare sotto-agenti paralleli. Lavora a lotti: dopo OGNI lotto `npm test` + `npm run build` verdi, poi commit + push su main.
Nei test usa SOLO la modalità dimostrazione/mock: nessuna chiamata reale a YouTube o al ponte.

## Lotto A — correzioni
1. **Indirizzi per pagina (routing con hash)**: `#/`, `#/cerca?q=...&ai=...`, `#/video/<id>`, `#/canale/<id>`, `#/cronologia`, `#/dopo`, `#/impostazioni`. Il tasto Indietro del browser/iPad deve tornare alla pagina precedente dentro l'app; ricaricare `#/video/<id>` deve riaprire il video (dati dalla cronologia/ricerche salvate o, se non ci sono e non in demo, da videos.list). Ricaricare `#/cerca?q=` riapre la ricerca salvata se esiste, senza rifare il lavoro dell'AI. Il tasto «Condividi» copia questo indirizzo.
2. **Pagina canale**: fuori dalla demo NON mescolare DEMO_VIDEOS. Fuori demo carica i video veri del canale (channels.list contentDetails → playlist uploads → playlistItems.list + videos.list; costo quota basso) e mostra in testa la scheda del canale (vedi Lotto B). In demo resta com'è.
3. **Annulla ricerca**: AbortController per ogni ricerca; nuova ricerca = annulla la precedente; pulsante «Annulla» nella schermata di avanzamento. Una ricerca annullata non deve sovrascrivere i risultati né mostrare errori rossi.
4. **Lingue e durata a YouTube**: usare `plan.lingue` (prima lingua → relevanceLanguage per ogni ricerca; se le ricerche sono scritte in lingue diverse, abbinare la lingua alla ricerca se l'AI la fornisce — puoi estendere il JSON del passo 1 con `ricerche: [{q, lingua}]` accettando anche il vecchio formato a stringhe). `durata_minima_min` → parametro `videoDuration` (>=20 → long, >=4 → medium) oltre al filtro dopo.
5. **Cache 24 h** dei risultati YouTube (search.list per query+lingua+durata) in localStorage, per risparmiare quota (search.list costa 100 unità).
6. Passo 3: dare all'AI descrizione fino a 800 caratteri e, se disponibili, i dati del canale (iscritti, descrizione breve).

## Lotto B — NUOVA FUNZIONE: «Chi parla e con quale autorità» (richiesta di Marco)
Marco vuole, quando sceglie un video, sapere CHI è il canale e l'autore/relatore, e QUALE legittimazione ha per parlare dell'oggetto della ricerca.

1. `youtube.ts`: `fetchChannelDetails(ids[])` con channels.list part=snippet,statistics,brandingSettings,topicDetails (1 unità; batch fino a 50 id). Dati: titolo, descrizione, paese, data di creazione, iscritti (se non nascosti), numero video, visualizzazioni totali, custom URL. Cache in localStorage 7 giorni. Test con fetch finto.
2. Nel passo 2 della ricerca recuperare in batch i canali dei risultati (un'unica chiamata) e passarli al passo 3.
3. **Passo 3 esteso**: per ogni video l'AI aggiunge `autore` (chi parla, se si capisce da titolo/descrizione/canale, altrimenti "non indicato") e `autorita`: "alta" | "media" | "bassa" | "sconosciuta". Accettare anche risposte senza questi campi (retro-compatibile). Sulla scheda del video nei risultati mostrare una riga piccola: «👤 <autore> · autorità: <livello>» con colore discreto.
4. **Pagina video — riquadro «Chi parla»** (sotto il riassunto, sopra la descrizione), preparato dall'AI all'apertura come già fa il riassunto e salvato in cache per video (e la parte canale per canale):
   - **Il canale**: chi è (persona, università, istituto, editore, divulgatore, canale di ripubblicazione/aggregatore…), da quando esiste, iscritti, quanti video, paese.
   - **L'autore/relatore**: nome, ruolo, affiliazione (università, ordine religioso, istituto), opere principali se note.
   - **Legittimazione sull'argomento della ricerca** (`video.aiQuery`): perché è o non è qualificato su QUEL tema; livello alta/media/bassa/sconosciuta; eventuale orientamento o parzialità dichiarata (scuola di pensiero, confessione, partito, fini commerciali).
   - **Fonti**: chiamare il ponte con `web: true` (estendere `askBridge` con un parametro `web?: boolean`, default false) così l'AI può verificare in rete; chiedere SOLO JSON: `{"canale": "...", "autore": "...", "ruolo_affiliazione": "...", "legittimazione": "...", "livello": "alta|media|bassa|sconosciuta", "orientamento": "...", "fonti": [{"titolo":"...","url":"..."}], "certezza": "verificato|dedotto"}`. Mostrare le fonti come link cliccabili. Distinguere chiaramente nel testo ciò che è verificato in rete da ciò che è dedotto da titolo/descrizione (badge «verificato» / «dedotto»).
   - Se il ponte non supporta il web o fallisce: riprova una volta con `web: false` e mostra il badge «dedotto, non verificato in rete».
   - Regola nel prompt: non inventare titoli accademici o affiliazioni; se non si sa, scrivere «non risulta».
   - Pulsante «Aggiorna» per rifare l'analisi.
5. Nella pagina canale (Lotto A.2) mostrare in testa la stessa scheda canale (dati YouTube + giudizio AI se già in cache, altrimenti pulsante «Chi è questo canale?»).
6. Demo: dati finti coerenti per «Chi parla» (es. «Archivio Filosofico Italiano» = canale di un'associazione, relatore inventato) marcati come dimostrazione.
7. Test unitari: parsing JSON di «Chi parla» (anche con ```json e campi mancanti), fallback web→no-web, channels.list batch, cache.

## Lotto C — grafica e pubblicazione
1. Testi tagliati: banner «Modalità dimostrazione» e placeholder della ricerca non devono essere troncati su schermi stretti (iPhone 390 px, iPad 768 px). Contrasto dei testi secondari migliore.
2. Nel selettore AI mostrare il nome per intero con una mini-descrizione (es. «Nemotron 3.5 — locale sul Mac Studio»).
3. Aggiornare LEGGIMI.md (nuove funzioni, routing, cache).
4. `npm test` e `npm run build` verdi → commit su main → pubblica su gh-pages con lo stesso stile dei commit precedenti («Pubblica Tubo (build dal main <sha>)») → aspetta ~1-2 minuti e verifica con curl che https://bifulcma.github.io/tubo/ serva i nuovi file `assets/index-*.js` della build.
5. Apri il sito pubblicato in modalità dimostrazione (es. con un browser headless / Playwright se disponibile, altrimenti verifica con curl il JS) e controlla che: routing e Indietro funzionino, il riquadro «Chi parla» compaia nella pagina video demo.

## Esito
Scrivi `~/work/tubo_esito_1.md` in italiano semplice: cosa è stato fatto per lotto, sha dei commit, numero test, URL pubblicato verificato, cosa NON è stato fatto e perché.
