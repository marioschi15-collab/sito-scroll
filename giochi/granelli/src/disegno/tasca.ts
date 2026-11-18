import { C } from '../motore/cose.js';

/**
 * Le figure delle cose da tasca di prima delle schede (l'utensile, il pane, la moneta…), due quadretti per cella come
 * ogni figura del mondo. Stanno in un file senza niente che serva alla pagina perché anche il registro le legge: un
 * oggetto appoggiato a terra occupa le celle che dice la sua figura.
 */
export const DA_TASCA: Readonly<Record<number, readonly string[]>> = {
  [C.UTENSILE]: ['......sS.', '.....sSSS', '....bsSs.', '...bB.s..', '..bB.....', '.bB......', 'bB.......'],
  [C.LANCIA]: ['.......sS', '......sSs', '.....bs..', '....bB...', '...bB....', '..bB.....', '.bB......', 'bB.......'],
  [C.RUOTA]: ['..sSSSs..', '.sS.s.Ss.', 'sS..s..Ss', 'sssssssss', 'sS..s..Ss', '.sS.s.Ss.', '..sSSSs..'],
  [C.VASO]: ['..rRRRr..', '...rRr...', '..rRRRr..', '.rRORRRr.', '.rRORRRr.', '.rRRRRRr.', '..rRRRr..'],
  [C.PANE]: ['..tTTTt..', '.tTUTUTt.', 'tTTTTTTTt', 'tTTTTTTTt', '.ttttttt.'],
  [C.BRONZO]: ['...zzzz..', '..zzZzzz.', '.zzzzzZzz', 'zzZzzzzzz', 'ZZZZZZZZZ'],
  [C.SPADA]: ['.......xe', '......xe.', '.....xe..', '....xe...', '.z.xe....', '..ze.....', '.bzz.....', 'b........'],
  [C.STRADA]: ['.........', 'sSsSSsSsS', 'SsSSsSSsS', 'TtTTtTtTT'],
  [C.SCRITTURA]: ['.RRRRRRR.', '.Rn.nn.R.', '.R.nn.nR.', '.Rnn.n.R.', '.R.n.nnR.', '.RRRRRRR.'],
  [C.MONETA]: ['..zzzz...', '.zzyyzz..', 'zzyzzyzz.', 'zzyzzyzz.', '.zzyyzz..', '..zzzz...'],
  [C.CITTA]: ['....S.......rR...', '...SSS.....rRRr..', '..rSkS.rR..wwww..', '.rRSSSrRRr.wFww..', '.wwSSSwwww.wwww..', 'SSSSSSSSSSSSSSSSS', 'sSsSSsSnnSsSSsSSs'],
  [C.LIBRO]: ['.rrrrrrr.', '.rWWWWWr.', '.rWnnnWr.', '.rWWWWWr.', '.rWnnWWr.', '.rWWWWWr.', '.rrrrrrr.'],
  [C.FERRO]: ['...eeee..', '..eexeee.', '.eeeeexee', 'eexeeeeee', 'ddddddddd'],
  [C.ARATRO]: ['bB.......', '.bB......', '..bBbBbB.', '...bB..e.', '..bB..ee.', '.....eex.'],
};
