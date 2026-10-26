# Morpholex for iOS

A native SwiftUI version of the Morpholex search page. It calls the same backend as the
website (`POST https://morpholex.netlify.app/api/words/transform`) and shows definitions and
example sentences from Wiktionary when a word in the results is tapped.

Built with [xtool](https://xtool.sh), so it can be developed on Linux or Windows (WSL)
without a Mac.

## Build and run

1. Install xtool and its Swift SDK by following the
   [Linux/Windows installation guide](https://xtool.sh/documentation/xtool/installation-linux/).
2. Connect an iPhone, then from this folder run:

   ```bash
   xtool dev
   ```

## Layout

| Path | What it is |
| --- | --- |
| `Sources/Morpholex/ContentView.swift` | The search screen |
| `Sources/Morpholex/SearchModel.swift` | Search state, input rules and history |
| `Sources/Morpholex/MorpholexAPI.swift` | Client for the Morpholex backend |
| `Sources/Morpholex/DictionaryAPI.swift` | Wiktionary definitions client |
| `Sources/Morpholex/DefinitionSheet.swift` | The definition pop-up |
| `Sources/Morpholex/Appearance.swift` | Follows the device's light/dark mode |
| `Resources/AppIcon.png` | App icon (the lexical-tree logo) |
| `Info.plist` | Extra Info.plist keys (landscape support) |
| `xtool.yml` | Bundle ID, icon and Info.plist paths |
