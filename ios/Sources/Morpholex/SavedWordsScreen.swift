import SwiftUI

/// The list of words saved with the heart button. Tap a word for its definition, swipe
/// left to remove it, or swipe right to hear it.
struct SavedWordsScreen: View {
    /// Goes back to the home screen and searches the word.
    let onShowWordFamily: (String) -> Void

    @Environment(Theme.self) private var theme
    @Environment(SavedWords.self) private var savedWords
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""
    @State private var pronouncer = Pronouncer()
    @State private var definitionWord: DefinitionWord?

    private struct DefinitionWord: Identifiable {
        let word: String
        var id: String { word }
    }

    private var palette: Palette { theme.palette }

    var body: some View {
        Group {
            if savedWords.words.isEmpty {
                emptyState
            } else {
                list
            }
        }
        .background(palette.background.ignoresSafeArea())
        .navigationTitle("Saved words")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(palette.background, for: .navigationBar)
        .sheet(item: $definitionWord) { item in
            DefinitionSheet(word: item.word) { word in
                definitionWord = nil
                onShowWordFamily(word)
            }
        }
        .onDisappear { pronouncer.stop() }
    }

    private var list: some View {
        List {
            ForEach(savedWords.words, id: \.self) { word in
                Button {
                    Haptics.tap()
                    definitionWord = DefinitionWord(word: word)
                } label: {
                    HStack {
                        Text(word)
                            .font(.system(size: 20, design: .serif))
                            .foregroundStyle(palette.foreground)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
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
                        savedWords.toggle(word)
                    } label: {
                        Label("Remove", systemImage: "heart.slash")
                    }
                }
                .swipeActions(edge: .leading) {
                    Button {
                        pronouncer.speak(word, voiceIdentifier: voiceIdentifier)
                    } label: {
                        Label("Pronounce", systemImage: "speaker.wave.2")
                    }
                    .tint(palette.primary)
                }
                .contextMenu {
                    Button {
                        pronouncer.speak(word, voiceIdentifier: voiceIdentifier)
                    } label: {
                        Label("Pronounce", systemImage: "speaker.wave.2")
                    }

                    Button {
                        Clipboard.copy(word)
                        Haptics.tap()
                    } label: {
                        Label("Copy", systemImage: "doc.on.doc")
                    }

                    Button(role: .destructive) {
                        savedWords.toggle(word)
                    } label: {
                        Label("Remove from saved", systemImage: "heart.slash")
                    }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "heart")
                .font(.system(size: 40))
                .foregroundStyle(palette.primary.opacity(0.6))
            Text("No saved words yet")
                .font(.system(size: 20, design: .serif))
                .foregroundStyle(palette.foreground)
            Text("Tap the heart in a word's definition to save it here.")
                .font(.subheadline)
                .foregroundStyle(palette.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
