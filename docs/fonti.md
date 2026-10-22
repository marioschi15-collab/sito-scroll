# Fonti

> Tutte le fonti usate nei documenti, raggruppate per argomento, con una nota di una riga. Data della ricerca: 21-22 ottobre 2026. **Confidenza**: *alta* = pagina letta direttamente; *media* = estratta da riassunti/snippet della pagina ufficiale o da mirror ufficiali; *bassa* = fonte secondaria o non verificata. Dove la ricerca e il testo legale verificato erano in disaccordo, ha prevalso il testo legale; dove la ricerca e la memoria degli autori erano in disaccordo, ha prevalso la ricerca.

---

## 1. Anthropic: termini, autenticazione, prezzi

| Fonte | Nota | Conf. |
|---|---|---|
| https://code.claude.com/docs/en/legal-and-compliance.md | Pagina legale di Claude Code: condizioni per eseguire Claude Code nei propri prodotti (binario non modificato, nessun metodo di accesso rimosso, nessuna rivendita), divieto di offrire il login claude.ai e di intermediare credenziali, carve-out per l'utente finale che accede al binario non modificato, branding, "may enforce without prior notice" | alta (verificata 22/10) |
| https://code.claude.com/docs/en/agent-sdk/overview.md | Panoramica Agent SDK: "Unless previously approved..."; branding "{YourAgentName} Powered by Claude"; Termini commerciali anche per prodotti venduti ai propri clienti; Managed Agents | alta (verificata 22/10) |
| https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan | Articolo di supporto: pausa del 15 giugno 2026; aggiornamento 7 ottobre 2026 ("third-party apps with your subscription limits"); crediti Max/Team | alta (verificata 22/10) |
| https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans | Crediti API mensili: cosa coprono (Agent SDK, `claude -p`, API) e cosa no; scadenza mensile | alta |
| https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers | Importi ($100/$200 Max; Team), idoneità dopo 7 giorni, un'organizzazione Console per titolare, nessun rollover; Pro escluso | alta |
| https://www.anthropic.com/legal/credit-terms | I crediti sono usabili solo dal titolare e non trasferibili né vendibili | alta |
| https://www.anthropic.com/legal/consumer-terms | Termini consumatore: divieto di accesso automatizzato salvo chiave API o permesso esplicito; divieto di condividere credenziali e di rivendere | alta |
| https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | Limiti Pro/Max: finestra di 5 ore e limite settimanale condivisi con le app Claude; crediti Max non usabili in Claude Code | alta |
| https://code.claude.com/docs/en/authentication | Precedenza delle credenziali; `claude setup-token`; dove sono conservate le credenziali (Keychain / `.credentials.json`) | alta |
| https://platform.claude.com/docs/en/about-claude/pricing | Listino API verificato (Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0,10/$0,50 fino a 100k e $0,50/$2,50 oltre); cache 0,05x per Opus/Sonnet 5.5, scrittura 1,25x; tokenizzatore +30% dalla 4.7 | alta |
| https://claude.com/pricing | Prezzi dei piani (Pro $20 mensile / $17 annuale; Max "da $100"; Team; Enterprise) | media: da ricontrollare prima di pubblicare |
| https://www.anthropic.com/contact-sales | Destinatario della lettera sulla modalità abbonamento | alta |
| https://www.mindstudio.ai/blog/anthropic-openclaw-ban-oauth-authentication | Cronologia secondaria dei blocchi OAuth 2026 (9 gen, 19 feb, 4 apr, 13 mag, 15 giu) | bassa |
| https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/ | Copertura secondaria del blocco di gennaio 2026 | bassa |
| https://alternativeto.net/news/2026/2/anthropic-officially-bans-using-subscription-authentication-for-third-party-claude-use | Copertura secondaria dell'aggiornamento documentale di febbraio 2026 | bassa |
| https://autonomee.ai/blog/claude-code-terms-of-service-explained/ | Blog che sostiene la rimozione del divieto (non confermato: la pagina legale lo contiene ancora) | bassa |
| https://news.ycombinator.com/item?id=49997654 | Thread "Agent SDK will no longer use subscription" (non raggiunto; in conflitto con l'articolo di supporto) | bassa |

## 2. Anthropic: Claude Code e Agent SDK (documentazione tecnica)

