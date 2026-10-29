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

    private let api = MorpholexAPI()
    @ObservationIgnored private var searchTask: Task<Void, Never>?
    /// Set when sanitizing removed a disallowed character, so the follow-up change keeps the message.
    @ObservationIgnored private var pendingRuleError = false

    /// Same storage key as the website's localStorage history.
    private static let historyKey = "word-transformer-history"

    init() {
        history = UserDefaults.standard.stringArray(forKey: Self.historyKey) ?? []
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

    func search(_ text: String) {
        guard let word = WordQuery.validate(text) else {
            queryError = WordQuery.ruleMessage
            Haptics.warning()
            return
        }

        queryError = nil
        input = word
        result = nil
        failed = false
        isLoading = true

        searchTask?.cancel()
        searchTask = Task {
            do {
                let result = try await api.transform(word: word)
                guard !Task.isCancelled else { return }
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

    /// Back to the start screen (tapping the logo).
    func reset() {
        searchTask?.cancel()
        input = ""
        queryError = nil
        result = nil
        failed = false
        isLoading = false
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
