import SwiftUI

/// Settings > About: version, links and credits.
struct AboutView: View {
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    static var versionText: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = info?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }

    var body: some View {
        SettingsPage("About") {
            VStack(alignment: .leading, spacing: 4) {
                Text("Morpholex")
                    .font(.system(size: 22, weight: .bold, design: .serif))
                    .foregroundStyle(palette.foreground)
                Text("Version \(Self.versionText)")
                    .font(.footnote)
                    .foregroundStyle(palette.mutedForeground)
                Text("Discover the morphological landscape of any English word.")
                    .font(.subheadline)
                    .foregroundStyle(palette.mutedForeground)
                    .padding(.top, 4)
            }

            VStack(spacing: 8) {
                linkRow("Website", detail: "morpholex.netlify.app", address: "https://morpholex.netlify.app")
                linkRow("Source code", detail: "github.com/justPoosay/Morpholex", address: "https://github.com/justPoosay/Morpholex")
            }

            Text("Credits")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(palette.mutedForeground)
                .padding(.top, 8)

            VStack(spacing: 8) {
                linkRow("Open English WordNet", detail: "Word families · CC BY 4.0", address: "https://en-word.net")
                linkRow("Wiktionary", detail: "Definitions and examples · CC BY-SA 4.0", address: "https://en.wiktionary.org")
                linkRow("Peter Norvig's word counts", detail: "Ranks the autocomplete suggestions", address: "https://norvig.com/ngrams/")
            }
        }
    }

    @ViewBuilder
    private func linkRow(_ title: String, detail: String, address: String) -> some View {
        if let url = URL(string: address) {
            Link(destination: url) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .foregroundStyle(palette.foreground)
                        Text(detail)
                            .font(.footnote)
                            .foregroundStyle(palette.mutedForeground)
                    }

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 14))
                        .foregroundStyle(palette.primary)
                }
                .settingsCard(palette)
            }
        }
    }
}
