import SwiftUI

/// The search screen, rebuilt from frontend/src/pages/home.tsx.
struct ContentView: View {
    @State private var model = SearchModel()
    @FocusState private var searchFocused: Bool
    /// The word whose definition pop-up is open.
    @State private var definitionWord: DefinitionWord?
    /// The screens pushed on top of the home screen.
    @State private var path: [Route] = []
    @State private var pronouncer = Pronouncer()
    @AppStorage(Preferences.voiceKey) private var voiceIdentifier = ""

    private struct DefinitionWord: Identifiable {
        let word: String
        var id: String { word }
    }

    @Environment(Theme.self) private var theme
    @Environment(SavedWords.self) private var savedWords

    private var palette: Palette { theme.palette }

    var body: some View {
        NavigationStack(path: $path) {
            home
                .navigationDestination(for: Route.self) { route in
                    destination(route)
                }
                .toolbar(.hidden, for: .navigationBar)
        }
        .tint(palette.primary)
    }

    private var home: some View {
        GeometryReader { proxy in
            ScrollView {
                content
                    .frame(maxWidth: 700)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 24)
                    // Before the first search the hero sits in the middle of the screen, like on the website.
                    .frame(
                        maxWidth: .infinity,
                        minHeight: proxy.size.height,
                        alignment: model.hasSearched ? .top : .center
                    )
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .safeAreaInset(edge: .top, spacing: 0) { header }
        .background(palette.background.ignoresSafeArea())
        .animation(.spring(duration: 0.5), value: model.hasSearched)
        .animation(.easeOut(duration: 0.3), value: model.result?.originalWord)
        .sheet(item: $definitionWord) { item in
            DefinitionSheet(word: item.word) { word in
                definitionWord = nil
                search(word)
            }
        }
    }

    private var content: some View {
        VStack(spacing: 0) {
            if !model.hasSearched {
                hero
            }

            searchField

            if let error = model.queryError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(palette.mutedForeground)
                    .multilineTextAlignment(.center)
                    .padding(.top, 12)
            }

            if !model.hasSearched && !model.history.isEmpty {
                recent
            }

            if model.failed {
                errorBox
            }

            if let result = model.result, !model.isLoading {
                results(result)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button {
                searchFocused = false
                model.reset()
            } label: {
                MorpholexLogo()
            }
            .buttonStyle(.plain)

            Spacer()

            Button {
                Haptics.tap()
                searchFocused = false
                path.append(.saved)
            } label: {
                Image(systemName: "heart")
                    .font(.system(size: 18))
                    .foregroundStyle(palette.mutedForeground)
                    .frame(width: 36, height: 36)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Saved words")

            Button {
                Haptics.tap()
                searchFocused = false
                path.append(.settings)
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 18))
                    .foregroundStyle(palette.mutedForeground)
                    .frame(width: 36, height: 36)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Settings")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .overlay(alignment: .bottom) {
            Rectangle().fill(palette.border.opacity(0.5)).frame(height: 1)
        }
    }

    // MARK: - Search

    private var hero: some View {
        VStack(spacing: 12) {
            Text("Morpholex")
                .font(.system(size: 44, design: .serif))
                .foregroundStyle(palette.foreground)
            Text("Discover the morphological landscape of any English word.")
                .font(.system(size: 17, weight: .light))
                .foregroundStyle(palette.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .padding(.bottom, 32)
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 18))
                .foregroundStyle(searchFocused ? palette.primary : palette.mutedForeground)

            TextField(
                "",
                text: $model.input,
                prompt: Text("e.g. consider, can't, light...").foregroundStyle(palette.mutedForeground.opacity(0.6))
            )
            .font(.system(size: 18))
            .foregroundStyle(palette.foreground)
            .wordInputTraits()
            .submitLabel(.search)
            .focused($searchFocused)
            .onSubmit(submit)
            .onChange(of: model.input) { model.inputChanged() }

            Button(action: submit) {
                Group {
                    if model.isLoading {
                        ProgressView().tint(palette.primaryForeground)
                    } else {
                        Image(systemName: "arrow.right").font(.system(size: 16, weight: .semibold))
                    }
                }
                .foregroundStyle(palette.primaryForeground)
                .frame(width: 40, height: 40)
                .background(palette.primary, in: RoundedRectangle(cornerRadius: 9))
            }
            .buttonStyle(.plain)
            .disabled(!model.canSubmit)
            .opacity(model.canSubmit || model.isLoading ? 1 : 0.5)
            .accessibilityLabel("Search")
        }
        .padding(.leading, 14)
        .padding(.trailing, 6)
        .padding(.vertical, 6)
        .background(palette.card, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(searchFocused ? palette.primary : palette.border.opacity(0.5), lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
    }

    private var recent: some View {
        VStack(spacing: 10) {
            Label("Recent", systemImage: "clock.arrow.circlepath")
                .font(.system(size: 12, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.5)
                .foregroundStyle(palette.mutedForeground)

            FlowLayout(spacing: 8, centered: true) {
                ForEach(model.history, id: \.self) { word in
                    Button(word) {
                        Haptics.tap()
                        search(word)
                    }
                    .buttonStyle(ChipButtonStyle(palette: palette, pill: true))
                    .contextMenu { wordMenu(word) }
                }
            }
        }
        .padding(.top, 24)
        .transition(.opacity)
    }

    // MARK: - Results

    private var errorBox: some View {
        VStack(spacing: 4) {
            Text("Search unavailable.").fontWeight(.medium)
            Text("Please try again in a moment.").font(.subheadline).opacity(0.8)
        }
        .foregroundStyle(palette.destructive)
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(palette.destructive.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(palette.destructive.opacity(0.2), lineWidth: 1))
        .padding(.top, 32)
    }

    private func results(_ result: TransformWordResult) -> some View {
        let formCount = result.groups.reduce(0) { $0 + $1.words.count }

        return VStack(alignment: .leading, spacing: 32) {
            VStack(spacing: 6) {
                Text(result.originalWord)
                    .font(.system(size: 36, design: .serif))
                    .foregroundStyle(palette.foreground)
                Text("Morphological analysis - \(formCount) forms found")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(palette.mutedForeground)
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 20)
            .overlay(alignment: .bottom) {
                Rectangle().fill(palette.border.opacity(0.5)).frame(height: 1)
            }

            if result.groups.isEmpty {
                Text("No transformations found for this word.")
                    .foregroundStyle(palette.mutedForeground)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(24)
                    .background(palette.card, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(palette.border, style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                    )
            } else {
                ForEach(Array(result.groups.enumerated()), id: \.element.category) { index, group in
                    groupSection(group, number: index + 1)
                }
            }
        }
        .padding(.top, 40)
    }

    private func groupSection(_ group: WordGroup, number: Int) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(String(format: "%02d", number))
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(palette.primary.opacity(0.6))
                Text(group.category)
                    .font(.system(size: 22, design: .serif))
                    .foregroundStyle(palette.foreground)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 8)
            .overlay(alignment: .bottom) {
                Rectangle().fill(palette.border.opacity(0.3)).frame(height: 1)
            }

            FlowLayout(spacing: 10) {
                ForEach(group.words, id: \.self) { word in
                    Button(word) {
                        Haptics.tap()
                        searchFocused = false
                        definitionWord = DefinitionWord(word: word)
                    }
                    .buttonStyle(ChipButtonStyle(palette: palette))
                    .contextMenu { wordMenu(word) }
                }
            }
        }
    }

    // MARK: - Actions

    @ViewBuilder
    private func destination(_ route: Route) -> some View {
        switch route {
        case .saved:
            SavedWordsScreen { word in
                path.removeAll()
                search(word)
            }
        case .settings:
            SettingsScreen(search: model)
        }
    }

    /// The menu shown when a word is held down.
    @ViewBuilder
    private func wordMenu(_ word: String) -> some View {
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

        Button {
            savedWords.toggle(word)
            Haptics.tap()
        } label: {
            if savedWords.contains(word) {
                Label("Remove from saved", systemImage: "heart.slash")
            } else {
                Label("Save", systemImage: "heart")
            }
        }

        // Multi-word entries like "a cappella" can't be searched.
        if WordQuery.validate(word) != nil {
            Button {
                search(word)
            } label: {
                Label("Show word family", systemImage: "magnifyingglass")
            }
        }

        if let url = DictionaryAPI.pageURL(for: word) {
            Link(destination: url) {
                Label("Open in Wiktionary", systemImage: "safari")
            }
        }
    }

    private func submit() {
        search(model.input)
    }

    private func search(_ word: String) {
        searchFocused = false
        model.search(word)
    }
}