| Fonte | Nota | Conf. |
|---|---|---|
| https://code.claude.com/docs/en/agent-sdk/quickstart.md | Pacchetti TS/Python, binario incluso, autenticazione via `ANTHROPIC_API_KEY`, l'SDK non legge `.env` | alta |
| https://code.claude.com/docs/en/agent-sdk/typescript.md | `env` sostituisce l'ambiente; `pathToClaudeCodeExecutable`; pacchetto nativo per piattaforma; `extractFromBunfs`; `settingSources` | alta |
| https://code.claude.com/docs/en/agent-sdk/hosting.md | Un sottoprocesso `claude` per sessione; trascrizioni locali; SessionStore | alta |
| https://code.claude.com/docs/en/agent-sdk/claude-code-features.md | `settingSources` (omesso = tutti; `[]` nessuno); la memoria automatica si carica comunque e va disattivata a parte; le skill devono essere file | alta |
| https://code.claude.com/docs/en/agent-sdk/subagents.md | Opzione `agents`; gli agenti programmatici sovrascrivono quelli su file; `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (default 3), `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20), `maxBudgetUsd` | alta |
| https://code.claude.com/docs/en/agent-sdk/user-input.md | `canUseTool` può restare in sospeso a tempo indefinito; `AskUserQuestion` non disponibile nei sotto-agenti; hook fittizio in Python | alta |
| https://code.claude.com/docs/en/agent-sdk/permissions.md | Ordine: hook → deny → ask → modalità → allow → `canUseTool`; modalità disponibili | alta |
| https://code.claude.com/docs/en/agent-sdk/plugins.md | Plugin solo da percorso locale nell'SDK | alta |
| https://code.claude.com/docs/en/sub-agents.md | Formato dei sotto-agenti, campi del frontmatter, campi sconosciuti ignorati, scansione ricorsiva, strumento `Agent`, `memory: project`, `claude --agent` | alta |
| https://code.claude.com/docs/en/skills.md | Posizioni e frontmatter delle skill | alta |
| https://code.claude.com/docs/en/plugins/overview.md | Plugin, marketplace, scope, "mods" | alta |
| https://code.claude.com/docs/en/hooks-guide.md | Eventi hook (SessionStart, PostToolUse, Stop, ...) | alta |
| https://code.claude.com/docs/en/mcp.md | Scope MCP; server in-process di tipo `sdk` registrabili solo da un host SDK | alta |
| https://code.claude.com/docs/en/memory.md | Gerarchia CLAUDE.md, `@import` profondità 4, memoria automatica (indice 200 righe/25 KB, file tema), `autoMemoryDirectory`, disattivazione | alta |
| https://code.claude.com/docs/en/headless.md | `claude -p`; `--bare` salta hook/skill/plugin/MCP/memoria/CLAUDE.md e "diventerà il default per -p" | alta |
| https://code.claude.com/docs/en/settings.md | `CLAUDE_CONFIG_DIR`; posizione di `settings.json` e `~/.claude.json` | alta |
| https://code.claude.com/docs/en/setup.md | Installer nativi, auto-aggiornamento, `DISABLE_AUTOUPDATER`/`DISABLE_UPDATES` ("when you distribute Claude Code through your own channels"), binari firmati Anthropic, requisiti (macOS 13+, Windows 10 1809+, 4 GB) | alta |
| https://code.claude.com/docs/en/desktop-quickstart.md | App Desktop: DMG universale, Windows x64/ARM64, scheda Code solo con piano a pagamento | alta |
| https://code.claude.com/docs/en/desktop.md | Desktop: Cowork, Dispatch, computer use; legge gli stessi file `~/.claude` | alta |
| https://code.claude.com/docs/en/channels.md | Channels (anteprima): plugin Telegram/Discord/iMessage, Bun, pairing, "eventi solo con sessione aperta" | alta |
| https://code.claude.com/docs/en/channels-reference.md | Canali personalizzati non distribuibili da terzi; flag ignorata con `-p`/SDK; relay dei permessi; "gate on the sender's identity" | alta |
| https://code.claude.com/docs/en/voice-dictation.md | `/voice`: richiede account claude.ai, microfono locale, audio ai server Anthropic, italiano supportato, solo input | alta |
| https://code.claude.com/docs/en/remote-control.md | Remote Control solo con abbonamento | alta |
| https://code.claude.com/docs/en/routines.md | Routine cloud e attività programmate desktop | alta |
| https://code.claude.com/docs/en/costs.md | Riferimenti di costo; CLAUDE.md sotto 200 righe | alta |
| https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/telegram | Plugin Telegram ufficiale: pairing a 6 caratteri, allowlist, foto; vocali non trascritti | media |
| https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/external_plugins/telegram/server.ts | Sorgente del plugin: grammY long polling, "(voice message)" come segnaposto, 409 ritentato 8 volte, spezzettamento 4096 | alta |
| https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/external_plugins/telegram/ACCESS.md | Politiche pairing/allowlist/disabled; id numerici | alta |
| https://github.com/anthropics/claude-code/issues/37887 | Claude Desktop tiene un `claude.app` versionato con firma separata nella cartella dati (il meccanismo di download/aggiornamento non è documentato da Anthropic); identità TCC separata; uscite silenziose "exited with code 1" | alta |
| https://registry.npmjs.org/@anthropic-ai/claude-agent-sdk | Versione 0.3.307, Node ≥18, dipendenze opzionali per piattaforma `@anthropic-ai/claude-agent-sdk-<piattaforma>` (es. `-darwin-arm64`): è il nome da cercare | alta |
| https://registry.npmjs.org/@anthropic-ai/claude-code-darwin-arm64 | Dimensioni del binario (~274-297 MB scompattato, 122-136 MB compresso), misurate sul pacchetto dell'installer npm di Claude Code (2.1.307); il pacchetto gemello dell'SDK `@anthropic-ai/claude-agent-sdk-darwin-arm64` (0.3.307) ha la stessa dimensione a pochi byte: stesso binario, due nomi (verificato con `npm view` il 22/10/2026) | alta |
| https://claude.com/blog/dispatch-and-computer-use | Dispatch e computer use per Pro/Max (minaccia sostitutiva) | alta |
| https://keepcoding.io/blog-frr/claude-code-native-build-bun/ | Il binario è compilato con Bun (fonte secondaria) | media |

