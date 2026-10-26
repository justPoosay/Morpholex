import SwiftUI

/// The pop-up shown when a word in the results is tapped: definitions and an
/// example sentence per sense, from Wiktionary.
struct DefinitionSheet: View {
    /// Closes the sheet and runs a Morpholex search for the word.
    let onShowWordFamily: (String) -> Void

    @State private var word: String
    @State private var state = LoadState.loading
    @State private var expandedSections: Set<Int> = []
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss

    private enum LoadState {
        case loading
        case loaded(WordDefinitions)
        case notFound
        case failed
    }

    /// How many senses each part of speech shows before "Show all".
    private static let collapsedSenseCount = 3

    init(word: String, onShowWordFamily: @escaping (String) -> Void) {
        _word = State(initialValue: word)
        self.onShowWordFamily = onShowWordFamily
    }

    private var palette: Palette { Palette(scheme) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header

                switch state {
                case .loading:
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                case .loaded(let definitions):
                    ForEach(definitions.sections) { section in
                        sectionView(section)
                    }
                    attribution
                case .notFound:
                    message("No definition found for “\(word)”.")
                case .failed:
                    message("Couldn't load the definition. Check your internet connection and try again.")
                }
            }
            .padding(24)
        }
        .background(palette.card.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .task(id: word) { await load() }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 10) {
                Text(word)
                    .font(.system(size: 32, design: .serif))
                    .foregroundStyle(palette.foreground)

                if WordQuery.validate(word) != nil {
                    Button {
                        onShowWordFamily(word)
                    } label: {
                        Label("Show word family", systemImage: "magnifyingglass")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(palette.primary)
                    }
                    .buttonStyle(.plain)
                }
            }

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

    private func sectionView(_ section: WordDefinitions.Section) -> some View {
        let expanded = expandedSections.contains(section.id)
        let senses = expanded ? section.senses : Array(section.senses.prefix(Self.collapsedSenseCount))

        return VStack(alignment: .leading, spacing: 14) {
            Text(section.partOfSpeech)
                .font(.system(size: 13, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.2)
                .foregroundStyle(palette.primary)

            ForEach(Array(senses.enumerated()), id: \.offset) { index, sense in
                senseView(sense, number: index + 1)
            }

            if !expanded && section.senses.count > Self.collapsedSenseCount {
                Button("Show all \(section.senses.count) meanings") {
                    expandedSections.insert(section.id)
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(palette.primary)
                .buttonStyle(.plain)
            }
        }
    }

    private func senseView(_ sense: WordDefinitions.Sense, number: Int) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("\(number).")
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(palette.mutedForeground)

            VStack(alignment: .leading, spacing: 8) {
                Text(styled(sense.definitionHTML))
                    .foregroundStyle(palette.foreground)

                if let example = sense.exampleHTML {
                    Text(styled(example))
                        .italic()
                        .foregroundStyle(palette.mutedForeground)
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) {
                            Rectangle().fill(palette.primary.opacity(0.4)).frame(width: 2)
                        }
                }

                if let base = sense.baseWord, base.lowercased() != word.lowercased() {
                    Button("Look up “\(base)”") {
                        word = base
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(palette.primary)
                    .buttonStyle(.plain)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var attribution: some View {
        let label = Text("Definitions from Wiktionary, CC BY-SA 4.0")
            .font(.footnote)
            .foregroundStyle(palette.mutedForeground)

        if let url = DictionaryAPI.pageURL(for: word) {
            Link(destination: url) { label.underline() }
        } else {
            label
        }
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .foregroundStyle(palette.mutedForeground)
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
            .padding(.vertical, 32)
    }

    /// Wiktionary HTML to styled text; the looked-up word in examples stays bold.
    private func styled(_ html: String) -> AttributedString {
        var result = AttributedString()
        for run in WiktionaryHTML.runs(html) {
            var part = AttributedString(run.text)
            if run.bold { part.inlinePresentationIntent = .stronglyEmphasized }
            result += part
        }
        return result
    }

    private func load() async {
        state = .loading
        expandedSections = []
        do {
            if let definitions = try await DictionaryAPI().definitions(for: word) {
                state = .loaded(definitions)
            } else {
                state = .notFound
            }
        } catch {
            // Switching to another word cancels this lookup; that one sets the state.
            guard !Task.isCancelled else { return }
            state = .failed
        }
    }
}
