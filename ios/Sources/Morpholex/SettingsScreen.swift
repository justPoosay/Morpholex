import SwiftUI

/// The settings screen, which slides in when the gear button in the header is tapped.
/// Add new sections to `body`, each built like `appearanceSection`.
struct SettingsScreen: View {
    /// How many searches are in the "Recent" list.
    let historyCount: Int
    let onClearHistory: () -> Void

    @State private var confirmingClear = false
    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @AppStorage(Preferences.hapticsKey) private var hapticsEnabled = true
    @State private var groups: [VoiceGroup] = []
    @State private var pronouncer = Pronouncer()
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    /// What the voice plays when you pick it.
    private static let previewText = "Morphology"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                appearanceSection
                voiceSection
                feedbackSection
                historySection
                aboutSection
            }
            .padding(24)
        }
        .background(palette.background.ignoresSafeArea())
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(palette.background, for: .navigationBar)
        .onAppear { groups = VoiceCatalog.groups() }
        .onDisappear { pronouncer.stop() }
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
            .background(selected ? palette.primary : palette.card, in: shape)
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
            .background(selected ? palette.primary.opacity(0.08) : palette.card, in: shape)
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
            .background(palette.card, in: shape)
            .overlay(shape.stroke(palette.border.opacity(0.8), lineWidth: 1))
            // A tap confirms the switch was turned on (turning it off stays quiet).
            .onChange(of: hapticsEnabled) { _, isOn in
                if isOn { Haptics.tap() }
            }
        }
    }

    // MARK: - History

    private var historySection: some View {
        let shape = RoundedRectangle(cornerRadius: 10)
        let isEmpty = historyCount == 0

        return VStack(alignment: .leading, spacing: 16) {
            sectionTitle("History")

            Button {
                Haptics.tap()
                confirmingClear = true
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Clear search history")
                            .foregroundStyle(isEmpty ? palette.mutedForeground : palette.destructive)
                        Text(isEmpty ? "Nothing to clear" : "\(historyCount) recent \(historyCount == 1 ? "search" : "searches")")
                            .font(.footnote)
                            .foregroundStyle(palette.mutedForeground)
                    }

                    Spacer()

                    Image(systemName: "trash")
                        .foregroundStyle(isEmpty ? palette.mutedForeground : palette.destructive)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(palette.card, in: shape)
                .overlay(shape.stroke(palette.border.opacity(0.8), lineWidth: 1))
                .contentShape(shape)
            }
            .buttonStyle(.plain)
            .disabled(isEmpty)
            .opacity(isEmpty ? 0.6 : 1)
        }
        .confirmationDialog("Clear your recent searches?", isPresented: $confirmingClear, titleVisibility: .visible) {
            Button("Clear history", role: .destructive) {
                onClearHistory()
                Haptics.success()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This can't be undone.")
        }
    }

    // MARK: - About

    private static var versionText: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = info?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("About")

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
            }
        }
    }

    private func linkRow(_ title: String, detail: String, address: String) -> some View {
        let shape = RoundedRectangle(cornerRadius: 10)

        return Group {
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
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(palette.card, in: shape)
                    .overlay(shape.stroke(palette.border.opacity(0.8), lineWidth: 1))
                    .contentShape(shape)
                }
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
