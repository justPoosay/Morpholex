import Foundation

/// The same input rules as frontend/src/lib/word-query.ts: up to 20 letters a–z,
/// with apostrophes allowed only between letters (e.g. "can't").
enum WordQuery {
    static let maxLength = 20
    static let ruleMessage = "Use up to 20 English letters and apostrophes only."

    /// The iPhone keyboard types curly apostrophes; the API only accepts the straight one.
    static func straightenApostrophes(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\u{2019}", with: "'")
            .replacingOccurrences(of: "\u{2018}", with: "'")
    }

    /// Lowercases and drops every character that isn't a–z or an apostrophe.
    static func sanitize(_ value: String) -> String {
        let lowered = straightenApostrophes(value.lowercased())
        return String(lowered.filter { $0 == "'" || isLetter($0) }.prefix(maxLength))
    }

    /// Returns the normalized word, or nil if it breaks the rules.
    static func validate(_ value: String) -> String? {
        let word = straightenApostrophes(value.trimmingCharacters(in: .whitespaces).lowercased())
        guard !word.isEmpty, word.count <= maxLength else { return nil }

        let parts = word.split(separator: "'", omittingEmptySubsequences: false)
        let valid = parts.allSatisfy { part in !part.isEmpty && part.allSatisfy(isLetter) }
        return valid ? word : nil
    }

    private static func isLetter(_ character: Character) -> Bool {
        character.isASCII && character.isLetter
    }
}
