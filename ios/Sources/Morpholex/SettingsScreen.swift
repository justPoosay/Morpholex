import SwiftUI

/// The settings screen, which slides in when the gear button in the header is tapped.
/// It lists the options. Options with more to them open their own screen; simple on/off
/// switches sit directly in the list. To add an option with its own screen, make a new
/// `...SettingsView` built on `SettingsPage` and add a `row` for it below.
struct SettingsScreen: View {
    let search: SearchModel
    /// Goes back to the home screen and searches the word (used by the History screen).
    let onSearch: (String) -> Void

    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @AppStorage(Preferences.hapticsKey) private var hapticsEnabled = true
    @State private var confirmingClearCache = false
    /// Changed after clearing the cache so the row's size is read again.
    @State private var cacheRefresh = 0
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
                HistorySettingsView(search: search, onSearch: onSearch)
            }
            cacheRow
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

    /// Clears the saved searches and definitions; sits directly in the list like the haptics switch.
    @ViewBuilder
    private var cacheRow: some View {
        let _ = cacheRefresh
        let isEmpty = AppCaches.isEmpty
        let size = ByteCountFormatter.string(fromByteCount: Int64(AppCaches.diskSize), countStyle: .file)

        Button {
            Haptics.tap()
            confirmingClearCache = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "externaldrive")
                    .font(.system(size: 17))
                    .foregroundStyle(palette.primary)
                    .frame(width: 26)

                Text("Clear cache")
                    .foregroundStyle(palette.foreground)

                Spacer()

                Text(isEmpty ? "Empty" : size)
                    .font(.subheadline)
                    .foregroundStyle(palette.mutedForeground)
            }
            .settingsCard(palette)
        }
        .buttonStyle(.plain)
        .disabled(isEmpty)
        .opacity(isEmpty ? 0.6 : 1)
        .confirmationDialog("Clear the cache?", isPresented: $confirmingClearCache, titleVisibility: .visible) {
            Button("Clear cache", role: .destructive) {
                AppCaches.clearAll()
                cacheRefresh += 1
                Haptics.success()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Searches and definitions will be downloaded again the next time you look them up. Your saved words and history are not affected.")
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