## 3. Pacchettizzazione, firma, distribuzione

| Fonte | Nota | Conf. |
|---|---|---|
| https://github.com/electron/electron/releases/tag/v45.0.0 | Electron 45: Chromium 156, Node 24.22, solo 64 bit | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/asar-archives.md | `spawn()` non supportato dentro ASAR | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/api/app.md | `userData`, `window-all-closed`, `setLoginItemSettings` (richiede firma), deep link | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/api/power-monitor.md | Eventi suspend/resume, lock/unlock | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/notifications.md | AppUserModelId su Windows; notifiche macOS solo se firmata; icone tray | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/launch-app-from-url-in-another-app.md | Deep link solo in app pacchettizzate | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/mac-app-store-submission-guide.md | Vincoli del Mac App Store per Electron | alta |
| https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/code-signing.md | Firma obbligatoria; Azure Artifact Signing "cheapest option" | alta |
| https://raw.githubusercontent.com/electron/notarize/main/README.md | Notarizzazione: requisiti, hardened runtime, credenziali | alta |
| https://raw.githubusercontent.com/electron-userland/electron-builder/master/website/docs/features/auto-update.md | electron-updater: macOS firmata, provider, blockmap, rollout graduale | alta |
| https://raw.githubusercontent.com/electron-userland/electron-builder/master/website/docs/features/code-signing/code-signing-win.md | Firma Windows: Azure (beta), certificati, avviso "unknown publisher" per OV nuovi | alta |
| https://raw.githubusercontent.com/electron-userland/electron-builder/master/website/docs/msix.md | MSIX beta; `runFullTrust`; lo Store firma il pacchetto | alta |
| https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/develop/sidecar.mdx | Tauri sidecar (alternativa scartata) | alta |
| https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/plugin/updater.mdx | Tauri updater | alta |
| https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/distribute/Sign/windows.mdx | "EV e OV costruiscono reputazione allo stesso modo"; Artifact Signing via signCommand | alta |
| https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/distribute/microsoft-store.mdx | Tauri: niente MSIX | alta |
| https://nodejs.org/api/single-executable-applications.html | Node SEA sperimentale (scartato) | alta |
| https://raw.githubusercontent.com/oven-sh/bun/main/docs/bundler/executables.mdx | Eseguibili Bun (contesto sul binario) | media |
| https://developer.apple.com/news/?id=saqachfa | macOS Sequoia: niente più bypass con Control-clic | alta |
| https://developer.apple.com/programs/ | Apple Developer Program $99/anno (€99 in Italia, fonte stampa italiana) | alta / media |
| https://developer.apple.com/app-store/review/guidelines/ | Linee guida 2.5.2 e 2.4.5 (Mac App Store non percorribile) | alta |
| https://developer.apple.com/forums/thread/706390 | Limiti dell'ereditarietà della sandbox per processi figli | media |
| https://learn.microsoft.com/en-us/azure/trusted-signing/quickstart | Idoneità Artifact Signing: organizzazioni UE sì, singoli solo USA/Canada | media |
| https://learn.microsoft.com/en-us/azure/trusted-signing/how-to-change-sku | Prezzi Basic $9,99/mese, Premium $99,99 | media |
| https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation | Reputazione SmartScreen per hash; Store ri-firma | media |
| https://support.microsoft.com/en-us/topic/what-is-smart-app-control-285ea03d-fa88-4d56-882e-6698afdb7003 | Smart App Control blocca le app non firmate senza eccezione | media |
| https://shop.certum.eu/code-signing.html | Prezzi indicativi OV/EV (da verificare) | bassa |
| https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/ | Registrazione Store gratuita anche per aziende (maggio 2026) | media |
| https://raw.githubusercontent.com/Homebrew/brew.sh/master/_posts/2025-11-12-homebrew-5.0.0.md | Homebrew 5 dichiara obsolete le cask non firmate e le disabilita da settembre 2026 | alta |
| https://raw.githubusercontent.com/lukilabs/craft-agents-oss/main/README.md | Craft Agents: Electron + Bun + Agent SDK; dichiara OAuth Pro/Max (esempio di rischio, non modello) | alta |
| https://raw.githubusercontent.com/getAsterisk/opcode/main/README.md | Wrapper che richiedono `claude` preinstallato (inadatti al target) | alta |
| https://betterstack.com/community/guides/scaling-nodejs/tauri-vs-electron-vs-deno-vs-electrobun/ | Ordine di grandezza di dimensioni/RAM dei framework | bassa |
| https://www.iphoneitalia.com/724455/anche-in-italia-e-possibile-attivare-gratuitamente-un-account-sviluppatore-apple | Quota Apple in euro per l'Italia | media |

