import SwiftUI

/// Settings > Feedback: the haptics switch.
struct FeedbackSettingsView: View {
    @AppStorage(Preferences.hapticsKey) private var hapticsEnabled = true
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        SettingsPage("Feedback") {
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
            .settingsCard(palette)
            // A tap confirms the switch was turned on (turning it off stays quiet).
            .onChange(of: hapticsEnabled) { _, isOn in
                if isOn { Haptics.tap() }
            }
        }
    }
}
