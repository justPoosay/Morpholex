import Foundation

/// The whole word-family dictionary, searched on the phone. It gives the same answers as the
/// server's POST /api/words/transform, but instantly and without internet.
///
/// Built from Resources/words.tsv and Resources/families.jsonl by scripts/build-dictionary.mjs,
/// which normalizes and de-duplicates the forms exactly like backend/src/services/transform-word.ts.
struct LocalDictionary: Sendable {
    private let index: WordIndex
    /// The families file. It is memory-mapped, so iOS only reads the lines that are used.
    private let families: Data

    /// Reads the dictionary from the app bundle. Takes a moment, so call it off the main thread.
    static func load() -> LocalDictionary? {
        guard
            let index = WordIndex.load(),
            let url = Bundle.main.url(forResource: "families", withExtension: "jsonl"),
            let families = try? Data(contentsOf: url, options: .mappedIfSafe)
        else { return nil }
        return LocalDictionary(index: index, families: families)
    }

    init(index: WordIndex, families: Data) {
        self.index = index
        self.families = families
    }

    func suggestions(for prefix: String, limit: Int, excluding: Set<String> = []) -> [String] {
        index.suggestions(for: prefix, limit: limit, excluding: excluding)
    }

    /// The word's family, or an empty result for a word that isn't in the dictionary, like the
    /// server. `word` must already be checked and lowercased (see WordQuery.validate).
    /// Returns nil only if the dictionary files are damaged.
    func result(for word: String) -> TransformWordResult? {
        guard let offset = index.familyOffset(of: word) else {
            return TransformWordResult(originalWord: word, groups: [])
        }
        guard let groups = readFamily(at: offset) else { return nil }
        return TransformWordResult(originalWord: word, groups: groups)
    }

    /// Reads and decodes the one line of the families file that starts at `offset`.
    private func readFamily(at offset: Int) -> [WordGroup]? {
        guard offset >= 0, offset < families.count else { return nil }
        let start = families.startIndex + offset
        guard let end = families[start...].firstIndex(of: UInt8(ascii: "\n")) else { return nil }
        return try? JSONDecoder().decode(CompactFamily.self, from: families[start..<end]).groups
    }
}

/// One line of families.jsonl: `[forms, [[category, [form numbers...]], ...]]`. Each form is
/// stored once and the groups refer to it by number.
private struct CompactFamily: Decodable {
    let groups: [WordGroup]

    init(from decoder: Decoder) throws {
        var family = try decoder.unkeyedContainer()
        let forms = try family.decode([String].self)

        var rawGroups = try family.nestedUnkeyedContainer()
        var groups: [WordGroup] = []
        while !rawGroups.isAtEnd {
            var group = try rawGroups.nestedUnkeyedContainer()
            let category = try group.decode(String.self)
            let numbers = try group.decode([Int].self)
            groups.append(WordGroup(category: category, words: numbers.compactMap { forms.indices.contains($0) ? forms[$0] : nil }))
        }
        self.groups = groups
    }
}
