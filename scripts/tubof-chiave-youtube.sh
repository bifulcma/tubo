#!/bin/zsh
# TuboF: salva la chiave YouTube sul server (Vercel) senza mostrarla, poi ripubblica.
# Uso (dal Mac Studio):  ssh -t mini-cavo ~/work/tubo/scripts/tubof-chiave-youtube.sh
export PATH=/opt/homebrew/bin:$PATH
cd ~/work/tubo || exit 1
print -n "Incolla la chiave YouTube di TuboF e premi Invio (non si vede): "
read -s CHIAVE; echo
[[ -z "$CHIAVE" ]] && { echo "Nessuna chiave: niente fatto."; exit 1; }
npx --yes vercel@latest env rm YOUTUBE_API_KEY production --yes >/dev/null 2>&1
printf %s "$CHIAVE" | npx vercel@latest env add YOUTUBE_API_KEY production --sensitive >/dev/null 2>&1 \
  && echo "Chiave salvata." || { echo "Errore nel salvare la chiave."; exit 1; }
unset CHIAVE
echo "Ripubblico TuboF (circa 30 secondi)…"
npx vercel@latest deploy --prod --yes 2>&1 | grep -E "Aliased|Ready|Error"
echo "Fatto: https://tubof.vercel.app"
