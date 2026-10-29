import SwiftUI

/// The settings screen, which slides in when the gear button in the header is tapped.
/// It lists the options. Options with more to them open their own screen; simple on/off
/// switches sit directly in the list. To add an option with its own screen, make a new
/// `...SettingsView` built on `SettingsPage` and add a `row` for it below.
struct SettingsScreen: View {
    let search: SearchModel

    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @AppStorage(Preferences.hapticsKey) private var hapticsEnabled = true
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        SettingsPage("Settings", largeTitle: true) {
            row("Appearance", symbol: "circle.lefthalf.filled", value: (AppearanceMode(rawValue: appearanceRaw) ?? .system).title) {
                AppearanceSettingsView()
            }
            row("Voice", symbol: "speaker.wave.2", value: VoiceCatalog.name(for: voiceIdentifier)) {
                VoiceSettingsView()
            }
            hapticsRow
            row("History", symbol: "clock.arrow.circlepath", value: search.history.isEmpty ? "Empty" : "\(search.history.count)") {
                HistorySettingsView(search: search)
            }
            row("About", symbol: "info.circle", value: AboutView.versionText) {
                AboutView()
            }
        }
    }

    private var hapticsRow: some View {
        Toggle(isOn: $hapticsEnabled) {
            HStack(spacing: 12) {
                Image(systemName: "iphone.radiowaves.left.and.right")
                    .font(.system(size: 17))
                    .foregroundStyle(palette.primary)
                    .frame(width: 26)

                Text("Haptic feedback")
                    .foregroundStyle(palette.foreground)
            }
        }
        .tint(palette.primary)
        .settingsCard(palette)
        // A tap confirms the switch was turned on (turning it off stays quiet).
        .onChange(of: hapticsEnabled) { _, isOn in
            if isOn { Haptics.tap() }
        }
    }

    private func row<Destination: View>(
        _ title: String,
        symbol: String,
        value: String,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 17))
                    .foregroundStyle(palette.primary)
                    .frame(width: 26)

                Text(title)
                    .foregroundStyle(palette.foreground)

                Spacer()

                Text(value)
                    .font(.subheadline)
                    .foregroundStyle(palette.mutedForeground)
                    .lineLimit(1)

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.mutedForeground.opacity(0.6))
            }
            .settingsCard(palette)
        }
        .buttonStyle(.plain)
    }
}
