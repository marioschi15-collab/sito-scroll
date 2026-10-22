import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { MemoryService, RisultatoMemoria } from '../contratti.js';
import { testiAgent } from './testi.js';

export const NOME_SERVER_SPALLA = 'spalla';
export const NOME_STRUMENTO_MEMORIA_CERCA = `mcp__${NOME_SERVER_SPALLA}__memoria_cerca`;

const schemaMemoriaCerca = {
  query: z.string().min(1).describe('Parole da cercare (nomi, luoghi, cifre, argomenti).'),
  k: z.number().int().min(1).max(20).optional().describe('Quanti risultati (predefinito 6).'),
};

export function formattaRisultati(risultati: RisultatoMemoria[]): string {
  if (risultati.length === 0) return testiAgent.memoriaCerca.nessunRisultato;
  return risultati
    .map((r, i) => `${i + 1}. ${r.file} — ${r.titolo} (modificato ${r.modificato.slice(0, 10)})\n${r.estratto.trim()}`)
    .join('\n\n');
}

/** Lo strumento `memoria_cerca` (docs/03 §7), separato dal server per poterlo provare da solo. */
export function creaStrumentoMemoriaCerca(memoria: MemoryService) {
  return tool(
    'memoria_cerca',
    testiAgent.memoriaCerca.descrizione,
    schemaMemoriaCerca,
    async ({ query, k }) => {
      const risultati = await memoria.cerca(query, k ?? 6);
      return { content: [{ type: 'text', text: formattaRisultati(risultati) }] };
    },
    { annotations: { readOnlyHint: true, openWorldHint: false } },
  );
}

/** Server in-process "spalla": solo un host SDK può registrarlo (docs/02 §3.2). */
export function creaServerSpalla(memoria: MemoryService): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({ name: NOME_SERVER_SPALLA, version: '0.0.1', tools: [creaStrumentoMemoriaCerca(memoria)] });
}
