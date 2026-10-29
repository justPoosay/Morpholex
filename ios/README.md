# Morpholex for iOS

A native SwiftUI version of the Morpholex search page. The word-family dictionary is bundled
in the app, so searches are answered on the phone: instantly, and without internet. The
website's backend (`POST https://morpholex.netlify.app/api/words/transform`) only gets a quiet
background ping per search, so the admin statistics still count it. Tapping a word shows
definitions and example sentences from Wiktionary. A quiz offers word formation exercises like
Part 3 of the Cambridge C1 Advanced and C2 Proficiency exams.

Built with [xtool](https://xtool.sh), so it can be developed on Linux or Windows (WSL)
without a Mac.

## Setup

1. Install xtool and its Swift SDK by following the
   [Linux/Windows installation guide](https://xtool.sh/documentation/xtool/installation-linux/).
   This needs an `Xcode.xip` from Apple. A free Apple ID is enough; apps installed with it
   stop opening after 7 days and must be installed again.
2. **On Windows**, also install:
   - WSL with Ubuntu, set as the default distribution (`wsl --set-default Ubuntu`);
   - the **Apple Devices** app from the Microsoft Store. xtool reaches the iPhone through
     Apple's service from this app, so it must be running while you build.
3. **On Windows**, let WSL reach that service. In `%USERPROFILE%\.wslconfig`:

   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

   Then run `wsl --shutdown` and, in Ubuntu, add this line to `~/.bashrc`:

   ```bash
   export USBMUXD_SOCKET_ADDRESS="127.0.0.1:27015"
   ```

## Build and run

Connect and unlock the iPhone (tap **Trust** the first time), then either:

- **Windows, one click:** double-click `scripts/build-and-install.cmd`
  (see [Scripts](#scripts)), or
- **Any system, from a terminal:** run this in this folder:

  ```bash
  xtool dev
  ```

The first build takes a few minutes. Building from a Windows drive (`/mnt/d/...`) is slower
than from the Linux filesystem, but later builds take a few seconds.

## Scripts

| Script | What it does | How to run |
| --- | --- | --- |
| `scripts/build-and-install.cmd` | Windows only. Starts Apple Devices if it isn't running, waits for its iPhone service, then runs `xtool dev` in this folder through WSL. It finds the folder from its own location, so it works wherever the repo is cloned. | Double-click it, or run it from a terminal. |
| `scripts/build-dictionary.mjs` | Rebuilds `Resources/words.tsv` and `Resources/families.jsonl`, the dictionary the app searches on the phone, from the website's dictionary index (`backend/src/data/word-families.json`). Words are ranked with a word-frequency list so autocomplete suggests common words first. | See below. |
| `scripts/check-quiz.mjs` | Checks `Resources/quiz.json`, the quiz exercises, and reports which answers the word families link to their base word. | `node ios/scripts/check-quiz.mjs` |

### Adding quiz exercises

Add an object to `Resources/quiz.json` like the existing ones: an `id`, a `title`, a `level`, an
`example`, the article as `text` with `{0}` for the example gap and `{1}` to `{8}` for the gaps, and
the eight `gaps`, each with its `base` word in capitals, every accepted `answers` spelling and a short
`change` note. Then run `node ios/scripts/check-quiz.mjs`; it lists anything malformed.

### Rebuilding the dictionary

Run this after the website's dictionary index changes, then reinstall the app. It needs
[Node.js](https://nodejs.org) 18 or newer and Peter Norvig's word-frequency list
(`count_1w.txt`, about 5 MB). The list is only used for the ranking and is not stored in the
repo; the app gets coarse popularity scores, not the list or its counts.

```bash
curl -fL -o count_1w.txt https://norvig.com/ngrams/count_1w.txt
node ios/scripts/build-dictionary.mjs count_1w.txt
```

Run it from the repo root. It prints how many words and families it wrote. The index it reads
comes from the backend (`npm run build:dictionary --workspace backend`, which also widens the
families so derived words like `frequent` and `frequently` share one).

## Layout

| Path | What it is |
| --- | --- |
| `Sources/Morpholex/MorpholexApp.swift` | The app's entry point |
| `Sources/Morpholex/ContentView.swift` | The home screen: search box, suggestions, results |
| `Sources/Morpholex/MorpholexLogo.swift` | The lexical-tree logo |
| `Sources/Morpholex/FlowLayout.swift` | Wraps the word chips onto new lines |
| `Sources/Morpholex/WordQuery.swift` | The input rules for search words (letters and apostrophes, up to 20) |
| `Sources/Morpholex/SearchModel.swift` | Search state, input rules, history and suggestions |
| `Sources/Morpholex/LocalDictionary.swift` | The bundled word-family dictionary: searches are answered on the phone |
| `Sources/Morpholex/WordIndex.swift` | The bundled word list: finds a word's family and autocomplete matches for a prefix |
| `Sources/Morpholex/Suggestion.swift` | One autocomplete suggestion (saved, recent or dictionary) |
| `Sources/Morpholex/MorpholexAPI.swift` | Client for the Morpholex backend (the background search ping) |
| `Sources/Morpholex/LookupCache.swift` | Saves searches and definitions so repeats are instant |
| `Sources/Morpholex/DictionaryAPI.swift` | Wiktionary definitions client |
| `Sources/Morpholex/DefinitionSheet.swift` | The definition pop-up |
| `Sources/Morpholex/Pronouncer.swift` | Reads a word aloud (text-to-speech) |
| `Sources/Morpholex/VoiceCatalog.swift` | Lists the English voices installed on the iPhone |
| `Sources/Morpholex/SavedWords.swift` | The words saved with the heart button |
| `Sources/Morpholex/SavedWordsScreen.swift` | The saved words screen |
| `Sources/Morpholex/QuizExercise.swift` | The quiz exercises: their format, splitting the article into words and gaps, answer checking and loading |
| `Sources/Morpholex/QuizListScreen.swift` | The list of quiz exercises, with the best scores |
| `Sources/Morpholex/QuizScreen.swift` | One exercise: the article with a field to type into at each gap, the score and the review |
| `Sources/Morpholex/Route.swift` | The screens pushed over the home screen |
| `Sources/Morpholex/SettingsScreen.swift` | The settings menu; each option opens its own screen |
| `Sources/Morpholex/SettingsComponents.swift` | The page frame and card style shared by the settings screens |
| `Sources/Morpholex/AppearanceSettingsView.swift` | Settings > Appearance |
| `Sources/Morpholex/VoiceSettingsView.swift` | Settings > Voice |
| `Sources/Morpholex/HistorySettingsView.swift` | Settings > History (the recent searches, and clearing them) |
| `Sources/Morpholex/AboutView.swift` | Settings > About |
| `Sources/Morpholex/Haptics.swift` | Vibration feedback for taps and search results |
| `Sources/Morpholex/Theme.swift` | Colors, and the fade between light and dark mode |
| `Sources/Morpholex/AppearanceMode.swift` | The Automatic / Light / Dark choice from Settings |
| `Sources/Morpholex/Preferences.swift` | Keys for the saved settings |
| `Sources/Morpholex/NavigationBarStyle.swift` | Serif titles for the navigation bar |
| `Sources/Morpholex/Clipboard.swift` | Copies a word to the clipboard |
| `Resources/words.tsv` | The word list: every searchable word, its popularity score and where its family is stored |
| `Resources/families.jsonl` | The word families, one per line |
| `Resources/quiz.json` | The word formation exercises for the quiz |
| `Resources/AppIcon.png` | App icon (the lexical-tree logo) |
| `scripts/` | The scripts described above |
| `Info.plist` | Extra Info.plist keys (landscape support) |
| `xtool.yml` | Bundle ID, icon, Info.plist and bundled resources |
