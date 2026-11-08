import { SearchPlan, VideoEvaluation, VideoItem } from '../types';
import { DEMO_VIDEOS } from './mockVideos';
import { generateSvgThumbnail } from './svgThumbnails';

/**
 * Simula il Passo 1 dell'AI: analizza la richiesta in linguaggio naturale
 * e genera un piano di ricerca JSON strutturato.
 */
export function mockAiPlanSearch(prompt: string): SearchPlan {
  const lower = prompt.toLowerCase();

  // Rilevamento lingue richieste
  const lingue: string[] = [];
  if (lower.includes('tedesco') || lower.includes('tedesca') || lower.includes('de') || lower.includes('deutsch')) {
    lingue.push('de');
  }
  if (lower.includes('italiano') || lower.includes('italiana') || lower.includes('it') || lower.includes('italia')) {
    lingue.push('it');
  }
  if (lower.includes('inglese') || lower.includes('english') || lower.includes('en')) {
    lingue.push('en');
  }
  if (lingue.length === 0) {
    lingue.push('it');
  }

  // Rilevamento vincolo durata
  let durataMinima = 0;
  if (lower.includes('serie') || lower.includes('non divulgat') || lower.includes('accademic') || lower.includes('lunghe') || lower.includes('corso')) {
    durataMinima = 20;
  }

  // Termini da escludere
  const escludi: string[] = ['shorts', 'acchiappaclic', 'reazione', 'trailer'];
  if (lower.includes('non divulgat') || lower.includes('non divulgative')) {
    escludi.push('divulgazione facile', 'riassunto animato', 'bignami');
  }

  // Generazione ricerche intelligenti
  const ricerche: string[] = [];

  if (lower.includes('schmitt') || lower.includes('katechon')) {
    ricerche.push('Carl Schmitt katechon teologia politica lezione');
    ricerche.push('Carl Schmitt der Begriff des Politischen Katechon Vorlesung');
    ricerche.push('Schmitt sovranità stato eccezione Benjamin');
  } else if (lower.includes('quantistic') || lower.includes('fisica')) {
    ricerche.push('Meccanica quantistica disuguaglianze Bell EPR lezione');
    ricerche.push('Fondamenti di fisica teorica e non località');
  } else if (lower.includes('intelligenza artificiale') || lower.includes('llm') || lower.includes('transformer')) {
    ricerche.push('Transformer architecture attention mechanism lecture');
    ricerche.push('Deep learning inferenza LLM architettura');
  } else {
    // Genera 2-3 query pulite basate sulle parole chiave dell'utente
    const cleaned = prompt
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['voglio', 'vedere', 'cercami', 'trova', 'delle', 'sulle', 'nella'].includes(w.toLowerCase()));

    const keyTerms = cleaned.slice(0, 4).join(' ');
    ricerche.push(`${keyTerms} lezione approfondita`);
    ricerche.push(`${keyTerms} seminario analisi`);
    if (lingue.includes('de')) {
      ricerche.push(`${keyTerms} Vorlesung wissenschaftlich`);
    } else {
      ricerche.push(`${keyTerms} spiegazione rigorosa`);
    }
  }

  return {
    ricerche: ricerche.slice(0, 3),
    lingue,
    durata_minima_min: durataMinima,
    escludi,
  };
}

/**
 * Simula il Passo 2: per ogni ricerca trova o sintetizza video pertinenti.
 */
