import Foundation

/// One word formation exercise, like Part 3 of the Cambridge C1 Advanced and C2 Proficiency exams:
/// a short article with eight gaps, each with a base word in capitals to turn into a word that fits.
struct QuizExercise: Codable, Identifiable, Sendable {
    struct Example: Codable, Sendable {
        let base: String
        let answer: String
    }

    struct Gap: Codable, Sendable {
        /// The word in capitals shown after the gap.
        let base: String
        /// Every spelling that counts as correct; the first one is shown as the answer.
        let answers: [String]
        /// A few words on what changes, shown after checking (for example "verb → noun").
        let change: String
    }

    let id: String
    let title: String
    let level: String
    let example: Example
    /// The article. `{0}` marks the example gap and `{1}` to `{8}` the gaps to fill; a blank
    /// line separates paragraphs.
    let text: String
    let gaps: [Gap]

    /// Whether a typed answer is right for the gap at `index` (0-based). Capitals and spaces
    /// around the word don't matter.
    func isCorrect(_ answer: String, gap index: Int) -> Bool {
        let normalized = answer.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return gaps[index].answers.contains(normalized)
    }
}

/// A piece of an exercise's article: plain text, or a gap (0 is the example).
enum QuizSegment {
    case text(String)
    case gap(Int)
}

extension QuizExercise {
    /// The article split into text and gaps.
    var segments: [QuizSegment] {
        var result: [QuizSegment] = []
        var current = ""
        var index = text.startIndex

        while index < text.endIndex {
            if text[index] == "{",
               let close = text[index...].firstIndex(of: "}"),
               let number = Int(text[text.index(after: index)..<close]) {
                if !current.isEmpty {
                    result.append(.text(current))
                    current = ""
                }
                result.append(.gap(number))
                index = text.index(after: close)
            } else {
                current.append(text[index])
                index = text.index(after: index)
            }
        }

        if !current.isEmpty { result.append(.text(current)) }
        return result
    }
}

/// The exercises bundled with the app (Resources/quiz.json).
enum QuizLibrary {
    static let exercises: [QuizExercise] = {
        guard
            let url = Bundle.main.url(forResource: "quiz", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let exercises = try? JSONDecoder().decode([QuizExercise].self, from: data)
        else { return [] }
        return exercises
    }()
}

enum QuizProgress {
    /// The UserDefaults key of an exercise's best score; -1 means it hasn't been tried.
    static func key(_ id: String) -> String {
        "quiz-best-\(id)"
    }
}
