import SwiftUI

@main
struct MorpholexApp: App {
    @State private var appearance = Appearance()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appearance)
                // Always pass a concrete scheme: switching back to nil doesn't reliably
                // return SwiftUI to the device setting.
                .preferredColorScheme(appearance.colorScheme)
                .onAppear { appearance.startWatchingDevice() }
        }
    }
}
