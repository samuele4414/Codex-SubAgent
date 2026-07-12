# Codex-SubAgent

Configurazione personale e portabile di ruoli per subagenti Codex. Non crea un
nuovo orchestratore: aggiunge ruoli specializzati che Codex può selezionare per
esplorazione, implementazione, revisione e pubblicazione.

## Cosa include

- `scout`: analisi in sola lettura di repository e contratti;
- `builder`: implementazioni circoscritte, test e verifica;
- `reviewer`: revisione indipendente del diff, senza modifiche;
- `publisher`: stage, commit separati per modifiche coerenti e push solo su richiesta esplicita.
- `samu`: fallback generale per ogni richiesta non coperta dagli altri ruoli.

Le regole in `rules/ROUTING.md` mantengono la delega intenzionale: le azioni
esterne, le modifiche e la pubblicazione restano sempre sotto il controllo
dell'utente.

## Installazione (Windows)

Prerequisito: la funzionalità multi-agent di Codex deve essere abilitata nella
tua installazione. Se non lo è, abilitala dalle impostazioni/documentazione di
Codex prima di procedere.

```powershell
./install.ps1
```

Lo script copia i ruoli in `$CODEX_HOME/agents` (o `~/.codex/agents`) e
aggiunge a `AGENTS.md` un blocco gestito che importa le regole. Non modifica
`config.toml`, credenziali né progetti. Prima di aggiornare un file esistente
crea una copia `.bak` con timestamp.

Per provare l'installazione senza scrivere:

```powershell
./install.ps1 -WhatIf
```

## Disinstallazione

```powershell
./uninstall.ps1
```

Rimuove solo i quattro file installati e il blocco di importazione gestito.

## Personalizzazione

Modifica i file in `agents/` per cambiare tono, limiti e modello dei ruoli;
poi esegui di nuovo l'installer. `templates/AGENTS.md.template` è l'alternativa
per un'installazione manuale.

## Subagent Monitor

Il plugin versionato in `plugins/subagent-monitor` fornisce una dashboard locale
per ruolo, modello, reasoning, stato e durata dei subagent dichiarati. Registra
anche una finestra di osservazione di cinque ore: inizia al primo evento
`started` dichiarato, termina cinque ore dopo e ricomincia con il primo avvio
successivo alla sua scadenza. È un riferimento temporale del monitor, non la
finestra della quota Codex: quella non è esposta dal runtime locale.

La dashboard mostra il tempo effettivamente trascorso dai run dichiarati e, per
i run ancora attivi, una proiezione facoltativa basata sulla mediana delle
durate concluse con lo stesso ruolo, modello e reasoning. Le esecuzioni
contemporanee possono sovrapporsi, quindi tale tempo non rappresenta consumo di
quota. Token di input/output, costi e consumo/rimanenza della quota sono sempre
indicati come **non disponibili** e non vengono mai stimati.

### Installazione e aggiornamento

Il monitor richiede [Node.js](https://nodejs.org/) disponibile nel `PATH`.
Dalla radice di questo repository, copia il plugin nella directory dei plugin
personali di Codex:

```powershell
$source = Join-Path $PWD 'plugins\subagent-monitor'
$target = Join-Path $HOME 'plugins\subagent-monitor'
New-Item -ItemType Directory -Force -Path $target | Out-Null
@('.codex-plugin', 'scripts', 'skills', 'roles.json') | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $source $_) -Destination $target -Recurse -Force
}
```

Lo stesso comando aggiorna il plugin senza toccare `$target\.data`, che contiene
gli eventi e la finestra di osservazione locale. Dopo un aggiornamento riavvia
il monitor con il comando sotto. L'installer principale (`install.ps1`) installa
ruoli e routing, non copia il plugin.

### Avvio e dashboard

```powershell
& "$HOME\plugins\subagent-monitor\scripts\start.ps1"
```

Apri [http://127.0.0.1:43119/](http://127.0.0.1:43119/) per la dashboard. Il
server ascolta solo in locale sulla porta `43119`: lo script riusa un monitor
già sano su quell'indirizzo; se la porta è occupata da un altro processo,
liberala prima di avviarlo.

Con le regole di routing installate, il reporting è automatico: il monitor
viene avviato una volta per task e ogni subagent riceve un evento `started`, poi
`completed` o `failed` con lo stesso ID. Per un uso manuale, avvia il monitor e
invia gli eventi così:

```powershell
$id = 'build-a1b2'
& "$HOME\plugins\subagent-monitor\scripts\report.ps1" -Status started -Role builder -Id $id -Task 'Implementazione dashboard'
# esegui il lavoro
& "$HOME\plugins\subagent-monitor\scripts\report.ps1" -Status completed -Role builder -Id $id
```

Usa `-Status failed` invece di `completed` quando il subagent fallisce, sempre
con lo stesso ID. La dashboard conserva il ruolo, modello e reasoning dichiarati
dal ruolo configurato; non può leggere token, costi, quota o la finestra reale
di utilizzo di Codex. Il pulsante **Clear history** elimina soltanto la cronologia
locale del monitor (`.data`), inclusa la finestra di osservazione; il successivo
evento `started` ne inizierà una nuova.
