import { describe, it, expect } from 'vitest';
import { parseHash, buildHash, shareUrl } from './router';

describe('router (indirizzi per pagina)', () => {
  it('riconosce tutte le pagine', () => {
    expect(parseHash('')).toEqual({ page: 'home' });
    expect(parseHash('#/')).toEqual({ page: 'home' });
    expect(parseHash('#/video/abc123')).toEqual({ page: 'watch', id: 'abc123' });
    expect(parseHash('#/canale/UC123')).toEqual({ page: 'channel', id: 'UC123' });
    expect(parseHash('#/cronologia')).toEqual({ page: 'history' });
    expect(parseHash('#/dopo')).toEqual({ page: 'watchLater' });
    expect(parseHash('#/impostazioni')).toEqual({ page: 'settings' });
    expect(parseHash('#/sconosciuta')).toEqual({ page: 'home' });
  });

  it('legge e scrive la ricerca con caratteri speciali e AI', () => {
    const r = { page: 'search' as const, q: 'Schmitt & il «katechon»?', ai: 'claude' as const };
    const h = buildHash(r);
    expect(h.startsWith('#/cerca?q=')).toBe(true);
    expect(parseHash(h)).toEqual(r);
    expect(parseHash('#/cerca?q=ciao&ai=boh')).toEqual({ page: 'search', q: 'ciao' });
    expect(parseHash('#/cerca?q=')).toEqual({ page: 'home' });
  });

  it('andata e ritorno per ogni pagina', () => {
    for (const h of ['#/', '#/video/x_Y-1', '#/canale/UCabc', '#/cronologia', '#/dopo', '#/impostazioni']) {
      expect(buildHash(parseHash(h))).toBe(h);
    }
  });

  it('il link da condividere punta alla pagina del video dentro Tubo', () => {
    expect(shareUrl({ page: 'watch', id: 'abc' }, { origin: 'https://bifulcma.github.io', pathname: '/tubo/' }))
      .toBe('https://bifulcma.github.io/tubo/#/video/abc');
  });
});
