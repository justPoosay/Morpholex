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

    /// Tells the backend a word was searched when the app answered from its cache, so the
    /// admin search statistics still count it. The backend records a search whenever it
    /// receives one, so this sends the normal request and throws the answer away.
    ///
    /// It returns immediately: the request runs in a low-priority background task on its own
    /// URLSession, so it never delays the (instant) cached search or the user's real requests.
    /// Failures, such as having no internet, are ignored; that search simply isn't counted.
    func recordSearch(word: String) {
        Task.detached(priority: .background) {
            guard let request = try? Self.request(for: word) else { return }
            _ = try? await Self.pingSession.data(for: request)
        }
    }

    /// A separate session for pings: no cache or cookies kept, and a short timeout so a
    /// slow connection doesn't leave requests hanging around.
    private static let pingSession: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 8
        configuration.urlCache = nil
        return URLSession(configuration: configuration)
    }()

    private static func request(for word: String) throws -> URLRequest {
        var request = URLRequest(url: baseURL.appending(path: "api/words/transform"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["word": word])
        return request
    }

    private func send(_ word: String) async throws -> TransformWordResult {
        let request = try Self.request(for: word)
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
