import Foundation

/// A small cache of lookups by word. It lives in memory and is saved to the app's Caches
/// folder, so it survives restarts. iOS may delete that folder when storage runs low, which
/// is fine: the app just fetches those words again.
///
/// When it holds more than `limit` words, the one used longest ago is dropped.
@MainActor
final class LookupCache<Value: Codable & Sendable> {
    private struct Snapshot: Codable, Sendable {
        var order: [String]
        var entries: [String: Value]
    }

    private var entries: [String: Value] = [:]
    /// The words from least to most recently used.
    private var order: [String] = []
    private let limit: Int
    private let fileURL: URL
    /// The latest save to disk; each new save waits for the previous one, so they finish in order.
    private var pendingSave: Task<Void, Never>?

    init(name: String, limit: Int) {
        self.limit = limit
        let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        fileURL = folder.appendingPathComponent("\(name).json")

        if let data = try? Data(contentsOf: fileURL),
           let snapshot = try? JSONDecoder().decode(Snapshot.self, from: data) {
            entries = snapshot.entries
            order = snapshot.order
        }
    }

    func value(for word: String) -> Value? {
        let key = Self.key(word)
        guard let value = entries[key] else { return nil }
        // Using a word makes it the last one to be dropped.
        order.removeAll { $0 == key }
        order.append(key)
        return value
    }

    func store(_ value: Value, for word: String) {
        let key = Self.key(word)
        entries[key] = value
        order.removeAll { $0 == key }
        order.append(key)

        while order.count > limit {
            entries[order.removeFirst()] = nil
        }
        save()
    }

    /// How many words are cached.
    var count: Int { entries.count }

    /// The size of the saved file in bytes (0 if nothing is saved yet).
    var diskSize: Int {
        (try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
    }

    func removeAll() {
        entries = [:]
        order = []

        let url = fileURL
        let previous = pendingSave
        pendingSave = Task.detached(priority: .utility) {
            await previous?.value
            try? FileManager.default.removeItem(at: url)
        }
    }

    private func save() {
        let snapshot = Snapshot(order: order, entries: entries)
        let url = fileURL
        let previous = pendingSave
        pendingSave = Task.detached(priority: .utility) {
            await previous?.value
            if let data = try? JSONEncoder().encode(snapshot) {
                try? data.write(to: url, options: .atomic)
            }
        }
    }

    private static func key(_ word: String) -> String {
        word.trimmingCharacters(in: .whitespaces).lowercased()
    }
}

/// The app's two caches, shared by the search model and the definition pop-up.
@MainActor
enum AppCaches {
    /// Word families from the Morpholex backend.
    static let results = LookupCache<TransformWordResult>(name: "search-results", limit: 500)
    /// Definitions and examples from Wiktionary.
    static let definitions = LookupCache<WordDefinitions>(name: "definitions", limit: 200)

    static var isEmpty: Bool { results.count == 0 && definitions.count == 0 }

    /// The space both caches take on the phone, in bytes.
    static var diskSize: Int { results.diskSize + definitions.diskSize }

    static func clearAll() {
        results.removeAll()
        definitions.removeAll()
    }
}
