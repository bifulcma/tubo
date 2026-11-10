import { ChannelDetails, ChiParla, SearchPlan, VideoEvaluation, VideoItem } from '../types';
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
  // Tubo è pensato per video lunghi: 20 minuti di base, salvo richiesta esplicita
  // di video brevi (→ 0) o di una durata precisa (→ quei minuti).
  let durataMinima = 20;
  const minutiChiesti = lower.match(/(\d+)\s*(?:min|minuti)\b/);
  if (minutiChiesti) {
    durataMinima = Number(minutiChiesti[1]);
  } else if (/\b(brev[ie]|cort[io]|short)\b|pochi minuti/.test(lower)) {
    durataMinima = 0;
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
  return valutaDemo(userPrompt, videos).map((ev) => {
    const p = DEMO_PERSONE[videos.find((v) => v.id === ev.id)?.channelId ?? ''];
    return { ...ev, autore: p?.autore ?? 'non indicato', autorita: p?.livello ?? 'sconosciuta' };
  });
}

function valutaDemo(userPrompt: string, videos: VideoItem[]): VideoEvaluation[] {
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


// --- «Chi parla e con quale autorità»: dati INVENTATI per la dimostrazione ---
interface PersonaDemo {
  tipo: string;
  autore: string;
  ruolo: string;
  livello: 'alta' | 'media' | 'bassa' | 'sconosciuta';
  legittimazione: string;
  orientamento: string;
  iscritti?: number;
  video: number;
  dal: string;
  paese: string;
}

const DEMO_PERSONE: Record<string, PersonaDemo> = {
  UC_arch_filo: {
    tipo: "Canale di un'associazione culturale (inventata) che pubblica registrazioni di seminari universitari di filosofia.",
    autore: 'Prof. Livio Marchetti (relatore inventato)',
    ruolo: 'Docente di filosofia politica in un ateneo immaginario; autore di un saggio fittizio sul katechon.',
    livello: 'alta',
    legittimazione: "Il relatore si occupa da anni di teologia politica e di Carl Schmitt: è competente sull'argomento. Dato dimostrativo, non verificato.",
    orientamento: 'Approccio accademico; nessuna appartenenza dichiarata.',
    iscritti: 18400, video: 212, dal: '2014-03-02', paese: 'IT',
  },
  UC_inst_rechts: {
    tipo: 'Canale di un istituto universitario (inventato) di filosofia e storia del diritto.',
    autore: 'Dr. Anna Weber (relatrice inventata)',
    ruolo: 'Ricercatrice di storia del diritto pubblico (affiliazione immaginaria).',
    livello: 'alta',
    legittimazione: 'Specialista di diritto pubblico tedesco del Novecento. Dato dimostrativo.',
    orientamento: 'non risulta',
    iscritti: 6200, video: 95, dal: '2016-10-12', paese: 'DE',
  },
  UC_cattedra_pol: {
    tipo: 'Canale di una cattedra universitaria (inventata) di teoria politica.',
    autore: 'non indicato',
    ruolo: 'non risulta',
    livello: 'media',
    legittimazione: 'Contesto universitario, ma il relatore non è indicato. Dato dimostrativo.',
    orientamento: 'non risulta',
    iscritti: 3100, video: 48, dal: '2019-01-20', paese: 'IT',
  },
  UC_clickbait_zone: {
    tipo: 'Canale di divulgazione sensazionalistica (inventato) che rimonta spezzoni di altri video.',
    autore: 'non indicato',
    ruolo: 'non risulta',
    livello: 'bassa',
    legittimazione: 'Nessuna competenza dichiarata; titoli acchiappa-clic e nessuna fonte. Dato dimostrativo.',
    orientamento: 'Fini commerciali (visualizzazioni).',
    video: 1840, dal: '2021-06-01', paese: 'IT',
  },
};

const PERSONA_GENERICA: PersonaDemo = {
  tipo: 'Canale dimostrativo inventato.',
  autore: 'non indicato',
  ruolo: 'non risulta',
  livello: 'sconosciuta',
  legittimazione: 'Nella dimostrazione non ci sono dati su questo relatore.',
  orientamento: 'non risulta',
  iscritti: 2500, video: 60, dal: '2018-05-05', paese: 'IT',
};

export function mockChannelDetails(channelId: string, title: string): ChannelDetails {
  const p = DEMO_PERSONE[channelId] ?? PERSONA_GENERICA;
  return {
    id: channelId,
    title,
    description: `${p.tipo} (Dati di dimostrazione: canale e numeri sono inventati.)`,
    country: p.paese,
    publishedAt: p.dal,
    subscriberCount: p.iscritti,
    videoCount: p.video,
    viewCount: (p.iscritti ?? 50000) * 37,
    demo: true,
  };
}

export function mockChiParla(video: VideoItem): ChiParla {
  const p = DEMO_PERSONE[video.channelId] ?? PERSONA_GENERICA;
  return {
    canale: `${p.tipo} Esiste dal ${p.dal.slice(0, 4)}, ${p.iscritti ? p.iscritti.toLocaleString('it-IT') + ' iscritti' : 'iscritti nascosti'}, ${p.video} video.`,
    autore: p.autore,
    ruolo_affiliazione: p.ruolo,
    legittimazione: p.legittimazione,
    livello: p.livello,
    orientamento: p.orientamento,
    fonti: [],
    certezza: 'dedotto',
    webUsato: false,
    at: Date.now(),
    demo: true,
  };
}