## 4. Voce (STT, TTS, VAD, audio)

| Fonte | Nota | Conf. |
|---|---|---|
| https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md | Dimensioni dei modelli ggml (large-v3-turbo-q5_0 547 MiB); licenza MIT | alta |
| https://github.com/ggml-org/whisper.cpp/blob/master/README.md | Memoria a runtime; backend Metal/Vulkan; VAD Silero integrato | alta |
| https://github.com/openai/whisper/blob/main/README.md | Modello turbo (809M parametri, MIT) | alta |
| https://models.handy.computer/languages/it | WER italiano di Whisper (benchmark di terzi) | bassa |
| https://arxiv.org/pdf/2303.00747 | WhisperX: allucinazioni sul silenzio, gating con VAD | media |
| https://github.com/k2-fsa/sherpa/blob/master/docs/source/onnx/pretrained_models/offline-transducer/nemo/parakeet-tdt-0.6b-v3.rst | Parakeet-TDT-0.6B-v3: 25 lingue incl. italiano; int8 ~640 MB; CC-BY-4.0 (attribuzione) | alta (licenza: media) |
| https://github.com/k2-fsa/sherpa-onnx/blob/master/README.md | sherpa-onnx Apache-2.0: ASR, VAD, KWS, TTS, binding Node | alta |
| https://registry.npmjs.org/sherpa-onnx-node | v1.13.8 (10/09/2026), pacchetti precompilati per piattaforma | alta |
| https://github.com/k2-fsa/sherpa-onnx/blob/master/nodejs-addon-examples/README.md | Esempi Node; `DYLD_LIBRARY_PATH` su macOS | alta |
| https://github.com/k2-fsa/sherpa/blob/master/docs/source/onnx/kws/pretrained_models/index.rst | Nessun modello KWS italiano | alta |
| https://github.com/k2-fsa/sherpa/blob/master/docs/source/onnx/tts/pretrained_models/kokoro.rst | Kokoro multi-lingua: voci italiane if_sara/im_nicola; dati espeak-ng | alta |
| https://github.com/hexgrad/kokoro/blob/main/kokoro/pipeline.py | L'italiano di Kokoro passa per espeak-ng | alta |
| https://github.com/rhasspy/piper/blob/master/VOICES.md | Voci Piper italiane; Piper ora GPL-3 (piper1-gpl) | alta |
| https://github.com/espeak-ng/espeak-ng | espeak-ng GPL-3.0-or-later | media |
| https://github.com/FunAudioLLM/SenseVoice/blob/main/README.md | SenseVoiceSmall: nessun italiano | alta |
| https://github.com/k2-fsa/sherpa/blob/master/docs/source/onnx/moonshine/models.rst | Moonshine: nessun italiano | alta |
| https://github.com/snakers4/silero-vad/blob/master/README.md | Silero VAD MIT, ~2 MB, <1 ms per blocco | alta |
| https://github.com/TEN-framework/ten-vad/blob/main/LICENSE | TEN VAD: Apache con condizioni aggiuntive | alta |
| https://registry.npmjs.org/@ricky0123/vad-node | vad-node non mantenuto; vad-web attivo; avr-vad alternativa | alta |
| https://github.com/dscripka/openWakeWord/blob/main/README.md | openWakeWord Apache-2.0, solo modelli inglesi | alta |
| https://github.com/Picovoice/porcupine/blob/master/README.md | Porcupine supporta l'italiano; richiede AccessKey | alta |
| https://community.home-assistant.io/t/fyi-picovoice-confirmed-free-tier-accesskeys-will-stop-working-after-june-30-2026/1012744 | Fine del piano gratuito Picovoice (30/06/2026) e prezzi enterprise | bassa |
| https://developers.openai.com/api/docs/pricing | Prezzi trascrizione OpenAI | media |
| https://developers.openai.com/api/docs/guides/speech-to-text | Limiti e formati dell'API di trascrizione | media |
| https://developers.openai.com/api/docs/guides/realtime-transcription | Trascrizione in tempo reale | media |
| https://developers.openai.com/api/docs/guides/text-to-speech | TTS OpenAI dismessa (shutdown 06/01/2027) | media |
| https://deepgram.com/pricing | Nova-3 $0,0042-0,0092/min; Aura-2 $0,030/1k caratteri | media |
| https://developers.deepgram.com/docs/tts-models | Aura-2 italiano: 9 voci | media |
| https://deepgram.com/learn/deepgram-expands-nova-3-with-italian-turkish-norwegian-and-indonesian-support | Italiano in Nova-3 (mono e code-switching) | media |
| https://elevenlabs.io/pricing/api | Scribe $0,22/h batch, $0,39/h realtime | media |
| https://elevenlabs.io/docs/overview/capabilities/speech-to-text | Italiano nella fascia "Excellent" | media |
| https://elevenlabs.io/blog/weve-lowered-api-agents-pricing-and-introduced-pay-as-you-go | Prezzi TTS ElevenLabs in cambiamento (ottobre 2026) | bassa |
| https://www.assemblyai.com/docs/streaming/multilingual-transcription | Streaming multilingue con italiano, $0,15/h | media |
| https://cloud.google.com/speech-to-text/pricing | Prezzi STT Google | alta |
| https://cloud.google.com/text-to-speech/pricing | Chirp 3 HD: 1M caratteri gratis/mese, poi $30/1M | alta |
| https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd | Chirp 3 HD it-IT, streaming, niente SSML | media |
| https://azure.microsoft.com/en-us/pricing/details/speech/ | Prezzi Azure non leggibili (segnaposto) | bassa |
| https://learn.microsoft.com/en-us/azure/ai-services/speech-service/releasenotes | Voci it-IT (Elsa, Diego, Isabella, Alessio, DragonHD) | media |
| https://learn.microsoft.com/en-us/azure/ai-services/speech-service/embedded-speech | Embedded Speech ad accesso limitato, niente Node | media |
| https://developer.apple.com/documentation/speech/speechtranscriber | SpeechAnalyzer/SpeechTranscriber on-device (macOS 26+) | alta |
| https://blog.addpipe.com/apple-speechanalyzer-api/ | Italiano tra le lingue al lancio; ~4% errore (terzi) | media |
| https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoicequality | Qualità delle voci di sistema (default/enhanced/premium) | alta |
| https://support.apple.com/guide/mac-help/change-the-voice-your-mac-uses-to-speak-text-mchlp2290/mac | Download delle voci di sistema macOS | bassa |
| https://learn.microsoft.com/en-us/uwp/api/windows.media.speechrecognition.speechrecognizer.supportedtopiclanguages | Dettatura Windows via servizio remoto; nessun italiano offline per terzi | media |
| https://github.com/gexgd0419/NaturalVoiceSAPIAdapter/blob/master/README.md | Voci naturali Windows non esposte alle app di terzi; solo OneCore "Elsa" | alta |
| https://learn.microsoft.com/en-us/answers/questions/2088770/are-opensource-edge-tts-free-for-commercial-use | edge-tts: uso commerciale non sicuro | media |
| https://core.telegram.org/bots/api#sendvoice | `sendVoice`: OGG/Opus, MP3, M4A fino a 50 MB (via mirror della specifica) | alta |
| https://github.com/eshaz/wasm-audio-decoders/blob/master/src/ogg-opus-decoder/README.md | ogg-opus-decoder 1.7.5 MIT, uscita a 16 kHz | alta |
| https://github.com/discordjs/opus/blob/main/README.md | @discordjs/opus precompilato (alternativa per OGG/Opus in uscita) | alta |
| https://github.com/Vanilagy/mediabunny/blob/main/README.md | mediabunny: muxing Ogg/MP3 in TypeScript; lamejs LGPL | alta |
| https://github.com/eugeneware/ffmpeg-static/blob/master/README.md | ffmpeg-static è GPL-3 (evitato) | alta |
| https://github.com/mybigday/whisper.node/blob/main/README.md | @fugood/whisper.node 1.2.0-rc.1 precompilato (Metal/Vulkan/CUDA) | alta |
| https://registry.npmjs.org/kokoro-js | kokoro-js e altri pacchetti Node (onnxruntime-node, node-cpal, grammy, telegraf) | alta |
| https://onnxruntime.ai/docs/get-started/with-javascript/node.html | onnxruntime-node (per un eventuale porting di openWakeWord) | media |
| https://www.promptquorum.com/local-llms/apple-silicon-whisper-metal-benchmark | Velocità di whisper.cpp su Apple Silicon (terzi) | bassa |
| https://github.com/BtbN/FFmpeg-Builds/releases/tag/latest | Dimensioni dei build FFmpeg (motivo per evitarlo) | media |
| https://huggingface.co/ggerganov/whisper.cpp | Dimensioni dei modelli whisper.cpp | media |

