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
| `Sources/Morpholex/Pronouncer.swift` | Reads a word aloud (text-to-speech) |
| `Sources/Morpholex/VoiceCatalog.swift` | Lists the English voices installed on the iPhone |
| `Sources/Morpholex/SettingsScreen.swift` | The settings menu; each option opens its own screen |
| `Sources/Morpholex/SettingsComponents.swift` | The page frame and card style shared by the settings screens |
| `Sources/Morpholex/AppearanceSettingsView.swift` | Settings > Appearance |
| `Sources/Morpholex/VoiceSettingsView.swift` | Settings > Voice |
| `Sources/Morpholex/FeedbackSettingsView.swift` | Settings > Feedback (haptics switch) |
| `Sources/Morpholex/HistorySettingsView.swift` | Settings > History (clear recent searches) |
| `Sources/Morpholex/AboutView.swift` | Settings > About |
| `Sources/Morpholex/Haptics.swift` | Vibration feedback for taps and search results |
| `Sources/Morpholex/Theme.swift` | Colors, and the fade between light and dark mode |
| `Sources/Morpholex/AppearanceMode.swift` | The Automatic / Light / Dark choice from Settings |
| `Sources/Morpholex/Preferences.swift` | Keys for the saved settings |
| `Sources/Morpholex/Clipboard.swift` | Copies a word to the clipboard |
| `Sources/Morpholex/SavedWords.swift` | The words saved with the heart button |
| `Sources/Morpholex/SavedWordsScreen.swift` | The saved words screen |
| `Sources/Morpholex/Route.swift` | The screens pushed over the home screen |
| `Resources/AppIcon.png` | App icon (the lexical-tree logo) |
| `Info.plist` | Extra Info.plist keys (landscape support) |
| `xtool.yml` | Bundle ID, icon and Info.plist paths |
