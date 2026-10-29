import AVFoundation

struct VoiceOption: Identifiable, Sendable {
    enum Quality: Int, Sendable {
        case standard, enhanced, premium

        var label: String? {
            switch self {
            case .standard: nil
            case .enhanced: "Enhanced"
            case .premium: "Premium"
            }
        }
    }

    /// The identifier iOS uses to find the voice.
    let id: String
    let name: String
    let quality: Quality
}

/// The English voices of one accent, e.g. all the British ones.
struct VoiceGroup: Identifiable, Sendable {
    /// Language code such as "en-GB".
    let id: String
    let title: String
    let voices: [VoiceOption]
}

/// The English voices installed on this iPhone, grouped by accent.
@MainActor
enum VoiceCatalog {
    /// The old Mac novelty voices (Bells, Whisper, Zarvox...) aren't useful for reading words.
    private static let noveltyPrefix = "com.apple.speech.synthesis.voice."

    static func groups() -> [VoiceGroup] {
        let english = AVSpeechSynthesisVoice.speechVoices().filter {
            $0.language.hasPrefix("en-") && !$0.identifier.hasPrefix(noveltyPrefix)
        }

        // Accent names in English, whatever language the phone itself is set to.
        let locale = Locale(identifier: "en_US")

        let groups = Dictionary(grouping: english, by: \.language).map { language, voices in
            VoiceGroup(
                id: language,
                title: locale.localizedString(forIdentifier: language) ?? language,
                voices: voices.map(option).sorted {
                    // Best quality first, then alphabetical.
                    $0.quality.rawValue != $1.quality.rawValue
                        ? $0.quality.rawValue > $1.quality.rawValue
                        : $0.name < $1.name
                }
            )
        }

        // US English first, since that's the default; the rest alphabetical.
        return groups.sorted {
            if $0.id == "en-US" { return true }
            if $1.id == "en-US" { return false }
            return $0.title < $1.title
        }
    }

    private static func option(_ voice: AVSpeechSynthesisVoice) -> VoiceOption {
        let quality: VoiceOption.Quality = switch voice.quality {
        case .premium: .premium
        case .enhanced: .enhanced
        default: .standard
        }
        return VoiceOption(id: voice.identifier, name: displayName(voice), quality: quality)
    }

    /// The name of the voice with this identifier, or "Automatic" when none is chosen
    /// (or the chosen one was deleted from the phone).
    static func name(for identifier: String) -> String {
        guard !identifier.isEmpty, let voice = AVSpeechSynthesisVoice(identifier: identifier) else {
            return "Automatic"
        }
        return displayName(voice)
    }

    /// iOS sometimes puts "(Enhanced)" or "(Premium)" in the name; the quality is shown separately.
    private static func displayName(_ voice: AVSpeechSynthesisVoice) -> String {
        voice.name
            .replacingOccurrences(of: " (Enhanced)", with: "")
            .replacingOccurrences(of: " (Premium)", with: "")
    }
}
