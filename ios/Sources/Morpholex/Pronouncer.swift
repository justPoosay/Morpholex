import AVFoundation

/// UserDefaults keys for the settings window.
enum Preferences {
    /// The chosen voice's identifier; empty means the default US English voice.
    static let voiceKey = "voiceIdentifier"
}

/// Reads a word aloud with iOS's built-in text-to-speech (no internet needed).
@MainActor
final class Pronouncer {
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ word: String, voiceIdentifier: String = "") {
        stop()
        playThroughSilentSwitch()

        let utterance = AVSpeechUtterance(string: word)
        utterance.voice = Self.voice(for: voiceIdentifier)
        // A little slower than normal speech, so single words are easy to hear.
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        synthesizer.speak(utterance)
    }

    func stop() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
    }

    /// The saved voice, or the default US English one if none is saved or it was deleted from the device.
    private static func voice(for identifier: String) -> AVSpeechSynthesisVoice? {
        if !identifier.isEmpty, let voice = AVSpeechSynthesisVoice(identifier: identifier) {
            return voice
        }
        return AVSpeechSynthesisVoice(language: "en-US")
    }

    /// By default iOS mutes speech when the ringer switch is off; this keeps it audible,
    /// and `mixWithOthers` leaves music playing instead of pausing or ducking it.
    private func playThroughSilentSwitch() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
        try? session.setActive(true)
        #endif
    }
}
