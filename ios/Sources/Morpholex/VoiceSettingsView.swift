import SwiftUI

/// Settings > Voice: which installed English voice reads words aloud.
struct VoiceSettingsView: View {
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @State private var groups: [VoiceGroup] = []
    @State private var pronouncer = Pronouncer()
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    /// What the voice plays when you pick it.
    private static let previewText = "Morphology"

    var body: some View {
        SettingsPage("Voice") {
            Text("The voice that reads words aloud. Tap one to hear it.")
                .font(.subheadline)
                .foregroundStyle(palette.mutedForeground)

            voiceRow(id: "", name: "Automatic", detail: "Default US English voice")

            ForEach(groups) { group in
                VStack(alignment: .leading, spacing: 8) {
                    Text(group.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(palette.mutedForeground)
                        .padding(.top, 8)

                    ForEach(group.voices) { voice in
                        voiceRow(id: voice.id, name: voice.name, detail: voice.quality.label)
                    }
                }
            }

            Text("For a more natural sound, download Enhanced or Premium voices in iOS Settings → Accessibility → Spoken Content → Voices → English. They show up here afterwards.")
                .font(.footnote)
                .foregroundStyle(palette.mutedForeground)
                .padding(.top, 8)
        }
        .onAppear { groups = VoiceCatalog.groups() }
        .onDisappear { pronouncer.stop() }
    }

    private func voiceRow(id: String, name: String, detail: String?) -> some View {
        let selected = voiceIdentifier == id

        return Button {
            Haptics.tap()
            voiceIdentifier = id
            pronouncer.speak(Self.previewText, voiceIdentifier: id)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .foregroundStyle(palette.foreground)
                    if let detail {
                        Text(detail)
                            .font(.footnote)
                            .foregroundStyle(palette.mutedForeground)
                    }
                }

                Spacer()

                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(palette.primary)
                }
            }
            .settingsCard(palette, selected: selected)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
