import Foundation
import Observation

/// The words the user has saved with the heart button, newest first, kept on the phone.
@MainActor
@Observable
final class SavedWords {
    private(set) var words: [String]

    private static let key = "saved-words"

    init() {
        words = UserDefaults.standard.stringArray(forKey: Self.key) ?? []
    }

    func contains(_ word: String) -> Bool {
        words.contains(Self.normalized(word))
    }

    /// Saves the word, or removes it if it was already saved.
    func toggle(_ word: String) {
        let word = Self.normalized(word)
        if let index = words.firstIndex(of: word) {
            words.remove(at: index)
        } else {
            words.insert(word, at: 0)
        }
        UserDefaults.standard.set(words, forKey: Self.key)
    }

    private static func normalized(_ word: String) -> String {
        word.trimmingCharacters(in: .whitespaces).lowercased()
    }
}
