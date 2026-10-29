import SwiftUI

/// Settings > Appearance: Automatic, Light or Dark.
struct AppearanceSettingsView: View {
    @AppStorage(Preferences.appearanceKey) private var appearanceRaw = AppearanceMode.system.rawValue
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        SettingsPage("Appearance") {
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
}
