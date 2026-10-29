import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// The user's light/dark choice in Settings.
enum AppearanceMode: String, CaseIterable, Identifiable {
    case system, light, dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    var symbol: String {
        switch self {
        case .system: "circle.lefthalf.filled"
        case .light: "sun.max"
        case .dark: "moon"
        }
    }

    /// The scheme this mode forces, or nil to follow the device.
    var forcedScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    /// The saved choice, so the very first frame already has the right colors.
    static var saved: AppearanceMode {
        AppearanceMode(rawValue: UserDefaults.standard.string(forKey: Preferences.appearanceKey) ?? "") ?? .system
    }

    /// Makes the whole window (sheets, keyboard, blurred bars) light or dark, or hands control
    /// back to the device. Setting this on the window is more reliable than SwiftUI's
    /// `preferredColorScheme(nil)`, which can keep the old scheme.
    @MainActor
    func applyToWindows() {
        #if canImport(UIKit)
        let style: UIUserInterfaceStyle = switch self {
        case .system: .unspecified
        case .light: .light
        case .dark: .dark
        }
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                window.overrideUserInterfaceStyle = style
            }
        }
        #endif
    }
}
