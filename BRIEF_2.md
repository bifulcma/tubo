# BRIEF 2 — Tubo: durata, pensato per video lunghi

Repo ~/work/tubo (main). Tubo serve soprattutto per VIDEO LUNGHI (lezioni, conferenze, seminari).

1. `src/youtube.ts` `durataPerYouTube`: mai più 'medium'. Restituisce 'long' solo se minuti >= 20, altrimenti undefined (nessun filtro di durata a YouTube; il filtro sui minuti dopo videos.list resta com'è). Aggiorna `youtube.test.ts` (4 e 19 → undefined).
2. Prompt del passo 1 (searchOrchestrator.ts): dire all'AI che Tubo è pensato per video lunghi; se l'utente NON chiede esplicitamente video brevi, imposta `durata_minima_min` a 20; se chiede video brevi o una durata precisa, rispetta la richiesta. Stessa cosa nella modalità dimostrazione (mockAi), se ha senso.
3. Aggiorna LEGGIMI.md (una riga sulla durata).
4. `npm test` + `npm run build` verdi → commit su main → pubblica su gh-pages come i commit precedenti («Pubblica Tubo … (build dal main <sha>)») → verifica con curl che https://bifulcma.github.io/tubo/ serva il nuovo `assets/index-*.js`.
Non committare BRIEF_*.md. Non toccare il tema/la grafica.
Esito in ~/work/tubo_esito_2.md (italiano semplice: sha, test, URL verificato).
