import SwiftUI

/// The frame shared by every settings screen: a scrolling page with the app's background
/// and a navigation bar title.
struct SettingsPage<Content: View>: View {
    private let title: String
    private let largeTitle: Bool
    private let content: Content
    @Environment(Theme.self) private var theme

    init(_ title: String, largeTitle: Bool = false, @ViewBuilder content: () -> Content) {
        self.title = title
        self.largeTitle = largeTitle
        self.content = content()
    }

    var body: some View {
        let palette = theme.palette

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                content
            }
            .padding(24)
        }
        .background(palette.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(largeTitle ? .large : .inline)
        .toolbarBackground(palette.background, for: .navigationBar)
    }
}

extension View {
    /// A bordered card, used for the rows on the settings screens.
    func settingsCard(_ palette: Palette, selected: Bool = false) -> some View {
        let shape = RoundedRectangle(cornerRadius: 10)

        return self
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? palette.primary.opacity(0.08) : palette.card, in: shape)
            .overlay(shape.stroke(selected ? palette.primary.opacity(0.6) : palette.border.opacity(0.8), lineWidth: 1))
            .contentShape(shape)
    }
}
