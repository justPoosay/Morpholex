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

/// A word of the article, or a gap with the punctuation that follows it.
struct QuizToken: Identifiable, Sendable {
    enum Kind: Sendable {
        case word(String)
        /// Gap 0 is the example.
        case gap(number: Int, trailing: String)
    }

    let id: Int
    var kind: Kind
}

extension QuizExercise {
    /// The article as paragraphs of words and gaps, ready to be laid out in lines. Punctuation
    /// right after a gap, like the comma in "(1) ........, only", stays attached to the gap so a
    /// line never starts with it.
    var paragraphs: [[QuizToken]] {
        var result: [[QuizToken]] = [[]]
        var nextID = 0

        func append(_ kind: QuizToken.Kind) {
            result[result.count - 1].append(QuizToken(id: nextID, kind: kind))
            nextID += 1
        }

        for segment in segments {
            switch segment {
            case .gap(let number):
                append(.gap(number: number, trailing: ""))

            case .text(let string):
                for (partIndex, part) in string.components(separatedBy: "\n\n").enumerated() {
                    if partIndex > 0 { result.append([]) }
                    var rest = Substring(part)

                    if partIndex == 0,
                       let first = rest.first, !first.isWhitespace,
                       let last = result[result.count - 1].last,
                       case .gap(let number, let trailing) = last.kind {
                        let attached = rest.prefix { !$0.isWhitespace }
                        result[result.count - 1][result[result.count - 1].count - 1].kind =
                            .gap(number: number, trailing: trailing + String(attached))
                        rest = rest.dropFirst(attached.count)
                    }

                    for word in rest.split(whereSeparator: { $0.isWhitespace }) {
                        append(.word(String(word)))
                    }
                }
            }
        }

        return result.filter { !$0.isEmpty }
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
