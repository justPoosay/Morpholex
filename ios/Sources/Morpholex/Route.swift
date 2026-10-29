/// The screens that slide in over the home screen (see the NavigationStack in ContentView).
enum Route: Hashable {
    case saved
    case settings
    /// The list of quiz exercises.
    case quiz
    /// One quiz exercise, by id.
    case exercise(String)
}
