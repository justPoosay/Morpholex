import Foundation

struct WordGroup: Codable, Sendable, Hashable {
    let category: String
    let words: [String]
}

struct TransformWordResult: Codable, Sendable {
    let originalWord: String
    let groups: [WordGroup]
}

enum MorpholexAPIError: Error {
    case status(Int)
}

/// Talks to the same backend as the website (backend/netlify/functions/words-transform.mts).
struct MorpholexAPI: Sendable {
    static let baseURL = URL(string: "https://morpholex.netlify.app")!

    /// Like the website, retries once after 750 ms on a network error or a 5xx response.
    func transform(word: String) async throws -> TransformWordResult {
        do {
            return try await send(word)
        } catch {
            guard Self.isRetryable(error) else { throw error }
            try await Task.sleep(for: .milliseconds(750))
            return try await send(word)
        }
    }

    private func send(_ word: String) async throws -> TransformWordResult {
        var request = URLRequest(url: Self.baseURL.appending(path: "api/words/transform"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["word": word])

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw MorpholexAPIError.status(status) }
        return try JSONDecoder().decode(TransformWordResult.self, from: data)
    }

    private static func isRetryable(_ error: Error) -> Bool {
        if let apiError = error as? MorpholexAPIError, case .status(let code) = apiError {
            return [500, 502, 503, 504].contains(code)
        }
        return error is URLError
    }
}
