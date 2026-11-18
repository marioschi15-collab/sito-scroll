import { describe, expect, it, vi } from 'vitest';

/**
 * Dalla grande infornata (P8) un vicolo cieco è un errore per tutte le voci, anche per quelle di prima (prima era
 * solo un avviso). Qui il Libro torna com'era prima del P8, con le sole schede del paese e della campagna: le voci di
 * prima che non servono a farne altre devono saltar fuori come errori.
 */
vi.mock('../src/contenuti/indice.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/indice.js')>();
  return { FILE: { paese: vero.FILE.paese, campagna: vero.FILE.campagna } };
});

const { controlla } = await import('../src/contenuti/controllo.js');
const R = await import('../src/contenuti/registro.js');

describe('i vicoli ciechi delle voci di prima', () => {
  it('sono errori, non più avvisi', () => {
    const r = controlla();
    const ciechi = r.errori.filter((e) => /entra (in nessuna|in una sola) unione come ingrediente/.test(e));
    // Il Lago, la Foresta, il Porto… prima della grande infornata non servivano a niente.
    const diPrima = R.voci().filter((v) => !R.eNuova(v.id) && ciechi.some((e) => e.startsWith(`«${v.nome}»`)));
    expect(diPrima.length).toBeGreaterThan(0);
    expect(Object.keys(r)).not.toContain('avvisi');
  });
});
