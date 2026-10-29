import Observation
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// The website's color tokens from frontend/src/index.css (HSL), for light and dark mode.
struct Palette {
    let background: Color
    let foreground: Color
    let card: Color
    let border: Color
    let primary: Color
    let primaryForeground: Color
    let muted: Color
    let mutedForeground: Color
    let destructive: Color

    init(_ scheme: ColorScheme) {
        if scheme == .dark {
            background = HSL(220, 25, 10).color
            foreground = HSL(40, 20, 90).color
            card = HSL(220, 25, 13).color
            border = HSL(220, 20, 20).color
            primary = HSL(345, 35, 55).color
            primaryForeground = HSL(220, 25, 10).color
            muted = HSL(220, 20, 16).color
            mutedForeground = HSL(40, 10, 60).color
            // Lighter than the website's dark value so the error text stays readable.
            destructive = HSL(0, 72, 65).color
        } else {
            background = HSL(40, 20, 96).color
            foreground = HSL(220, 20, 15).color
            card = HSL(40, 20, 98).color
            border = HSL(40, 15, 85).color
            primary = HSL(345, 40, 40).color
            primaryForeground = HSL(40, 20, 98).color
            muted = HSL(40, 15, 90).color
            mutedForeground = HSL(220, 15, 45).color
            destructive = HSL(0, 84, 60).color
        }
    }
}

/// The color scheme the app is drawn in. It follows the device setting, but changes through
/// `withAnimation` so every color fades smoothly instead of snapping.
@MainActor
@Observable
final class Theme {
    var scheme: ColorScheme
    var palette: Palette { Palette(scheme) }

    init() {
        scheme = AppearanceMode.saved.forcedScheme ?? Self.deviceScheme()
    }

    /// The device's current setting, so the very first frame already has the right colors.
    private static func deviceScheme() -> ColorScheme {
        #if canImport(UIKit)
        UIScreen.main.traitCollection.userInterfaceStyle == .dark ? .dark : .light
        #else
        .light
        #endif
    }
}

/// Wraps the app and fades its colors whenever the light/dark mode changes, whether the
/// device switched or the user picked Light or Dark in Settings.
struct ThemedRoot: View {
    let theme: Theme
    let savedWords: SavedWords
    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    /// The window's scheme, which is the device's unless a mode is forced.
    @Environment(\.colorScheme) private var windowScheme

    private var mode: AppearanceMode { AppearanceMode(rawValue: appearanceRaw) ?? .system }
    private var targetScheme: ColorScheme { mode.forcedScheme ?? windowScheme }

    var body: some View {
        ContentView()
            .environment(theme)
            .environment(savedWords)
            .onAppear {
                mode.applyToWindows()
                theme.scheme = targetScheme
            }
            .onChange(of: appearanceRaw) { mode.applyToWindows() }
            .onChange(of: targetScheme) { _, newScheme in
                withAnimation(.easeInOut(duration: 0.35)) {
                    theme.scheme = newScheme
                }
            }
    }
}

/// Hue in degrees, saturation and lightness in percent, matching the CSS `hsl()` values.
struct HSL {
    let hue: Double
    let saturation: Double
    let lightness: Double

    init(_ hue: Double, _ saturation: Double, _ lightness: Double) {
        self.hue = hue
        self.saturation = saturation
        self.lightness = lightness
    }

    var color: Color {
        let s = saturation / 100
        let l = lightness / 100
        let chroma = (1 - abs(2 * l - 1)) * s
        let sector = hue / 60
        let x = chroma * (1 - abs(sector.truncatingRemainder(dividingBy: 2) - 1))

        let base: (Double, Double, Double)
        switch sector {
        case ..<1: base = (chroma, x, 0)
        case ..<2: base = (x, chroma, 0)
        case ..<3: base = (0, chroma, x)
        case ..<4: base = (0, x, chroma)
        case ..<5: base = (x, 0, chroma)
        default: base = (chroma, 0, x)
        }

        let m = l - chroma / 2
        return Color(red: base.0 + m, green: base.1 + m, blue: base.2 + m)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

/// The word chips in the results and the "Recent" pills.
struct ChipButtonStyle: ButtonStyle {
    let palette: Palette
    var pill = false

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: pill ? 999 : 8)
        configuration.label
            .font(.system(size: pill ? 14 : 16))
            .foregroundStyle(pill ? palette.mutedForeground : palette.foreground)
            .multilineTextAlignment(.leading)
            .padding(.horizontal, pill ? 12 : 14)
            .padding(.vertical, pill ? 6 : 8)
            .background(pill ? palette.muted.opacity(0.5) : palette.card, in: shape)
            .overlay(shape.stroke(palette.border.opacity(pill ? 0.4 : 0.8), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension View {
    /// Plain word input: no autocapitalization or autocorrect, and an ASCII keyboard.
    func wordInputTraits() -> some View {
        #if os(iOS)
        self
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(.asciiCapable)
        #else
        self
        #endif
    }
}
