import SwiftUI

/// Settings > History: clears the "Recent" searches.
struct HistorySettingsView: View {
    let search: SearchModel

    @State private var confirmingClear = false
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        let count = search.history.count
        let isEmpty = count == 0

        SettingsPage("History") {
            Button {
                Haptics.tap()
                confirmingClear = true
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Clear search history")
                            .foregroundStyle(isEmpty ? palette.mutedForeground : palette.destructive)
                        Text(isEmpty ? "Nothing to clear" : "\(count) recent \(count == 1 ? "search" : "searches")")
                            .font(.footnote)
                            .foregroundStyle(palette.mutedForeground)
                    }

                    Spacer()

                    Image(systemName: "trash")
                        .foregroundStyle(isEmpty ? palette.mutedForeground : palette.destructive)
                }
                .settingsCard(palette)
            }
            .buttonStyle(.plain)
            .disabled(isEmpty)
            .opacity(isEmpty ? 0.6 : 1)

            Text("Clears the list of recent searches on the home screen. Your saved words are not affected.")
                .font(.footnote)
                .foregroundStyle(palette.mutedForeground)
        }
        .confirmationDialog("Clear your recent searches?", isPresented: $confirmingClear, titleVisibility: .visible) {
            Button("Clear history", role: .destructive) {
                search.clearHistory()
                Haptics.success()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This can't be undone.")
        }
    }
}
