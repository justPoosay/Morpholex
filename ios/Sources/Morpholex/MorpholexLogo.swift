import SwiftUI

/// The lexical-tree wordmark from frontend/src/components/morpholex-logo.tsx.
struct MorpholexLogo: View {
    @Environment(Theme.self) private var theme

    var body: some View {
        let palette = theme.palette
        HStack(spacing: 10) {
            MorpholexIcon(foreground: palette.foreground, background: palette.background)
                .frame(width: 40, height: 40)
            VStack(alignment: .leading, spacing: 1) {
                Text("Morpholex")
                    .font(.system(size: 22, weight: .bold, design: .serif))
                    .foregroundStyle(palette.foreground)
                Text("MORPHOLOGY EXPLORER")
                    .font(.system(size: 8))
                    .tracking(1.2)
                    .foregroundStyle(palette.primary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Morpholex, morphology explorer")
    }
}

/// The icon is drawn from plain shapes (not a Canvas) so its colors can fade between modes.
struct MorpholexIcon: View {
    let foreground: Color
    let background: Color

    var body: some View {
        ZStack {
            IconTile().fill(foreground)
            IconLine(from: (40, 59), to: (40, 21), width: 5).fill(background)
            IconLine(from: (40, 39), to: (24, 28), width: 4).fill(background)
            IconLine(from: (40, 39), to: (56, 28), width: 4).fill(background)
            IconLine(from: (40, 50), to: (23, 60), width: 4).fill(background)
            IconLine(from: (40, 50), to: (58, 60), width: 4).fill(background)
            IconLeaf(center: (24, 28)).fill(Color(hex: 0xD98545))
            IconLeaf(center: (56, 28)).fill(Color(hex: 0x4E9A9A))
            IconLeaf(center: (23, 60)).fill(Color(hex: 0xB43C55))
            IconLeaf(center: (58, 60)).fill(Color(hex: 0xD98545))
        }
    }
}

// The web SVG draws the icon on an 80×80 grid; these shapes scale it to whatever size they get.

private struct IconTile: Shape {
    func path(in rect: CGRect) -> Path {
        let s = rect.width / 80
        let tile = CGRect(x: rect.minX + 2 * s, y: rect.minY + 2 * s, width: 76 * s, height: 76 * s)
        return Path(roundedRect: tile, cornerRadius: 16 * s)
    }
}

private struct IconLine: Shape {
    let from: (CGFloat, CGFloat)
    let to: (CGFloat, CGFloat)
    let width: CGFloat

    func path(in rect: CGRect) -> Path {
        let s = rect.width / 80
        var line = Path()
        line.move(to: CGPoint(x: rect.minX + from.0 * s, y: rect.minY + from.1 * s))
        line.addLine(to: CGPoint(x: rect.minX + to.0 * s, y: rect.minY + to.1 * s))
        return line.strokedPath(StrokeStyle(lineWidth: width * s, lineCap: .round))
    }
}

private struct IconLeaf: Shape {
    let center: (CGFloat, CGFloat)

    func path(in rect: CGRect) -> Path {
        let s = rect.width / 80
        let radius = 5.5 * s
        let circle = CGRect(
            x: rect.minX + center.0 * s - radius,
            y: rect.minY + center.1 * s - radius,
            width: radius * 2,
            height: radius * 2
        )
        return Path(ellipseIn: circle)
    }
}
