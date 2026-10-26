import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Follows the device's light/dark setting. The theme button sets a temporary override
/// that is dropped as soon as the device switches modes (e.g. automatic dark mode at sunset).
@MainActor
@Observable
final class Appearance {
    /// The device-wide setting from Settings > Display & Brightness.
    private(set) var system: ColorScheme
    /// Set by the theme button; nil means follow the device.
    var override: ColorScheme?

    var colorScheme: ColorScheme { override ?? system }

    #if canImport(UIKit)
    @ObservationIgnored private var registration: (any UITraitChangeRegistration)?
    #endif

    init() {
        #if canImport(UIKit)
        system = UITraitCollection.current.userInterfaceStyle == .dark ? .dark : .light
        #else
        system = .light
        #endif
    }

    /// The window scene reports the device setting even while the app's window is overridden,
    /// so watch it rather than SwiftUI's colorScheme (which reflects the override).
    func startWatchingDevice() {
        #if canImport(UIKit)
        guard
            registration == nil,
            let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
        else { return }

        update(from: scene.traitCollection)
        registration = scene.registerForTraitChanges([UITraitUserInterfaceStyle.self]) { [weak self] (scene: UIWindowScene, _: UITraitCollection) in
            self?.update(from: scene.traitCollection)
        }
        #endif
    }

    #if canImport(UIKit)
    private func update(from traits: UITraitCollection) {
        let scheme: ColorScheme = traits.userInterfaceStyle == .dark ? .dark : .light
        if scheme != system {
            system = scheme
            override = nil
        }
    }
    #endif
}
