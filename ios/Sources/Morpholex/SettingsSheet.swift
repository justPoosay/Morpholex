import SwiftUI

/// The settings window, opened from the gear button in the header.
/// Add new sections to `body`, each built like `appearanceSection`.
struct SettingsSheet: View {
    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @AppStorage(Preferences.hapticsKey) private var hapticsEnabled = true
    @State private var groups: [VoiceGroup] = []
    @State private var pronouncer = Pronouncer()
    @Environment(Theme.self) private var theme
    @Environment(\.dismiss) private var dismiss

    private var palette: Palette { theme.palette }

    /// What the voice plays when you pick it.
    private static let previewText = "Morphology"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                appearanceSection
                voiceSection
                feedbackSection
            }
            .padding(24)
        }
        .background(palette.card.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear { groups = VoiceCatalog.groups() }
        .onDisappear { pronouncer.stop() }
    }

    private var header: some View {
        HStack {
            Text("Settings")
                .font(.system(size: 32, design: .serif))
                .foregroundStyle(palette.foreground)

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(palette.mutedForeground)
                    .frame(width: 32, height: 32)
                    .background(palette.muted, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
    }

    // MARK: - Appearance

    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Appearance")

            HStack(spacing: 8) {
                ForEach(AppearanceMode.allCases) { mode in
                    appearanceButton(mode)
                }
            }

            Text("Automatic follows your iPhone's light or dark setting.")
                .font(.footnote)
                .foregroundStyle(palette.mutedForeground)
        }
    }

    private func appearanceButton(_ mode: AppearanceMode) -> some View {
        let selected = appearanceRaw == mode.rawValue
        let shape = RoundedRectangle(cornerRadius: 10)

        return Button {
            Haptics.tap()
            appearanceRaw = mode.rawValue
        } label: {
            VStack(spacing: 6) {
                Image(systemName: mode.symbol)
                    .font(.system(size: 18))
                Text(mode.title)
                    .font(.system(size: 14, weight: selected ? .semibold : .regular))
            }
            .foregroundStyle(selected ? palette.primaryForeground : palette.foreground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(selected ? palette.primary : palette.background, in: shape)
            .overlay(shape.stroke(selected ? Color.clear : palette.border.opacity(0.8), lineWidth: 1))
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: - Voice

    private var voiceSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Voice")

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
    }

    private func voiceRow(id: String, name: String, detail: String?) -> some View {
        let selected = voiceIdentifier == id
        let shape = RoundedRectangle(cornerRadius: 10)

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
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? palette.primary.opacity(0.08) : palette.background, in: shape)
            .overlay(shape.stroke(selected ? palette.primary.opacity(0.6) : palette.border.opacity(0.8), lineWidth: 1))
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    // MARK: - Feedback

    private var feedbackSection: some View {
        let shape = RoundedRectangle(cornerRadius: 10)

        return VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Feedback")

            Toggle(isOn: $hapticsEnabled) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Haptic feedback")
                        .foregroundStyle(palette.foreground)
                    Text("Light vibrations when you tap words and finish searches.")
                        .font(.footnote)
                        .foregroundStyle(palette.mutedForeground)
                }
            }
            .tint(palette.primary)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(palette.background, in: shape)
            .overlay(shape.stroke(palette.border.opacity(0.8), lineWidth: 1))
            // A tap confirms the switch was turned on (turning it off stays quiet).
            .onChange(of: hapticsEnabled) { _, isOn in
                if isOn { Haptics.tap() }
            }
        }
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(palette.primary)
    }
}