export function mockAiFetchVideos(plan: SearchPlan, userPrompt: string): VideoItem[] {
  const lowerPrompt = userPrompt.toLowerCase();

  // Controlliamo se abbiamo video demo pertinenti nel catalogo statico
  const matched = DEMO_VIDEOS.filter((v) => {
    const isExcluded = plan.escludi.some((esc) => v.title.toLowerCase().includes(esc.toLowerCase()));
    if (isExcluded) return false;

    // Filtro durata se specificata
    if (plan.durata_minima_min > 0 && v.durationSec < plan.durata_minima_min * 60) {
      // Manteniamo comunque il clickbait solo se vogliamo mostrare che l'AI al passo 3 lo scarta,
      // oppure lo escludiamo qui
    }

    const matchesPrompt = v.tags.some((t) => lowerPrompt.includes(t.toLowerCase())) ||
      v.title.toLowerCase().includes(lowerPrompt) ||
      v.description.toLowerCase().includes(lowerPrompt);

    return matchesPrompt;
  });

  if (matched.length >= 2) {
    // Aggiungiamo anche il video clickbait per dimostrare che l'AI del Passo 3 lo penalizza/scarta
    const clickbait = DEMO_VIDEOS.find((v) => v.id.startsWith('CLICKBAIT'));
    if (clickbait && !matched.some((m) => m.id === clickbait.id)) {
      matched.push(clickbait);
    }
    return matched;
  }

  // Se la ricerca è su un tema non coperto direttamente dai video demo fissi,
  // generiamo 3 video realistici su misura con anteprime SVG dinamiche!
  const topic = userPrompt.trim().replace(/^cerca\s+/i, '');
  const customVideos: VideoItem[] = [
    {
      id: 'demo-custom-1',
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)}: Lezione Magistrale e Fondamenti Teorici`,
      channelTitle: 'Cattedra di Studi Avanzati',
      channelId: 'UC_cattedra_avanzata',
      category: 'Lezione Accademica',
      duration: '52:10',
      durationSec: 3130,
      viewCount: 16500,
      publishedAt: '2024-02-14',
      description: `Analisi sistematica e approfondimento concettuale su "${topic}". Trattazione per studenti e ricercatori con riferimenti bibliografici e discussione critica.`,
      tags: [topic.toLowerCase(), 'accademico', 'lezione'],
      thumbnailUrl: generateSvgThumbnail({
        title: `${topic}: Fondamenti Teorici`,
        category: 'Lezione Magistrale',
        channel: 'Studi Avanzati',
        duration: '52:10',
        colorScheme: 'indigo',
        pattern: 'nodes',
      }),
    } as any,
    {
      id: 'demo-custom-2',
      title: `Seminario Monografico: Nuove Prospettive su ${topic}`,
      channelTitle: 'Istituto Superiore di Ricerca',
      channelId: 'UC_istituto_ricerca',
      category: 'Seminario Critico',
      duration: '44:35',
      durationSec: 2675,
      viewCount: 9200,
      publishedAt: '2023-11-20',
      description: `Rassegna critica e discussione dei testi fondamentali relativi a ${topic}. Approccio comparativo senza semplificazioni divulgative.`,
      tags: [topic.toLowerCase(), 'seminario', 'ricerca'],
      thumbnailUrl: generateSvgThumbnail({
        title: `Seminario: ${topic}`,
        category: 'Seminario Critico',
        channel: 'Istituto di Ricerca',
        duration: '44:35',
        colorScheme: 'cyan',
        pattern: 'grid',
      }),
    } as any,
    {
      id: 'demo-custom-clickbait',
      title: `LA VERITÀ NASCOSTA su ${topic}! Non ci crederai mai (Video Esclusivo)`,
      channelTitle: 'Viral Clips 24',
      channelId: 'UC_viral_zone',
      category: 'Clickbait',
      duration: '06:45',
      durationSec: 405,
      viewCount: 420000,
      publishedAt: '2024-04-10',
      description: `Video acchiappaclic sensazionalistico con montaggio aggressivo e zero fonti affidabili su ${topic}.`,
      tags: [topic.toLowerCase(), 'clickbait'],
      thumbnailUrl: generateSvgThumbnail({
        title: `NON CI CREDERAI MAI! Svelato tutto su ${topic}`,
        category: 'Scartato / Clickbait',
        channel: 'Viral Clips 24',
        duration: '06:45',
        colorScheme: 'rose',
        pattern: 'waves',
      }),
    } as any,
  ];

  return customVideos;
}

/**
 * Simula il Passo 3 dell'AI: riceve i video e restituisce il JSON
 * [{"id": "...", "punteggio": 0-10, "motivo": "una frase"}].
 * Scarta o penalizza acchiappa-clic e premia video specialistici aderenti alla richiesta.
 */
export function mockAiEvaluateVideos(userPrompt: string, videos: VideoItem[]): VideoEvaluation[] {
  const lowerPrompt = userPrompt.toLowerCase();
  const isHighLevel = lowerPrompt.includes('serie') || lowerPrompt.includes('non divulgativ') || lowerPrompt.includes('katechon');

  return videos.map((v) => {
    const isClickbait = v.id.includes('CLICKBAIT') || v.id.includes('clickbait') || v.title.includes('ASSURDO') || v.title.includes('VERITÀ NASCOSTA') || v.durationSec < 600;

    if (isClickbait) {
      return {
        id: v.id,
        punteggio: 1.5,
        motivo: 'Scartato dall’AI: titolo sensazionalistico, durata breve e approccio clickbait privo di rigore.',
      };
    }

    if (v.title.toLowerCase().includes('katechon') || (v.description.toLowerCase().includes('katechon') && isHighLevel)) {
      return {
        id: v.id,
        punteggio: 9.6,
        motivo: 'Lezione accademica di massimo livello con analisi filologica primaria del concetto di Katechon.',
      };
    }

    if (v.title.toLowerCase().includes('vorlesung') || v.title.toLowerCase().includes('carl schmitt')) {
      return {
        id: v.id,
        punteggio: 9.1,
        motivo: 'Trattazione specialistica universitaria rigorosa in lingua originale, perfettamente aderente alla richiesta.',
      };
    }

    if (v.title.toLowerCase().includes('stato di eccezione') || v.title.toLowerCase().includes('agamben')) {
      return {
        id: v.id,
        punteggio: 8.7,
        motivo: 'Ottimo corso monografico che approfondisce la teologia politica e il decisionismo in prospettiva critica.',
      };
    }

    if (v.durationSec > 2400) {
      return {
        id: v.id,
        punteggio: 8.5,
        motivo: 'Lezione magistrale estesa con approfondimento teorico e assenza di scorciatoie divulgative.',
      };
    }

    return {
      id: v.id,
      punteggio: 7.4,
      motivo: 'Contenuto valido e coerente con la ricerca, buon livello informativo generale.',
    };
  });
}
