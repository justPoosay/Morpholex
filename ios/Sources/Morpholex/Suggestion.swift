/// One autocomplete suggestion shown under the search box.
struct Suggestion: Identifiable, Sendable {
    enum Kind: Sendable {
        /// One of the user's saved words.
        case saved
        /// A recent search.
        case recent
        /// A popular word from the bundled word list.
        case dictionary
    }

    let word: String
    let kind: Kind

    var id: String { word }
}
