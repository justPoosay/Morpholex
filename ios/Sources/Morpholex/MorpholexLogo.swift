import SwiftUI

/// The lexical-tree wordmark from frontend/src/components/morpholex-logo.tsx.
struct MorpholexLogo: View {
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette(scheme)
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

struct MorpholexIcon: View {
    let foreground: Color
    let background: Color

    var body: some View {
        Canvas { context, size in
            // The web SVG draws the icon on an 80×80 grid.
            let scale = size.width / 80
            func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * scale, y: y * scale) }

            let tile = CGRect(x: 2 * scale, y: 2 * scale, width: 76 * scale, height: 76 * scale)
            context.fill(Path(roundedRect: tile, cornerRadius: 16 * scale), with: .color(foreground))

            var trunk = Path()
            trunk.move(to: point(40, 59))
            trunk.addLine(to: point(40, 21))
            context.stroke(trunk, with: .color(background), style: StrokeStyle(lineWidth: 5 * scale, lineCap: .round))

            var branches = Path()
            for (start, end) in [
                (point(40, 39), point(24, 28)),
                (point(40, 39), point(56, 28)),
                (point(40, 50), point(23, 60)),
                (point(40, 50), point(58, 60)),
            ] {
                branches.move(to: start)
                branches.addLine(to: end)
            }
            context.stroke(branches, with: .color(background), style: StrokeStyle(lineWidth: 4 * scale, lineCap: .round))

            let leaves: [(CGPoint, UInt32)] = [
                (point(24, 28), 0xD98545),
                (point(56, 28), 0x4E9A9A),
                (point(23, 60), 0xB43C55),
                (point(58, 60), 0xD98545),
            ]
            for (center, hex) in leaves {
                let radius = 5.5 * scale
                let circle = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
                context.fill(Path(ellipseIn: circle), with: .color(Color(hex: hex)))
            }
        }
    }
}
