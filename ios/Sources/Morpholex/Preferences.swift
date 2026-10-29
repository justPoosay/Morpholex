import Foundation

/// UserDefaults keys for the settings window.
enum Preferences {
    /// The chosen voice's identifier; empty means the default US English voice.
    static let voiceKey = "voiceIdentifier"
    /// "system", "light" or "dark" (see AppearanceMode).
    static let appearanceKey = "appearance"
}
