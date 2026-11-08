# Tubo — Video con Ricerca Guidata da Intelligenza Artificiale

**Tubo** è un'applicazione web moderna e personale per guardare video di YouTube senza distrazioni né acchiappa-clic, in cui la ricerca e la selezione qualitativa sono guidate dall'intelligenza artificiale scelta dall'utente.

---

## Caratteristiche Principali

- 🧠 **Ricerca in linguaggio naturale con AI**: Descrivi liberamente ciò che desideri apprendere o guardare (es. *«lezioni serie su Carl Schmitt e il katechon, non divulgative, in italiano o tedesco»*).
- 🤖 **4 Provider AI selezionabili**:
  - **Qwen (locale)**: modello open-weights locale, veloce e privato (`qwen`).
  - **Gemma (locale)**: modello compatto di Google in locale (`gemma`).
  - **Claude**: Anthropic Claude per analisi testuale e critica (`claude`).
  - **Argon (Gemini Flash)**: Google Gemini 2.0 Flash (`argon`).
- ⚡ **Il Flusso di Ricerca a 3 Passi**:
  1. **Passo 1 (Pianificazione AI)**: L'AI riceve la richiesta e genera da 2 a 4 sotto-ricerche mirate, le lingue rilevanti, la durata minima e i termini da escludere.
  2. **Passo 2 (Interrogazione YouTube)**: L'applicazione chiama la YouTube Data API v3 (`search.list` e `videos.list`) recuperando statistiche, durata ISO e dettagli.
  3. **Passo 3 (Selezione e Punteggio AI)**: L'AI valuta l'elenco dei video, penalizza o scarta acchiappa-clic e contenuti banali, assegnando a ciascuno un punteggio da 0 a 10 e una motivazione sintetica (*il «perché» dell'AI*).
- 🎬 **Pagina Video Dedicata**: Player ufficiale incorporato (`youtube-nocookie.com/embed/ID`), titolo, canale, data, visualizzazioni, descrizione espandibile e barra laterale dei video suggeriti dalla stessa ricerca.
- 📺 **Funzionalità Complete**: Home con tendenze, pagina Canale, lista **Guarda più tardi** e **Cronologia** visualizzazioni (con cancellazione sicura).
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
   cd app
   npm install
   ```

2. **Esegui i test automatici**:
   ```bash
   npm test
   ```
   Tutti i 24 test unitari (modulo `ponte.ts`, `youtube.ts`, `searchOrchestrator.ts` e `storage.ts`) vengono eseguiti con successo.

3. **Compila la versione statica**:
   ```bash
   npm run build
   ```
   Genera i file ottimizzati e pronti per la pubblicazione nella cartella `app/dist/`.

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
   - **AI predefinita**: scegli il tuo modello preferito (Qwen, Gemma, Claude o Argon).
3. Clicca su **Salva impostazioni**.
4. Puoi premere **Testa connessione al ponte** per verificare immediatamente la raggiungibilità del tuo Mac Studio o server locale.

---

## Come Pubblicare Tubo su GitHub Pages (o altri hosting statici)

La configurazione di Vite utilizza `base: './'` (percorsi relativi). Questo permette di pubblicare il contenuto della cartella `app/dist/` in qualsiasi sottocartella senza modifiche al codice.

### Esempio: Pubblicazione su GitHub Pages (sottocartella `/tubo/`)

1. Esegui la build:
   ```bash
   cd app
   npm run build
   ```
2. Carica i file generati dentro `app/dist/` sul ramo `gh-pages` del tuo repository:
   ```bash
   git subtree push --prefix app/dist origin gh-pages
   ```
   Oppure configura una GitHub Action standard per pubblicare la cartella `app/dist`.
3. Il sito sarà immediatamente consultabile all'indirizzo:
   `https://<tuo-utente>.github.io/tubo/`

---

## Installazione come PWA (iPad, Android, Mac)

- **iPad / iPhone (Safari)**: Tocca il pulsante *Condividi* e seleziona *Aggiungi alla schermata Home*.
- **Android (Chrome)**: Tocca i tre puntini del menu e seleziona *Installa app* o *Aggiungi a schermata Home*.
- **Mac (Chrome / Safari / Edge)**: Clicca sull'icona di installazione nella barra degli indirizzi o scegli *Aggiungi al Dock*.
