import Foundation

/// Definitions and example sentences for one word, grouped by part of speech.
/// Text is kept as Wiktionary's HTML and turned into styled text by the view.
struct WordDefinitions: Sendable {
    struct Sense: Sendable {
        let definitionHTML: String
        let exampleHTML: String?
        /// For entries like "plural of lighter", the word they point to.
        let baseWord: String?
    }

    struct Section: Sendable, Identifiable {
        let id: Int
        let partOfSpeech: String
        let senses: [Sense]
    }

    let word: String
    let sections: [Section]
}

/// Looks words up in English Wiktionary's free REST API (no key needed).
struct DictionaryAPI: Sendable {
    /// Wikimedia asks API clients to identify themselves.
    private static let userAgent = "Morpholex-iOS/1.0 (https://github.com/justPoosay/Morpholex)"

    static func pageURL(for word: String) -> URL? {
        guard let title = pageTitle(word) else { return nil }
        return URL(string: "https://en.wiktionary.org/wiki/\(title)")
    }

    /// Returns nil when Wiktionary has no English entry for the word.
    func definitions(for word: String) async throws -> WordDefinitions? {
        guard
            let title = Self.pageTitle(word),
            let url = URL(string: "https://en.wiktionary.org/api/rest_v1/page/definition/\(title)")
        else { return nil }

        var request = URLRequest(url: url)
        request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 404 { return nil }
        guard (200..<300).contains(status) else { throw MorpholexAPIError.status(status) }

        let raw = try JSONDecoder().decode(RawResponse.self, from: data)
        return Self.parse(word: word, sections: raw.en ?? [])
    }

    /// Wiktionary page titles use underscores for spaces ("a cappella" -> "a_cappella").
    private static func pageTitle(_ word: String) -> String? {
        word.replacingOccurrences(of: " ", with: "_")
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)
    }

    /// Merges sections with the same part of speech (Wiktionary splits them by etymology)
    /// and drops empty placeholder definitions.
    private static func parse(word: String, sections: [RawSection]) -> WordDefinitions? {
        var order: [String] = []
        var sensesByPart: [String: [WordDefinitions.Sense]] = [:]

        for section in sections {
            for definition in section.definitions where !WiktionaryHTML.plainText(definition.definition).isEmpty {
                let example = definition.parsedExamples?
                    .map(\.example)
                    .first { !WiktionaryHTML.plainText($0).isEmpty }
                let sense = WordDefinitions.Sense(
                    definitionHTML: definition.definition,
                    exampleHTML: example,
                    baseWord: WiktionaryHTML.formOfTarget(definition.definition)
                )
                if sensesByPart[section.partOfSpeech] == nil { order.append(section.partOfSpeech) }
                sensesByPart[section.partOfSpeech, default: []].append(sense)
            }
        }

        let merged = order.enumerated().map { index, part in
            WordDefinitions.Section(id: index, partOfSpeech: part, senses: sensesByPart[part] ?? [])
        }
        return merged.isEmpty ? nil : WordDefinitions(word: word, sections: merged)
    }

    private struct RawResponse: Decodable {
        let en: [RawSection]?
    }

    private struct RawSection: Decodable {
        let partOfSpeech: String
        let definitions: [RawDefinition]
    }

    private struct RawDefinition: Decodable {
        let definition: String
        let parsedExamples: [RawExample]?
    }

    private struct RawExample: Decodable {
        let example: String
    }
}

/// Just enough HTML handling for Wiktionary's definition snippets.
enum WiktionaryHTML {
    struct Run {
        let text: String
        let bold: Bool
    }

    /// Splits the snippet into text runs, dropping tags. Text inside <b> (the looked-up
    /// word in example sentences) is marked bold; inline <style>/<script> blocks are skipped.
    static func runs(_ html: String) -> [Run] {
        var runs: [Run] = []
        var bold = false
        var hidden = false
        var rest = Substring(html)

        func append(_ text: Substring) {
            guard !text.isEmpty, !hidden else { return }
            runs.append(Run(text: decodeEntities(String(text)), bold: bold))
        }

        while let open = rest.firstIndex(of: "<") {
            append(rest[..<open])
            guard let close = rest[open...].firstIndex(of: ">") else {
                rest = rest[open...]
                break
            }
            let tag = rest[rest.index(after: open)..<close].lowercased()
            if tag == "b" || tag.hasPrefix("b ") {
                bold = true
            } else if tag == "/b" {
                bold = false
            } else if ["style", "script"].contains(where: { tag == $0 || tag.hasPrefix($0 + " ") }) {
                hidden = true
            } else if tag == "/style" || tag == "/script" {
                hidden = false
            }
            rest = rest[rest.index(after: close)...]
        }
        append(rest)

        return trimmed(runs)
    }

    static func plainText(_ html: String) -> String {
        runs(html).map(\.text).joined()
    }

    /// "plural of lighter" style entries link their base word inside a form-of-definition-link span.
    static func formOfTarget(_ html: String) -> String? {
        guard let marker = html.range(of: "form-of-definition-link") else { return nil }
        let afterMarker = html[marker.upperBound...]
        guard
            let titleStart = afterMarker.range(of: "title=\""),
            let titleEnd = afterMarker[titleStart.upperBound...].firstIndex(of: "\"")
        else { return nil }
        let title = decodeEntities(String(afterMarker[titleStart.upperBound..<titleEnd]))
        return title.isEmpty ? nil : title
    }

    /// Collapses runs of whitespace and trims the ends.
    private static func trimmed(_ runs: [Run]) -> [Run] {
        var result: [Run] = []
        var lastWasSpace = true
        for run in runs {
            var text = ""
            for character in run.text {
                if character.isWhitespace {
                    if !lastWasSpace { text.append(" ") }
                    lastWasSpace = true
                } else {
                    text.append(character)
                    lastWasSpace = false
                }
            }
            if !text.isEmpty { result.append(Run(text: text, bold: run.bold)) }
        }
        if let last = result.last, last.text.hasSuffix(" ") {
            result[result.count - 1] = Run(text: String(last.text.dropLast()), bold: last.bold)
            if result[result.count - 1].text.isEmpty { result.removeLast() }
        }
        return result
    }

    private static let namedEntities: [String: String] = [
        "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": " ",
        "ndash": "–", "mdash": "—", "hellip": "…",
    ]

    private static func decodeEntities(_ text: String) -> String {
        guard text.contains("&") else { return text }
        var result = ""
        var rest = Substring(text)

        while let amp = rest.firstIndex(of: "&") {
            result += rest[..<amp]
            let afterAmp = rest.index(after: amp)
            guard
                let semicolon = rest[afterAmp...].prefix(10).firstIndex(of: ";"),
                let decoded = decodeEntity(rest[afterAmp..<semicolon])
            else {
                result += "&"
                rest = rest[afterAmp...]
                continue
            }
            result += decoded
            rest = rest[rest.index(after: semicolon)...]
        }
        return result + rest
    }

    private static func decodeEntity(_ name: Substring) -> String? {
        if name.hasPrefix("#x") || name.hasPrefix("#X") {
            return UInt32(name.dropFirst(2), radix: 16).flatMap(Unicode.Scalar.init).map { String(Character($0)) }
        }
        if name.hasPrefix("#") {
            return UInt32(name.dropFirst()).flatMap(Unicode.Scalar.init).map { String(Character($0)) }
        }
        return namedEntities[String(name)]
    }
}
