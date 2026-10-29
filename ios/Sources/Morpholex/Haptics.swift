import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Small vibrations for taps and search results. They do nothing on devices without a
/// haptic engine (iPads and the simulator).
@MainActor
enum Haptics {
    /// A light tap for pressing a word or the pronunciation button.
    static func tap() {
        #if canImport(UIKit)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }

    /// A search finished and found results.
    static func success() {
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        #endif
    }

    /// The search text broke the input rules.
    static func warning() {
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
        #endif
    }

    /// The search failed (for example, no internet).
    static func failure() {
        #if canImport(UIKit)
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        #endif
    }
}
