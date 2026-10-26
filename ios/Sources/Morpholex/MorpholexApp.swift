import SwiftUI

/// Light and dark mode follow the device setting, with a fade between them (see ThemedRoot).
@main
struct MorpholexApp: App {
    @State private var theme = Theme()

    var body: some Scene {
        WindowGroup {
            ThemedRoot(theme: theme)
        }
    }
}
