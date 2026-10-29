import SwiftUI

/// The list of word formation exercises, with the best score for each.
struct QuizListScreen: View {
    @Environment(Theme.self) private var theme

    private var palette: Palette { theme.palette }

    var body: some View {
        SettingsPage("Quiz", largeTitle: true) {
            Text("Word formation, as in the Cambridge exams: turn the word in capitals into a word that fits each gap. One point for every correct answer.")
                .font(.subheadline)
                .foregroundStyle(palette.mutedForeground)

            if QuizLibrary.exercises.isEmpty {
                Text("No exercises found.")
                    .foregroundStyle(palette.mutedForeground)
            }

            ForEach(QuizLibrary.exercises) { exercise in
                QuizRow(exercise: exercise)
            }
        }
    }
}

private struct QuizRow: View {
    let exercise: QuizExercise

    @AppStorage private var best: Int
    @Environment(Theme.self) private var theme

    init(exercise: QuizExercise) {
        self.exercise = exercise
        _best = AppStorage(wrappedValue: -1, QuizProgress.key(exercise.id))
    }

    var body: some View {
        let palette = theme.palette
        let total = exercise.gaps.count

        NavigationLink(value: Route.exercise(exercise.id)) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.title)
                        .font(.system(size: 18, design: .serif))
                        .foregroundStyle(palette.foreground)
                        .multilineTextAlignment(.leading)
                    Text("\(exercise.level) · \(total) gaps")
                        .font(.footnote)
                        .foregroundStyle(palette.mutedForeground)
                }

                Spacer()

                if best >= 0 {
                    Text("\(best)/\(total)")
                        .font(.system(size: 15, weight: .semibold, design: .monospaced))
                        .foregroundStyle(best == total ? palette.success : palette.primary)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(palette.mutedForeground.opacity(0.6))
            }
            .settingsCard(palette)
        }
        .buttonStyle(.plain)
    }
}