## 5. Telegram e messaggistica

| Fonte | Nota | Conf. |
|---|---|---|
| https://registry.npmjs.org/grammy | grammY 1.46.0 (26/08/2026), attivo | alta |
| https://registry.npmjs.org/telegraf | Telegraf fermo a 4.16.3 (02/2024) | alta |
| https://github.com/yagop/node-telegram-bot-api | v2 riscritta (08/2026), troppo nuova | alta |
| https://github.com/python-telegram-bot/python-telegram-bot | PTB 22.8 (alternativa Python) | alta |
| https://github.com/aiogram/aiogram | aiogram 3.31 (Bot API 10.3), ha i metodi Managed Bots | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/guide/deployment-types.md | Long polling: nessun URL pubblico necessario | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/guide/files.md | Limiti file (20 MB download, 50 MB upload) e plugin files | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/advanced/flood.md | Limiti di flood e auto-retry | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/plugins/ratelimiter.md | Limitatore in ingresso per utente | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/plugins/parse-mode.md | Formattazione basata su entità | alta |
| https://raw.githubusercontent.com/grammyjs/website/main/site/docs/plugins/conversations.md | Conversazioni: serve storage persistente | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/get_updates.py | Testo ufficiale di `getUpdates` (mirror) | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/send_message.py | Limite 4096 caratteri | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/get_file.py | `getFile` fino a 20 MB, link valido ≥1 ora | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/send_voice.py | `sendVoice`: formati e 50 MB | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/types/voice.py | Oggetto Voice (durata, mime, dimensione) | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/send_chat_action.py | `sendChatAction`: stato ≤5 secondi | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/utils/text_decorations.py | Parse mode HTML/MarkdownV2 e caratteri da scappare | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/types/managed_bot_updated.py | Update `managed_bot` (Managed Bots, Bot API 9.6) | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/set_managed_bot_access_settings.py | `setManagedBotAccessSettings` (restrizione al proprietario, fino a 10 utenti aggiunti) | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/get_managed_bot_token.py | `getManagedBotToken` | alta |
| https://raw.githubusercontent.com/aiogram/aiogram/dev-3.x/aiogram/methods/replace_managed_bot_token.py | `replaceManagedBotToken` | alta |
| https://raw.githubusercontent.com/python-telegram-bot/python-telegram-bot/master/src/telegram/constants.py | Costanti: callback_data 64 byte, limiti di flood, dimensioni file | alta |
| https://raw.githubusercontent.com/tdlib/telegram-bot-api/master/README.md | Server Bot API self-hosted (alza i limiti; non usato) | alta |
| https://core.telegram.org/bots/api-changelog | Bot API 10.3 (24/08/2026); 9.6 (03/04/2026) | media |
| https://core.telegram.org/bots/faq | Limiti: 1 msg/s per chat, 20/min nei gruppi, ~30/s globale | media |
| https://core.telegram.org/api/bots/managed-bots | Pagina ufficiale Managed Bots (vista solo via snippet) | media |
| https://core.telegram.org/api/links | Deep link `t.me` e `tg://` | media |
| https://core.telegram.org/bots/api | Semantica del token (inferenze sul rischio di fuga) | media |
| https://help.bothelp.io/en/change-token-telegram-bot | Un solo token per bot; `/revoke` | media |
| https://telegram.org/tos/bot-developers | Termini per sviluppatori di bot: privacy policy accessibile obbligatoria | media |
| https://telegram.org/privacy-tpa | Standard Bot Privacy Policy | media |
| https://community.make.com/t/telegram-bot-error-bot-cant-initiate-conversation-with-a-user/47720 | Un bot non può iniziare una conversazione (403) | media |
| https://community.openhab.org/t/telegram-exception-getupdates-failed-with-error-code-409/149661 | Testo dell'errore 409 Conflict | media |
| https://gram.js.org/tl/messages/TranscribeAudio | La trascrizione vocale di Telegram non è disponibile ai bot | media |
| https://developers.facebook.com/docs/whatsapp/pricing | WhatsApp Business: prezzi per messaggio | media |
| https://www.whatsapp.com/legal/business-solution-terms | Clausola "AI Providers" con carve-out EEA/Brasile | media |
| https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/ | Copertura della clausola AI di WhatsApp | media |
| https://help.zoho.com/portal/en/community/topic/whatsapp-message-pricing-changes-effective-october-1-2026-21-9-2026 | Cambio prezzi WhatsApp dal 01/10/2026 | bassa |
| https://whautomate.com/whatsapp-business-api-pricing-italy | Tariffe EUR Italia (non ufficiali) | bassa |
| https://raw.githubusercontent.com/pedroslopez/whatsapp-web.js/main/README.md | whatsapp-web.js: "WhatsApp does not allow bots or unofficial clients" | alta |
| https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/README.md | Baileys: i manutentori non approvano usi contrari ai termini | alta |

