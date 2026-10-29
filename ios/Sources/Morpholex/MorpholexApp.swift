import SwiftUI

/// Light and dark mode follow the device setting, with a fade between them (see ThemedRoot).
@main
struct MorpholexApp: App {
    @State private var theme = Theme()
    @State private var savedWords = SavedWords()

    init() {
        NavigationBarStyle.apply()
    }

    var body: some Scene {
        WindowGroup {
            ThemedRoot(theme: theme, savedWords: savedWords)
        }
    }
}
