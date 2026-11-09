# M&M Company

Un'azienda fatta di esperti artificiali. Tu sei il Titolare e parli solo con il CEO; il CEO dirige tutti gli altri.

## Come si usa

1. Apri Claude Code (l'app sul computer) e scegli come cartella di lavoro **questa cartella**, `mm-company`.
2. Scrivi al CEO quello che vuoi, con parole tue. Per esempio:
   - "Trovami tre modi per guadagnare vendendo siti alle attività della mia zona, con i numeri."
   - "Studia questa idea e dimmi se regge: …"
   - "Novità?" (ti dice a che punto sono i progetti aperti)
3. Il CEO sceglie gli esperti, li fa lavorare, fa controllare tutto dal critico e ti riporta: cosa ha trovato, cosa
   consiglia, i numeri, i rischi e le decisioni che spettano a te.

La prima volta Claude Code chiede se ti fidi della cartella: rispondi di sì, così il CEO può leggere i suoi file e
cercare in rete senza chiederti il permesso ogni volta.

## Cosa c'è dentro

- `CLAUDE.md` — chi è il CEO e come lavora.
- `azienda/REGOLE.md` — le regole che valgono per tutti: niente esce senza il tuo sì, soldi puliti, numeri veri.
- `azienda/memoria/` — il diario dell'azienda e l'elenco delle idee, così il CEO si ricorda tutto la volta dopo.
- `.claude/agents/` — la squadra fissa: selezionatore, critico, ricercatore di mercato, stratega d'affari, analista
  dei conti, programmatore, creatore di siti, copywriter, cercatore di clienti, marketing.
- `catalogo/` — 283 esperti a chiamata di ogni settore, presi da
  [agency-agents](https://github.com/msitarzewski/agency-agents) (licenza MIT). Il selezionatore li pesca quando la
  squadra fissa non basta.
- `progetti/` — una cartella per ogni progetto, con ricerche, piani, testi, siti e programmi.

## Cose da sapere

- **I bot preparano, tu decidi.** Non mandano messaggi, non pubblicano, non spendono: ti portano tutto pronto.
- **Ogni esperto al lavoro consuma il tuo abbonamento Claude.** Per questo il CEO ne chiama pochi per volta.
- **Manca un esperto?** Dillo al CEO ("ci serve uno che si occupa di …"): lo crea lui e lo aggiunge alla squadra.
- **Telegram** non è ancora collegato: è il prossimo passo.

## Per chi mantiene il progetto

Il catalogo si aggiorna con `node strumenti/aggiorna-catalogo.mjs <cartella di agency-agents>`, che ricopia gli
esperti e riscrive gli indici.
