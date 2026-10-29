import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Gives the navigation bar of the pushed screens (Saved words, Settings...) the same serif
/// titles and text color as the rest of the app, instead of the system's heavy sans-serif.
enum NavigationBarStyle {
    @MainActor
    static func apply() {
        #if canImport(UIKit)
        // The same HSL values as Palette.foreground, light and dark.
        let titleColor = UIColor { traits in
            let value = (traits.userInterfaceStyle == .dark ? HSL(40, 20, 90) : HSL(220, 20, 15)).rgb
            return UIColor(red: value.red, green: value.green, blue: value.blue, alpha: 1)
        }

        func appearance(transparent: Bool) -> UINavigationBarAppearance {
            let appearance = UINavigationBarAppearance()
            // Flat at the top of a page; the usual blurred bar once the content scrolls under it.
            if transparent {
                appearance.configureWithTransparentBackground()
            } else {
                appearance.configureWithDefaultBackground()
            }
            appearance.largeTitleTextAttributes = [
                .font: serifFont(size: 32, weight: .regular),
                .foregroundColor: titleColor,
            ]
            appearance.titleTextAttributes = [
                .font: serifFont(size: 17, weight: .semibold),
                .foregroundColor: titleColor,
            ]
            return appearance
        }

        let bar = UINavigationBar.appearance()
        bar.standardAppearance = appearance(transparent: false)
        bar.compactAppearance = appearance(transparent: false)
        bar.scrollEdgeAppearance = appearance(transparent: true)
        #endif
    }

    #if canImport(UIKit)
    private static func serifFont(size: CGFloat, weight: UIFont.Weight) -> UIFont {
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        guard let descriptor = base.fontDescriptor.withDesign(.serif) else { return base }
        return UIFont(descriptor: descriptor, size: size)
    }
    #endif
}
