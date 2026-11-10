/* Boccone — il cast: tutti gli abitanti del gioco, con i dati di gioco e le indicazioni per chi li disegna.
   Le definizioni vere (src/js/20-specie, 25-eroi, 30-ambienti) ereditano da qui i campi che non dichiarano.
   Campi di gioco:
     taglia   1..5  grandezza (decide raggio e fascia di potenza)
     ambienti dove compare
     indole   cacciatore | timido | agguato | scattante | pattuglia | branco | pigro
     speciale inchiostro | scossa | veleno | corazza | luce (facoltativo)
     assetto  'libero' (ruota verso dove nuota) | 'dritto' (resta in piedi, si specchia soltanto)
   "aspetto" è l'indicazione per il disegno: non compare mai nel gioco. */
(() => {
'use strict';
const B = window.B;

const ambienti = [
  { id: 'laguna',      ordine: 1, nome: 'Laguna corallina',  mondo: { w: 2600, h: 2600 }, banchi: ['sardina', 'neon'],     pericoli: ['medusa', 'riccio'],             gigante: 'don_cernia',
    atmosfera: 'Acqua bassa e luminosa, turchese. Coralli a ventaglio e a cervello, spugne, anemoni, sabbia chiara, raggi di sole.' },
  { id: 'alghe',       ordine: 2, nome: 'Foresta di alghe',  mondo: { w: 2200, h: 3200 }, banchi: ['acciuga', 'neon'],     pericoli: ['medusa', 'riccio'],             gigante: 'piovra',
    atmosfera: 'Verde smeraldo. Altissime alghe kelp che ondeggiano dal fondo alla superficie, luce che filtra a lame, rocce muschiose.' },
  { id: 'relitto',     ordine: 3, nome: 'Il relitto',        mondo: { w: 3000, h: 2400 }, banchi: ['sardina', 'acciuga'],  pericoli: ['mina', 'medusa'],               gigante: 'kraken',
    atmosfera: 'Verde petrolio e ruggine. Un galeone spezzato sul fondo: fasciame, alberi, ancore, catene, casse e botti, oblò illuminati.' },
  { id: 'mare_aperto', ordine: 4, nome: 'Mare aperto',       mondo: { w: 3600, h: 2200 }, banchi: ['sardina', 'acciuga'],  pericoli: ['amo', 'medusa'],                gigante: 'marlin_imperatore',
    atmosfera: 'Blu profondo e vuoto. Superficie mossa in alto con il sole, scie di bollicine, sagome lontane, niente fondale vicino.' },
  { id: 'ghiacci',     ordine: 5, nome: 'Mari ghiacciati',   mondo: { w: 2800, h: 2600 }, banchi: ['krill', 'sardina'],    pericoli: ['stalattite', 'medusa_criniera'], gigante: 'orca',
    atmosfera: 'Azzurro pallido e bianco. Soffitto di banchisa con crepacci di luce, iceberg sommersi, cristalli, fondale di ciottoli scuri.' },
  { id: 'rovine',      ordine: 6, nome: 'Rovine sommerse',   mondo: { w: 3000, h: 2600 }, banchi: ['neon', 'sardina'],     pericoli: ['riccio', 'medusa'],             gigante: 'dunkleosteo',
    atmosfera: 'Turchese e oro antico. Colonne, archi, scalinate e statue coperte di coralli; mosaici, anfore, raggi di luce polverosa.' },
  { id: 'vulcano',     ordine: 7, nome: 'Camini vulcanici',  mondo: { w: 2600, h: 3000 }, banchi: ['krill', 'lucciola'],   pericoli: ['sfiatatoio', 'riccio'],         gigante: 'drago_di_lava',
    atmosfera: 'Nero basalto e bagliori arancio. Fumarole, crepe di lava incandescente, colonne di bolle calde, cenere che cade, vermi tubo.' },
  { id: 'abisso',      ordine: 8, nome: "L'abisso",          mondo: { w: 2800, h: 3400 }, banchi: ['lucciola', 'krill'],   pericoli: ['medusa_criniera', 'mina'],      gigante: 'lanterna',
    atmosfera: 'Buio quasi totale, blu notte e viola. Neve marina, creature e piante bioluminescenti, ossa di balena, guglie di roccia.' },
];

const P = (id, nome, plurale, taglia, ambienti, indole, aspetto, extra) => Object.assign({ id, nome, plurale, tipo: 'pesce', taglia, ambienti, indole, aspetto }, extra || {});
const specie = [
  // ---------------- Laguna corallina
  P('ghiozzo', 'Ghiozzo', 'Ghiozzi', 1, ['laguna', 'rovine'], 'cacciatore', 'Piccolo pesce di fondo color sabbia con puntini azzurri, occhioni in cima alla testa, labbra carnose, pinne tonde.'),
  P('pesce_farfalla', 'Pesce farfalla', 'Pesci farfalla', 1, ['laguna'], 'timido', 'Corpo a disco giallo e bianco, banda nera sull\'occhio, muso lungo a pinzetta, finto occhio vicino alla coda.'),
  P('pesce_pappagallo', 'Pesce pappagallo', 'Pesci pappagallo', 2, ['laguna'], 'cacciatore', 'Robusto, becco da pappagallo, squame grandi turchesi orlate di rosa, coda a mezzaluna.'),
  P('pesce_chirurgo', 'Pesce chirurgo', 'Pesci chirurgo', 2, ['laguna', 'rovine'], 'branco', 'Ovale blu intenso con disegno nero a tavolozza, coda gialla, piccola lama bianca alla base della coda.'),
  P('pesce_angelo', 'Pesce angelo', 'Pesci angelo', 3, ['laguna'], 'cacciatore', 'Alto e compresso, righe blu e gialle, pinne dorsale e anale che finiscono in lunghi filamenti, maschera scura sugli occhi.'),
  P('pesce_balestra', 'Pesce balestra', 'Pesci balestra', 3, ['laguna', 'rovine'], 'scattante', 'Corpo a rombo, bocca piccola con dentoni, disegni geometrici (fasce gialle, blu, nere), spina dorsale a grilletto.'),
  P('pesce_napoleone', 'Pesce Napoleone', 'Pesci Napoleone', 4, ['laguna'], 'pigro', 'Grosso, gobba sulla fronte, labbra enormi, verde-azzurro con disegno a labirinto, aria bonaria.'),
  P('murena', 'Murena', 'Murene', 4, ['laguna', 'relitto', 'rovine'], 'agguato', 'Corpo a nastro senza pinne laterali, bruno maculato di giallo, bocca sempre socchiusa con denti aguzzi, pinna continua sul dorso.'),
  P('barracuda', 'Barracuda', 'Barracuda', 5, ['laguna', 'alghe', 'mare_aperto'], 'scattante', 'Siluro argenteo lunghissimo, mandibola sporgente con zanne, barre scure sul dorso, sguardo fisso.'),
  P('squalo_pinna_nera', 'Squalo pinna nera', 'Squali pinna nera', 5, ['laguna'], 'pattuglia', 'Squalo di barriera snello, grigio-bronzo con ventre chiaro, punte delle pinne nere bordate di bianco.'),
  // ---------------- Foresta di alghe
  P('cavalluccio', 'Cavalluccio marino', 'Cavallucci marini', 1, ['alghe'], 'timido', 'In piedi: muso a tubo, corona ossea, pancia tonda, coda arrotolata, giallo-arancio con anelli; pinna dorsale che vibra.', { assetto: 'dritto' }),
  P('castagnola', 'Castagnola', 'Castagnole', 1, ['alghe', 'relitto'], 'branco', 'Piccola, blu notte con riflessi elettrici, coda a forbice, occhio grande.'),
  P('pesce_scatola', 'Pesce scatola', 'Pesci scatola', 2, ['alghe', 'vulcano'], 'pigro', 'Cubetto giallo a pois neri, boccuccia a bacio, pinnette minuscole, cornetti sopra gli occhi.', { speciale: 'corazza' }),
  P('triglia', 'Triglia', 'Triglie', 2, ['alghe', 'relitto'], 'cacciatore', 'Rosso-rosata con striscia gialla sul fianco, due barbigli sotto il mento, profilo ripido.'),
  P('scorfano', 'Scorfano', 'Scorfani', 3, ['alghe', 'relitto', 'vulcano'], 'agguato', 'Tozzo e bitorzoluto, rosso-bruno mimetico, lembi di pelle, spine dorsali, bocca larghissima all\'ingiù.', { speciale: 'veleno' }),
  P('seppia', 'Seppia', 'Seppie', 3, ['alghe', 'rovine'], 'timido', 'Mantello ovale zebrato con gonna di pinna ondulante tutt\'attorno, pupilla a W, otto braccia corte e due tentacoli.', { speciale: 'inchiostro' }),
  P('razza', 'Razza', 'Razze', 4, ['alghe'], 'pigro', 'Vista di tre quarti dall\'alto: disco a rombo che batte le ali, dorso sabbia a occhielli azzurri, coda a frusta.'),
  P('pesce_lupo', 'Pesce lupo', 'Pesci lupo', 4, ['alghe', 'ghiacci'], 'cacciatore', 'Lungo e grigio-azzurro a bande scure, testone massiccio, denti storti che sporgono, pinna dorsale continua.'),
  P('squalo_volpe', 'Squalo volpe', 'Squali volpe', 5, ['alghe', 'ghiacci'], 'scattante', 'Squalo dagli occhi grandi con il lobo superiore della coda lungo quanto il corpo, a falce; blu-violaceo, ventre bianco.'),
  // ---------------- Il relitto
  P('gamberetto', 'Gamberetto', 'Gamberetti', 1, ['relitto', 'vulcano'], 'timido', 'Trasparente rosato a bande rosse, antenne lunghissime bianche, zampette che remano, coda a ventaglio.'),
  P('granchio_nuotatore', 'Granchio nuotatore', 'Granchi nuotatori', 2, ['relitto'], 'cacciatore', 'Carapace largo blu-viola con spine ai lati, chele alzate, ultime zampe a paletta che remano, occhi su peduncoli.', { assetto: 'dritto', speciale: 'corazza' }),
  P('pesce_leone', 'Pesce leone', 'Pesci leone', 3, ['relitto', 'vulcano'], 'pigro', 'Righe rosse e bianche, pinne pettorali a ventaglio piumato, lunghi aculei dorsali separati, tentacoli sopra gli occhi.', { speciale: 'veleno' }),
  P('grongo', 'Grongo', 'Gronghi', 4, ['relitto', 'vulcano'], 'agguato', 'Grosso nastro grigio-azzurro con ventre chiaro, occhi grandi, labbra spesse, pinne pettorali piccole.'),
  P('squalo_toro', 'Squalo toro', 'Squali toro', 5, ['relitto', 'vulcano'], 'pattuglia', 'Massiccio bruno-grigio a macchie rugginose, muso appuntito, denti lunghi e disordinati sempre in vista.'),
  P('pesce_sega', 'Pesce sega', 'Pesci sega', 5, ['relitto', 'rovine'], 'scattante', 'Corpo appiattito da squalo, lungo rostro piatto con denti ai lati, color oliva-sabbia.'),
  // ---------------- Mare aperto
  P('sgombro', 'Sgombro', 'Sgombri', 1, ['mare_aperto'], 'branco', 'Affusolato, dorso verde-blu a onde scure, ventre madreperla, pinnette verso la coda.'),
  P('aguglia', 'Aguglia', 'Aguglie', 1, ['mare_aperto'], 'scattante', 'Sottilissima e lunga, becco ad ago, verde-argento con riflessi, pinne tutte arretrate.'),
  P('pesce_volante', 'Pesce volante', 'Pesci volanti', 2, ['mare_aperto'], 'scattante', 'Blu e argento con pinne pettorali enormi come ali trasparenti venate, coda col lobo inferiore lungo.'),
  P('lampuga', 'Lampuga', 'Lampughe', 2, ['mare_aperto'], 'cacciatore', 'Fronte alta e squadrata, pinna dorsale lunga dalla testa alla coda, oro-verde con puntini blu.'),
  P('tonno', 'Tonno', 'Tonni', 3, ['mare_aperto'], 'branco', 'Siluro potente blu scuro con ventre argento, pinnette gialle, coda a mezzaluna rigida.'),
  P('pesce_spada', 'Pesce spada', 'Pesci spada', 4, ['mare_aperto'], 'scattante', 'Spada lunga e piatta, pinna dorsale alta a falce, blu notte sopra e argento sotto, occhio grande.'),
  P('pesce_luna', 'Pesce luna', 'Pesci luna', 4, ['mare_aperto'], 'timido', 'Enorme disco grigio-argento senza coda, due pinne alte sopra e sotto, boccuccia tonda stupita, pelle ruvida.'),
  P('squalo_martello', 'Squalo martello', 'Squali martello', 5, ['mare_aperto'], 'pattuglia', 'Testa a martello larga con gli occhi alle estremità, grigio-oliva, pinna dorsale alta.'),
  P('manta', 'Manta', 'Mante', 5, ['mare_aperto'], 'timido', 'Vista di tre quarti: grandi ali nere sopra e bianche sotto che battono lente, due lobi ai lati della bocca, coda sottile.'),
  // ---------------- Mari ghiacciati
  P('merluzzetto', 'Merluzzetto polare', 'Merluzzetti polari', 1, ['ghiacci'], 'branco', 'Snello, bruno-argento con ventre chiaro, barbiglio sul mento, tre pinnette dorsali.'),
  P('pesce_ghiaccio', 'Pesce ghiaccio', 'Pesci ghiaccio', 1, ['ghiacci'], 'timido', 'Quasi trasparente, bianco-azzurro: si vedono lisca e cuore; muso da coccodrillo, pinne ampie.'),
  P('salmone', 'Salmone', 'Salmoni', 2, ['ghiacci'], 'cacciatore', 'Argento con fianco rosa, dorso a puntini neri, mascella a uncino, pinnetta adiposa.'),
  P('lompo', 'Lompo', 'Lompi', 2, ['ghiacci'], 'pigro', 'Palla bitorzoluta grigio-azzurra con file di tubercoli, pinnette piccole, faccia buffa, ventosa sotto.'),
  P('halibut', 'Halibut', 'Halibut', 3, ['ghiacci'], 'agguato', 'Pesce piatto visto di tre quarti: tutti e due gli occhi sullo stesso lato, oliva marmorizzato, bocca storta, nuota a onde.'),
  P('granchio_reale', 'Granchio reale', 'Granchi reali', 3, ['ghiacci'], 'cacciatore', 'Carapace a cuore rosso mattone pieno di spine, zampe lunghe spinose, chele disuguali.', { assetto: 'dritto', speciale: 'corazza' }),
  P('narvalo', 'Narvalo', 'Narvali', 4, ['ghiacci'], 'scattante', 'Cetaceo grigio chiaro maculato, testa tonda, lunga zanna a spirale, coda orizzontale.'),
  P('squalo_groenlandia', 'Squalo della Groenlandia', 'Squali della Groenlandia', 5, ['ghiacci'], 'pigro', 'Enorme, lento, grigio pietra chiazzato, muso tondo, occhi piccoli e velati, pinne piccole.'),
  // ---------------- Rovine sommerse
  P('pesce_vetro', 'Pesce vetro', 'Pesci vetro', 1, ['rovine'], 'branco', 'Corpo trasparente con lisca e organi in vista, orlo dorato, occhio grande.'),
  P('nautilus', 'Nautilus', 'Nautilus', 2, ['rovine'], 'timido', 'Conchiglia a spirale bianca tigrata di rosso-bruno, cappuccio, ciuffo di tentacoli sottili, occhio a foro.', { assetto: 'dritto', speciale: 'corazza' }),
  P('pesce_pipistrello', 'Pesce pipistrello', 'Pesci pipistrello', 3, ['rovine'], 'pigro', 'Triangolo altissimo argento a bande scure verticali, pinne lunghissime sopra e sotto, boccuccia.'),
  P('celacanto', 'Celacanto', 'Celacanti', 4, ['rovine'], 'pigro', 'Fossile vivente: blu acciaio a chiazze bianche, squame da corazza, pinne carnose a lobo, coda in tre parti.', { speciale: 'corazza' }),
  P('squalo_tigre', 'Squalo tigre', 'Squali tigre', 5, ['rovine', 'vulcano'], 'pattuglia', 'Muso largo e squadrato, strisce verticali scure sul dorso grigio-verde, coda lunga.'),
  // ---------------- Camini vulcanici
  P('bavosa', 'Bavosa', 'Bavose', 1, ['vulcano'], 'cacciatore', 'Allungata, occhi sporgenti buffi, ciuffetti sopra gli occhi, arancio a macchie scure, labbrone.'),
  P('granchio_yeti', 'Granchio yeti', 'Granchi yeti', 2, ['vulcano'], 'timido', 'Bianco latte, chele lunghe coperte di peluria setosa, senza occhi evidenti.', { assetto: 'dritto' }),
  P('pesce_rospo', 'Pesce rospo', 'Pesci rospo', 3, ['vulcano'], 'agguato', 'Testa larga e schiacciata, bocca enorme, pelle verrucosa arancio e nera, barbigli attorno alla bocca.'),
  P('murena_drago', 'Murena drago', 'Murene drago', 4, ['vulcano'], 'agguato', 'Nastro arancio, nero e bianco a macchie, narici a cornetto, mascelle ricurve che non si chiudono, denti di vetro.'),
  P('torpedine', 'Torpedine', 'Torpedini', 4, ['vulcano'], 'pigro', 'Vista di tre quarti: disco tondo marmorizzato bruno con occhielli, coda corta; scintille elettriche.', { speciale: 'scossa' }),
  // ---------------- L'abisso
  P('pesce_accetta', 'Pesce accetta', 'Pesci accetta', 1, ['abisso'], 'branco', 'Argento a specchio a forma di accetta, occhi tubolari verso l\'alto, fila di lucine sul ventre.', { speciale: 'luce' }),
  P('pesce_lanterna', 'Pesce lanterna', 'Pesci lanterna', 1, ['abisso'], 'branco', 'Piccolo e scuro, occhio enorme, file di puntini luminosi azzurri lungo i fianchi.', { speciale: 'luce' }),
  P('calamaro_vampiro', 'Calamaro vampiro', 'Calamari vampiro', 2, ['abisso'], 'timido', 'Rosso cupo, braccia unite da una membrana a mantello con punte chiare, occhi azzurri grandi, due pinne a orecchio.', { speciale: 'luce' }),
  P('polpo_dumbo', 'Polpo Dumbo', 'Polpi Dumbo', 2, ['abisso'], 'timido', 'Campana gelatinosa rosa-arancio, due pinne a orecchie d\'elefante, occhioni, braccia corte palmate.', { assetto: 'dritto' }),
  P('pesce_vipera', 'Pesce vipera', 'Pesci vipera', 3, ['abisso'], 'cacciatore', 'Sottile e nero-blu, zanne ad ago che escono dalla bocca, raggio dorsale lungo con lucina, file di fotofori.', { speciale: 'luce' }),
  P('rana_pescatrice', 'Rana pescatrice', 'Rane pescatrici', 3, ['abisso'], 'agguato', 'Palla scura con bocca piena di denti lunghi, esca luminosa su un filamento, occhietti, pelle rugosa.', { speciale: 'luce' }),
  P('chimera', 'Chimera', 'Chimere', 4, ['abisso'], 'pattuglia', 'Squalo fantasma: occhi enormi verdi, muso da coniglio, pelle liscia argento-azzurra con linee, pinne ad ala, coda a frusta.'),
  P('anguilla_pellicano', 'Anguilla pellicano', 'Anguille pellicano', 4, ['abisso'], 'agguato', 'Nera, bocca a sacco enorme, occhi minuscoli, corpo che si assottiglia in una frusta con punta luminosa rosa.', { speciale: 'luce' }),
  P('squalo_goblin', 'Squalo goblin', 'Squali goblin', 5, ['abisso'], 'scattante', 'Rosa pallido, muso lungo e piatto a lama, mascelle che scattano in avanti con denti ad ago, corpo floscio.'),
  P('pesce_remo', 'Pesce remo', 'Pesci remo', 5, ['abisso'], 'pigro', 'Nastro lunghissimo argento a macchie scure, cresta rossa sulla testa e pinna dorsale rossa continua, pinne a remo.'),
];

const G = (id, nome, ambiente, attacchi, aspetto) => ({ id, nome, tipo: 'gigante', ambienti: [ambiente], attacchi, aspetto });
const giganti = [
  G('don_cernia', 'Don Cernia', 'laguna', ['risucchio', 'carica'], 'Cernia colossale bruno-oliva marmorizzata, labbroni enormi, guance cadenti, sopracciglia folte, coroncina; quando aspira spalanca una bocca-caverna.'),
  G('piovra', 'La Piovra', 'alghe', ['inchiostro', 'tentacoli', 'carica'], 'Polpo gigante rosso corallo con ventose chiare, otto braccia che si arricciano, testa a sacco, occhi a fessura, corona.'),
  G('kraken', 'Il Kraken', 'relitto', ['tentacoli', 'inchiostro', 'risucchio'], 'Calamaro gigante: mantello a siluro rosso scuro con pinne a rombo, occhi enormi gialli, otto braccia e due tentacoli lunghi a clava, becco.'),
  G('marlin_imperatore', 'Il Marlin Imperatore', 'mare_aperto', ['carica', 'carica', 'raffica'], 'Marlin immenso blu cobalto a strisce azzurre, rostro lungo come una lancia, vela dorsale alta, cicatrici, corona.'),
  G('orca', 'La Regina Orca', 'ghiacci', ['carica', 'onda', 'evoca'], 'Orca bianca e nera lucida, macchia bianca sull\'occhio, pinna dorsale altissima, sorriso di denti conici, corona di ghiaccio.'),
  G('dunkleosteo', 'Il Dunkleosteo', 'rovine', ['morso', 'carica', 'onda'], 'Pesce preistorico corazzato: testa e torace di piastre ossee color bronzo antico, lame al posto dei denti, occhio cerchiato, coda da squalo.'),
  G('drago_di_lava', 'Il Drago di lava', 'vulcano', ['sparo', 'carica', 'scia'], 'Serpente marino nero basalto con crepe incandescenti, creste di fuoco lungo il dorso, corna, baffi, occhi di brace.'),
  G('lanterna', 'La Grande Lanterna', 'abisso', ['buio', 'risucchio', 'carica'], 'Rana pescatrice colossale viola-nero, bocca spropositata di denti di vetro, esca luminosa che pende davanti, occhietti crudeli, corona.'),
];

const E = (id, nome, costo, vantaggio, effetti, aspetto) => ({ id, nome, costo, vantaggio, effetti, aspetto });
const eroi = [
  E('pallino', 'Pallino', 0, 'Equilibrato: il compagno giusto per cominciare.', {}, 'Pesce palla turchese con pancia crema, spinette, pinne gialle, occhioni. Da piccolo è tondo e tenero; crescendo mette spine più lunghe e un\'aria da duro.'),
  E('saetta', 'Saetta', 250, 'Nuota più veloce e lo scatto dura di più.', { velocita: 1.12, durataScatto: 1.5 }, 'Pesce volante azzurro e argento con grandi pinne ad ala; crescendo le ali diventano più ampie e affilate.'),
  E('arlecchino', 'Arlecchino', 400, 'Fortunato: più bolle e più perle.', { bolle: 1.3, perle: 1.25 }, 'Pesce mandarino: disegno psichedelico arancio, blu e verde, pinne a ventaglio, occhi rossi sporgenti.'),
  E('bolla', 'Bolla', 600, 'Dopo un colpo sparisce in una nuvola di inchiostro: resta al sicuro più a lungo.', { invulnerabile: 1.5, risucchio: 1.15 }, 'Polpetto viola-rosa con testa tonda, occhi dolci, braccia corte arricciate che seguono dietro; crescendo si allungano.'),
  E('scoglio', 'Scoglio', 800, 'Corazzato: parte con un cuore in più.', { cuori: 1, velocita: 0.95 }, 'Tartarughina marina verde con carapace a scudi, pinne a paletta, becco sorridente; crescendo il guscio si fa possente.'),
  E('zanna', 'Zanna', 1200, 'Morso potente: mangia anche pesci un po\' più grossi di lui.', { morso: 1.15 }, 'Squaletto grigio-azzurro con dentini, pinna dorsale, guance tonde; crescendo diventa uno squalo muscoloso con cicatrice.'),
];

const banchi = [
  { id: 'sardina', nome: 'Sardine', tipo: 'banco', aspetto: 'Argento-azzurra con fila di puntini scuri.' },
  { id: 'acciuga', nome: 'Acciughe', tipo: 'banco', aspetto: 'Sottile, dorso verde-blu, ventre argento, bocca grande.' },
  { id: 'neon', nome: 'Pesciolini neon', tipo: 'banco', aspetto: 'Minuscolo con striscia azzurra elettrica e coda rossa.' },
  { id: 'krill', nome: 'Krill', tipo: 'banco', aspetto: 'Gamberetto trasparente rosato con occhi neri.' },
  { id: 'lucciola', nome: 'Lucciole di mare', tipo: 'banco', aspetto: 'Calamaretto scuro punteggiato di lucine azzurre.' },
  { id: 'dorato', nome: 'Pesciolini dorati', tipo: 'banco', aspetto: 'Pesciolino d\'oro luccicante: raro, vale molto di più.' },
];

const pericoli = [
  { id: 'medusa', nome: 'Medusa', tipo: 'pericolo', comportamento: 'deriva', aspetto: 'Ombrello traslucido rosa-lilla che pulsa, tentacoli sottili e braccia orali arricciate.' },
  { id: 'medusa_criniera', nome: 'Medusa criniera di leone', tipo: 'pericolo', comportamento: 'deriva', aspetto: 'Grande ombrello arancio-rosso a lobi, criniera fittissima di tentacoli, bagliore tenue.' },
  { id: 'riccio', nome: 'Riccio di mare', tipo: 'pericolo', comportamento: 'fermo', aspetto: 'Palla nero-viola di aculei lunghi con punta chiara.' },
  { id: 'mina', nome: 'Vecchia mina', tipo: 'pericolo', comportamento: 'mina', aspetto: 'Sfera di ferro arrugginita con corni, incrostata, catena; lampeggia rossa prima di scoppiare.' },
  { id: 'amo', nome: 'Amo', tipo: 'pericolo', comportamento: 'pendolo', aspetto: 'Amo lucido con esca (vermetto) appeso a una lenza che sale fuori schermo.' },
  { id: 'sfiatatoio', nome: 'Sfiatatoio', tipo: 'pericolo', comportamento: 'eruzione', aspetto: 'Camino di roccia: a riposo fuma, quando è attivo spara una colonna di bolle roventi e lapilli.' },
  { id: 'stalattite', nome: 'Stalattite di ghiaccio', tipo: 'pericolo', comportamento: 'caduta', aspetto: 'Punta di ghiaccio azzurro sfaccettata; trema prima di staccarsi.' },
];

B.cast = {
  ambienti, specie: [...specie, ...giganti, ...banchi, ...pericoli], eroi,
  /* Raggi (in unità di mondo) per taglia 1..5 e raggio dei giganti. */
  raggi: [24, 36, 50, 66, 84], raggioGigante: 150,
  livelliPerAmbiente: 5,
  /* Gli ambienti giocabili, in ordine: quelli non elencati compaiono sulla mappa come "in arrivo".
     Si allunga man mano che i modelli veri di un ambiente sono pronti. */
  aperti: ['laguna'],
};
})();
