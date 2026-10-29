import SwiftUI

/// Settings > History: the recent searches. Tap one to search it again, swipe to remove it,
/// or clear the whole list with the button in the navigation bar.
struct HistorySettingsView: View {
    let search: SearchModel
    /// Goes back to the home screen and searches the word.
    let onSearch: (String) -> Void

    @State private var confirmingClear = false
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        Group {
            if search.history.isEmpty {
                emptyState
            } else {
                list
            }
        }
        .background(palette.background.ignoresSafeArea())
        .navigationTitle("History")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(palette.background, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Clear") {
                    Haptics.tap()
                    confirmingClear = true
                }
                .disabled(search.history.isEmpty)
            }
        }
        .confirmationDialog("Clear your recent searches?", isPresented: $confirmingClear, titleVisibility: .visible) {
            Button("Clear history", role: .destructive) {
                search.clearHistory()
                Haptics.success()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This can't be undone. Your saved words are not affected.")
        }
    }

    private var list: some View {
        List {
            ForEach(search.history, id: \.self) { word in
                Button {
                    Haptics.tap()
                    onSearch(word)
                } label: {
                    HStack {
                        Text(word)
                            .font(.system(size: 20, design: .serif))
                            .foregroundStyle(palette.foreground)

                        Spacer()

                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14))
                            .foregroundStyle(palette.mutedForeground.opacity(0.6))
                    }
                    .padding(.vertical, 6)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .listRowBackground(palette.background)
                .listRowSeparatorTint(palette.border.opacity(0.6))
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) {
                        search.removeFromHistory(word)
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 40))
                .foregroundStyle(palette.primary.opacity(0.6))
            Text("No recent searches")
                .font(.system(size: 20, design: .serif))
                .foregroundStyle(palette.foreground)
            Text("Words you search for show up here.")
                .font(.subheadline)
                .foregroundStyle(palette.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
