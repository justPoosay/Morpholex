import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Small vibrations for taps and search results. They do nothing on devices without a
/// haptic engine (iPads and the simulator), or when turned off in Settings.
@MainActor
enum Haptics {
    private static var enabled: Bool {
        UserDefaults.standard.object(forKey: Preferences.hapticsKey) as? Bool ?? true
    }

    /// A light tap for pressing a word or the pronunciation button.
    static func tap() {
        #if canImport(UIKit)
        guard enabled else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }

    /// A search finished and found results.
    static func success() {
        #if canImport(UIKit)
        guard enabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        #endif
    }

    /// The search text broke the input rules.
    static func warning() {
        #if canImport(UIKit)
        guard enabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        #endif
    }

    /// The search failed (for example, no internet).
    static func failure() {
        #if canImport(UIKit)
        guard enabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        #endif
    }
}
