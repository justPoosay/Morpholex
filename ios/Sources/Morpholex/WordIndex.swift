import Foundation

/// The bundled word list (Resources/words.tsv, built by scripts/build-dictionary.mjs).
/// It finds a word's family for searching, and the most popular words for a prefix for autocomplete.
///
/// The file is sorted, so a word, or all the words starting with a prefix, are found with a
/// binary search; the best few of a prefix's block are then picked by popularity score.
struct WordIndex: Sendable {
    private let words: [String]
    private let scores: [UInt8]
    /// Where each word's family starts in families.jsonl.
    private let offsets: [UInt32]

    /// Reads the list from the app bundle. Takes a moment, so call it off the main thread.
    static func load() -> WordIndex? {
        guard let url = Bundle.main.url(forResource: "words", withExtension: "tsv") else { return nil }
        return WordIndex(contentsOf: url)
    }

    init?(contentsOf url: URL) {
        guard let data = try? Data(contentsOf: url) else { return nil }

        var words: [String] = []
        var scores: [UInt8] = []
        var offsets: [UInt32] = []
        words.reserveCapacity(140_000)
        scores.reserveCapacity(140_000)
        offsets.reserveCapacity(140_000)

        // Each line is "word<TAB>score<TAB>offset". Walking the raw bytes is much faster than
        // splitting a String.
        let tab = UInt8(ascii: "\t")
        let newline = UInt8(ascii: "\n")
        var lineStart = data.startIndex
        var firstTab: Int?
        var secondTab: Int?

        for index in data.indices {
            let byte = data[index]
            if byte == tab {
                if firstTab == nil {
                    firstTab = index
                } else {
                    secondTab = index
                }
            } else if byte == newline {
                if let firstTab, let secondTab {
                    words.append(String(decoding: data[lineStart..<firstTab], as: UTF8.self))
                    scores.append(UInt8(min(Self.number(in: data[(firstTab + 1)..<secondTab]), 255)))
                    offsets.append(UInt32(clamping: Self.number(in: data[(secondTab + 1)..<index])))
                }
                lineStart = index + 1
                firstTab = nil
                secondTab = nil
            }
        }

        guard !words.isEmpty else { return nil }
        self.words = words
        self.scores = scores
        self.offsets = offsets
    }

    /// Where the word's family starts in families.jsonl, or nil if the word isn't in the list.
    func familyOffset(of word: String) -> Int? {
        let index = firstIndex(notBefore: word)
        guard index < words.count, words[index] == word else { return nil }
        return Int(offsets[index])
    }

    /// The most popular words that start with `prefix`, best first. Words in `excluding` are skipped.
    func suggestions(for prefix: String, limit: Int, excluding: Set<String> = []) -> [String] {
        guard !prefix.isEmpty, limit > 0 else { return [] }

        var best: [Int] = []   // indexes into `words`, best first

        var index = firstIndex(notBefore: prefix)
        while index < words.count, words[index].utf8.starts(with: prefix.utf8) {
            defer { index += 1 }
            if excluding.contains(words[index]) { continue }

            // Find where this word belongs among the current best; skip it if it doesn't make the cut.
            var position = best.count
            while position > 0, isBetter(index, than: best[position - 1]) {
                position -= 1
            }
            if position < limit {
                best.insert(index, at: position)
                if best.count > limit { best.removeLast() }
            }
        }

        return best.map { words[$0] }
    }

    /// Higher score first, then shorter, then alphabetical (which is the file order).
    private func isBetter(_ a: Int, than b: Int) -> Bool {
        if scores[a] != scores[b] { return scores[a] > scores[b] }
        let lengthA = words[a].utf8.count
        let lengthB = words[b].utf8.count
        if lengthA != lengthB { return lengthA < lengthB }
        return a < b
    }

    /// The first position whose word is `prefix` or sorts after it.
    private func firstIndex(notBefore prefix: String) -> Int {
        var low = 0
        var high = words.count
        while low < high {
            let middle = (low + high) / 2
            if words[middle] < prefix {
                low = middle + 1
            } else {
                high = middle
            }
        }
        return low
    }

    private static func number(in bytes: Data.SubSequence) -> Int {
        var value = 0
        for byte in bytes where byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9") {
            value = value * 10 + Int(byte - UInt8(ascii: "0"))
        }
        return value
    }
}