## 6. Concorrenti, precedenti e formati di memoria

| Fonte | Nota | Conf. |
|---|---|---|
| https://raw.githubusercontent.com/dennisavarello/iltuojarvis/main/index.html | iltuojarvis.com: copy, "tre passi", FAQ costi (una tantum + Claude Pro), "niente prezzo, niente garanzia" nel sorgente, 10 posti a ottobre | alta |
| https://raw.githubusercontent.com/dennisavarello/iltuojarvis/main/privacy.html | Privacy page (Google e Meta come responsabili); SRLS e P.IVA | alta |
| https://raw.githubusercontent.com/dennisavarello/iltuojarvis/main/plancia/agenti.json | Roster di esempio della "plancia" | alta |
| https://github.com/dennisavarello/iltuojarvis/commits/main | Attività di ottobre 2026: demo per lead, FAQ costi | alta |
| https://atoka.io/public/it/azienda/dennis-avarello-consulting-societa-a-responsabilita-limitata-semplificata/755ed4d14f74 | Registro imprese della società | media |
| https://github.com/openclaw/openclaw | OpenClaw: README, avvertenze di sicurezza, installazione | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/concepts/agent-workspace.md | File dello spazio di lavoro (AGENTS/SOUL/USER/IDENTITY/BOOTSTRAP/MEMORY/diario) | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/concepts/memory.md | Memoria: "nessuno stato nascosto", ricerca ibrida, dreaming | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/reference/memory-config.md | Default: unicode61, sqlite-vec, 6 risultati, decadimento 30 giorni, cron 03:00 | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/reference/templates/BOOTSTRAP.md | Rituale di primo avvio: "la richiesta dell'utente viene prima", "rituale, non cancello" | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/reference/templates/USER.md | Direttive con `observed/status`, budget 4.000 caratteri, sostituzione al posto (vecchia direttiva segnata come superata) | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/reference/templates/SOUL.md | Persona: "sei un ospite", "questi file sono la tua memoria" | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/reference/templates/AGENTS.md | Linee rosse; manutenzione della memoria | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/start/bootstrapping.md | Semantica del rituale (una volta, cancellazione automatica) | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/concepts/multi-agent.md | Roster multi-agente e binding | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/start/wizard.md | Onboarding CLI; allowlist per id | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/start/onboarding.md | Rilevamento credenziali, `claude setup-token` (pratica che evitiamo) | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/providers/anthropic.md | Avvertenza sul login di Claude Code e sui limiti dell'abbonamento | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/channels/pairing.md | Pairing Telegram a codice | alta |
| https://raw.githubusercontent.com/openclaw/openclaw/main/docs/gateway/security/index.md | "Un confine di fiducia per gateway" | alta |
| https://github.com/openclaw/openclaw/security/advisories | 73 pagine di avvisi di sicurezza | alta |
| https://www.bitsight.com/blog/openclaw-ai-security-risks-exposed-instances | 30.000+ istanze esposte (gen-feb 2026) | media |
| https://thunderbit.com/blog/openclaw-pricing-and-plans | Costi stimati di OpenClaw | bassa |
| https://github.com/NousResearch/hermes-agent | Hermes Agent: file SOUL/USER/MEMORY, FTS5, gateway, vocali | alta |
| https://raw.githubusercontent.com/NousResearch/hermes-agent/main/SOUL.md | Esempio di persona concisa | alta |
| https://www.zo.computer/pricing | Zo Computer (cloud, da $18/mese) | bassa |
| https://github.com/openinterpreter/open-interpreter | Open Interpreter ora agente di coding (non concorrente) | alta |
| https://github.com/letta-ai/letta-code | Letta Code: blocchi di memoria, sleeptime | alta |
| https://arxiv.org/abs/2310.08560 | MemGPT (contesto virtuale) | bassa |
| https://github.com/mem0ai/mem0 | mem0: default OpenAI (non locale) | alta |
| https://raw.githubusercontent.com/mem0ai/mem0/main/docs/open-source/overview.mdx | Default di mem0 open source | alta |
| https://github.com/asg017/sqlite-vec | sqlite-vec (opzione v2 per embedding) | alta |
| https://www.sqlite.org/fts5.html | FTS5: `bm25`, tokenizer unicode61 | media |
| https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/edge/en/concepts/agents.mdx | CrewAI: triade ruolo/obiettivo/retroscena (ispirazione per le descrizioni) | alta |
| https://github.com/AndyTrust/Jarvis | Precedente italiano su Claude Code (GPL, solo Mac, terminale) | alta |
| https://github.com/linuz90/claude-telegram-bot | Bot Telegram su Agent SDK con trascrizione OpenAI (precedente) | alta |
| https://www.martes-ai.com/blog/claude-code-telefono-senza-pc-acceso/ | Guida italiana: Claude Code su VPS via Telegram | media |
| https://pasqualepillitteri.it/en/news/962/obsidian-claude-code-second-brain-persistent-memory | Guida italiana "secondo cervello" con Claude Code | media |
| https://docs.nvidia.com/nemoclaw/manage-sandboxes/workspace-files | NemoClaw adotta il contratto dei file di OpenClaw | media |

## 7. Documenti interni di partenza

| Documento | Nota |
|---|---|
| Brief del fondatore (22/10/2026) | Obiettivi, target, differenza rispetto a iltuojarvis, "non Jarvis" |
| Testo legale verificato (22/10/2026) | Citazioni testuali delle pagine Anthropic, autorevoli su ogni riassunto |
| Digest di ricerca (5 ricercatori, 21/10/2026) | Fatti con URL e confidenza: termini e SDK, pacchettizzazione, voce, Telegram, panorama e formati di memoria |
| Tre proposte di design (22/10/2026) | "utente e business prima", "app brandizzata", "plugin-first" |
| Verdetti dei due giudici (22/10/2026) | Classifica, punti di forza, debolezze, errori di fatto, innesti consigliati |
