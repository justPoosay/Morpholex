import Foundation
import Observation

@MainActor
@Observable
final class SearchModel {
    var input = ""
    var queryError: String?
    private(set) var result: TransformWordResult?
    private(set) var isLoading = false
    private(set) var failed = false
    private(set) var history: [String]
    /// Autocomplete suggestions for what is typed in the search box.
    private(set) var suggestions: [Suggestion] = []
    /// The dictionary bundled in the app; nil until it has finished loading in the background.
    @ObservationIgnored private var dictionary: LocalDictionary?
    @ObservationIgnored private var savedWords: [String] = []

    /// How many suggestions to show, and how many of those may be the user's own words.
    private static let suggestionLimit = 6
    private static let personalLimit = 3

    private let api = MorpholexAPI()
    @ObservationIgnored private var searchTask: Task<Void, Never>?
    /// Set when sanitizing removed a disallowed character, so the follow-up change keeps the message.
    @ObservationIgnored private var pendingRuleError = false

    /// Same storage key as the website's localStorage history.
    private static let historyKey = "word-transformer-history"

    init() {
        history = UserDefaults.standard.stringArray(forKey: Self.historyKey) ?? []

        // Load the dictionary in the background so starting the app stays fast.
        Task { [weak self] in
            let dictionary = await Task.detached(priority: .utility) { LocalDictionary.load() }.value
            self?.dictionary = dictionary
            self?.refreshSuggestions()
        }
    }

    var hasSearched: Bool { result != nil || isLoading }
    var canSubmit: Bool { !isLoading && WordQuery.validate(input) != nil }

    /// Called after every edit of `input`; keeps it to letters and apostrophes like the website does.
    func inputChanged() {
        let sanitized = WordQuery.sanitize(input)
        if sanitized != input {
            // Uppercase letters and curly apostrophes are fixed silently; anything else gets the rule message.
            pendingRuleError = WordQuery.straightenApostrophes(input.lowercased()) != sanitized
            input = sanitized
            return
        }

        if pendingRuleError {
            pendingRuleError = false
            queryError = WordQuery.ruleMessage
        } else if sanitized.isEmpty || WordQuery.validate(sanitized) != nil {
            queryError = nil
        } else {
            queryError = WordQuery.ruleMessage
        }
    }

    /// Called after the text changes. Saved words and recent searches that match come first
    /// (at most three), then the most popular dictionary words.
    func updateSuggestions(saved: [String]) {
        savedWords = saved
        refreshSuggestions()
    }

    private func refreshSuggestions() {
        let prefix = input
        guard !prefix.isEmpty else {
            suggestions = []
            return
        }

        var result: [Suggestion] = []
        var seen: Set<String> = []

        func addOwn(_ words: [String], as kind: Suggestion.Kind) {
            for word in words where result.count < Self.personalLimit && word.hasPrefix(prefix) {
                // Multi-word saved entries like "a cappella" can't be searched.
                if WordQuery.validate(word) != nil, seen.insert(word).inserted {
                    result.append(Suggestion(word: word, kind: kind))
                }
            }
        }
        addOwn(savedWords, as: .saved)
        addOwn(history, as: .recent)

        if let dictionary {
            let remaining = Self.suggestionLimit - result.count
            for word in dictionary.suggestions(for: prefix, limit: remaining, excluding: seen) {
                result.append(Suggestion(word: word, kind: .dictionary))
            }
        }

        suggestions = result
    }

    func search(_ text: String) {
        guard let word = WordQuery.validate(text) else {
            queryError = WordQuery.ruleMessage
            Haptics.warning()
            return
        }

        queryError = nil
        input = word
        searchTask?.cancel()

        // The dictionary is bundled in the app, so searches are answered on the phone: instantly,
        // and without internet. The server only gets a quiet ping so its statistics still count them.
        if let local = dictionary?.result(for: word) {
            show(local, for: word)
            return
        }

        // Until the dictionary has loaded (the first moment after the app starts), words
        // searched before are answered from the cache, and the rest from the server.
        if let cached = AppCaches.results.value(for: word) {
            show(cached, for: word)
            return
        }

        result = nil
        failed = false
        isLoading = true

        searchTask = Task {
            do {
                let result = try await api.transform(word: word)
                guard !Task.isCancelled else { return }
                AppCaches.results.store(result, for: word)
                self.result = result
                addToHistory(word)
                Haptics.success()
            } catch {
                // A newer search replaced this one; it owns the loading state now.
                guard !Task.isCancelled else { return }
                failed = true
                Haptics.failure()
            }
            isLoading = false
        }
    }

    /// Shows a result that was found without waiting for the server.
    private func show(_ found: TransformWordResult, for word: String) {
        result = found
        failed = false
        isLoading = false
        addToHistory(word)
        Haptics.success()
        // Quietly lets the backend count the search; this returns at once.
        api.recordSearch(word: word)
    }

    /// Back to the start screen (tapping the logo).
    func reset() {
        searchTask?.cancel()
        input = ""
        queryError = nil
        result = nil
        failed = false
        isLoading = false
    }

    /// Removes one search from the "Recent" list.
    func removeFromHistory(_ word: String) {
        history.removeAll { $0 == word }
        UserDefaults.standard.set(history, forKey: Self.historyKey)
    }

    /// Erases the "Recent" list.
    func clearHistory() {
        history = []
        UserDefaults.standard.removeObject(forKey: Self.historyKey)
    }

    private func addToHistory(_ word: String) {
        let others = history.filter { $0.lowercased() != word.lowercased() }
        history = Array(([word] + others).prefix(10))
        UserDefaults.standard.set(history, forKey: Self.historyKey)
    }
}
