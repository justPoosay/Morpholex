import SwiftUI

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
            background = .hsl(220, 25, 10)
            foreground = .hsl(40, 20, 90)
            card = .hsl(220, 25, 13)
            border = .hsl(220, 20, 20)
            primary = .hsl(345, 35, 55)
            primaryForeground = .hsl(220, 25, 10)
            muted = .hsl(220, 20, 16)
            mutedForeground = .hsl(40, 10, 60)
            // Lighter than the website's dark value so the error text stays readable.
            destructive = .hsl(0, 72, 65)
        } else {
            background = .hsl(40, 20, 96)
            foreground = .hsl(220, 20, 15)
            card = .hsl(40, 20, 98)
            border = .hsl(40, 15, 85)
            primary = .hsl(345, 40, 40)
            primaryForeground = .hsl(40, 20, 98)
            muted = .hsl(40, 15, 90)
            mutedForeground = .hsl(220, 15, 45)
            destructive = .hsl(0, 84, 60)
        }
    }
}

extension Color {
    /// Hue in degrees, saturation and lightness in percent, matching the CSS `hsl()` values.
    static func hsl(_ hue: Double, _ saturation: Double, _ lightness: Double) -> Color {
        let s = saturation / 100
        let l = lightness / 100
        let chroma = (1 - abs(2 * l - 1)) * s
        let sector = hue / 60
        let x = chroma * (1 - abs(sector.truncatingRemainder(dividingBy: 2) - 1))

        let rgb: (Double, Double, Double)
        switch sector {
        case ..<1: rgb = (chroma, x, 0)
        case ..<2: rgb = (x, chroma, 0)
        case ..<3: rgb = (0, chroma, x)
        case ..<4: rgb = (0, x, chroma)
        case ..<5: rgb = (x, 0, chroma)
        default: rgb = (chroma, 0, x)
        }

        let m = l - chroma / 2
        return Color(red: rgb.0 + m, green: rgb.1 + m, blue: rgb.2 + m)
    }

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
