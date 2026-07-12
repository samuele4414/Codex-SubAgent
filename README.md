# ChatSubAgent

Configurazione personale e portabile di ruoli per subagenti Codex. Non crea un
nuovo orchestratore: aggiunge ruoli specializzati che Codex può selezionare per
esplorazione, implementazione, revisione e pubblicazione.

## Cosa include

- `scout`: analisi in sola lettura di repository e contratti;
- `builder`: implementazioni circoscritte, test e verifica;
- `reviewer`: revisione indipendente del diff, senza modifiche;
- `publisher`: stage, commit separati per modifiche coerenti e push solo su richiesta esplicita.

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
