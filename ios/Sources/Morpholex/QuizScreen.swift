import SwiftUI

/// One word formation exercise: read the article, type a word for each gap, then check.
struct QuizScreen: View {
    let exercise: QuizExercise

    @Environment(Theme.self) private var theme
    @AppStorage private var best: Int
    @State private var answers: [String]
    @State private var checked = false
    @FocusState private var focused: Int?

    init(exercise: QuizExercise) {
        self.exercise = exercise
        _best = AppStorage(wrappedValue: -1, QuizProgress.key(exercise.id))
        _answers = State(initialValue: Array(repeating: "", count: exercise.gaps.count))
    }

    private var palette: Palette { theme.palette }
    private var total: Int { exercise.gaps.count }
    private var score: Int { exercise.gaps.indices.filter { exercise.isCorrect(answers[$0], gap: $0) }.count }
    private var hasAnswers: Bool { answers.contains { !$0.trimmingCharacters(in: .whitespaces).isEmpty } }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header.id("top")
                    article
                    answersSection

                    if checked {
                        resultCard.id("result")
                    } else {
                        checkButton
                    }
                }
                .padding(24)
            }
            .scrollDismissesKeyboard(.interactively)
            // After checking, jump to the score; after "Try again", back to the top.
            .onChange(of: checked) { _, isChecked in
                withAnimation { proxy.scrollTo(isChecked ? "result" : "top", anchor: .top) }
            }
        }
        .background(palette.background.ignoresSafeArea())
        .navigationTitle("Word formation")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(palette.background, for: .navigationBar)
    }

    // MARK: - Reading

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(exercise.level) · Word formation")
                .font(.system(size: 12, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.4)
                .foregroundStyle(palette.primary)

            Text(exercise.title)
                .font(.system(size: 30, design: .serif))
                .foregroundStyle(palette.foreground)

            VStack(alignment: .leading, spacing: 8) {
                Text("Use the word in capitals in brackets after each gap to form a word that fits in the gap. Each correct answer is worth one point.")
                    .font(.subheadline)
                    .foregroundStyle(palette.mutedForeground)

                Text("**Example:** (0) ........ (\(exercise.example.base)) → \(exercise.example.answer.uppercased())")
                    .font(.subheadline)
                    .foregroundStyle(palette.foreground)
            }
            .settingsCard(palette)
        }
    }

    private var article: some View {
        Text(articleText)
            .font(.system(size: 17))
            .lineSpacing(8)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The article with each gap marked. While answering, a typed word appears in its gap; after
    /// checking, each gap shows the right answer, in green if you had it and red if not.
    private var articleText: AttributedString {
        var result = AttributedString()
        for segment in exercise.segments {
            switch segment {
            case .text(let string):
                result += piece(string, color: palette.foreground)
            case .gap(let number):
                result += gapText(number)
            }
        }
        return result
    }

    private func gapText(_ number: Int) -> AttributedString {
        // Gap 0 is the example, shown as in the exam.
        guard (1...total).contains(number) else {
            return piece("(0) ........ ", color: palette.foreground, bold: true)
                + piece("(\(exercise.example.base))", color: palette.primary, bold: true)
        }

        let index = number - 1
        let gap = exercise.gaps[index]
        let typed = answers[index].trimmingCharacters(in: .whitespaces)
        let label = piece("(\(number)) ", color: palette.foreground, bold: true)

        if checked {
            let correct = exercise.isCorrect(answers[index], gap: index)
            return label + piece(correct ? typed : gap.answers[0], color: correct ? palette.success : palette.destructive, bold: true)
        }

        return label
            + piece(typed.isEmpty ? "........" : typed, color: typed.isEmpty ? palette.mutedForeground : palette.primary, bold: !typed.isEmpty)
            + piece(" (\(gap.base))", color: palette.primary, bold: true)
    }

    private func piece(_ string: String, color: Color, bold: Bool = false) -> AttributedString {
        var part = AttributedString(string)
        part.foregroundColor = color
        if bold { part.font = .system(size: 17, weight: .semibold) }
        return part
    }

    // MARK: - Answering

    private var answersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your answers")
                .font(.system(size: 13, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.2)
                .foregroundStyle(palette.primary)

            ForEach(exercise.gaps.indices, id: \.self) { index in
                answerRow(index)
            }
        }
    }

    private func answerRow(_ index: Int) -> some View {
        let gap = exercise.gaps[index]
        let correct = checked && exercise.isCorrect(answers[index], gap: index)
        let wrong = checked && !correct
        let shape = RoundedRectangle(cornerRadius: 10)
        let border: Color = wrong
            ? palette.destructive.opacity(0.5)
            : correct ? palette.success.opacity(0.5) : (focused == index ? palette.primary : palette.border.opacity(0.8))

        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Text("\(index + 1)")
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(palette.mutedForeground)

                Text(gap.base)
                    .font(.system(size: 14, weight: .semibold))
                    .tracking(1)
                    .foregroundStyle(palette.primary)

                Spacer()

                if checked {
                    Image(systemName: correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(correct ? palette.success : palette.destructive)
                }
            }

            TextField(
                "",
                text: $answers[index],
                prompt: Text("Your answer").foregroundStyle(palette.mutedForeground.opacity(0.6))
            )
            .font(.system(size: 18))
            .foregroundStyle(palette.foreground)
            .wordInputTraits()
            .submitLabel(index == total - 1 ? .done : .next)
            .focused($focused, equals: index)
            .onSubmit { focused = index + 1 < total ? index + 1 : nil }
            .disabled(checked)

            if checked {
                Text(correct ? gap.change : "Correct answer: \(gap.answers[0]) — \(gap.change)")
                    .font(.footnote)
                    .foregroundStyle(correct ? palette.mutedForeground : palette.destructive)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(palette.card, in: shape)
        .overlay(shape.stroke(border, lineWidth: focused == index ? 2 : 1))
    }

    private var checkButton: some View {
        Button(action: check) {
            Text("Check answers")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(palette.primaryForeground)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(palette.primary, in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(!hasAnswers)
        .opacity(hasAnswers ? 1 : 0.5)
    }

    // MARK: - Result

    private var resultCard: some View {
        let shape = RoundedRectangle(cornerRadius: 14)

        return VStack(spacing: 12) {
            Text("\(score) / \(total)")
                .font(.system(size: 44, design: .serif))
                .foregroundStyle(palette.foreground)

            Text(message)
                .foregroundStyle(palette.mutedForeground)
                .multilineTextAlignment(.center)

            if best >= 0 {
                Text("Best score: \(best) / \(total)")
                    .font(.footnote)
                    .foregroundStyle(palette.mutedForeground)
            }

            Button(action: reset) {
                Text("Try again")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(palette.primaryForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(palette.primary, in: RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .padding(.top, 6)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(palette.card, in: shape)
        .overlay(shape.stroke(palette.border.opacity(0.8), lineWidth: 1))
    }

    private var message: String {
        switch score {
        case total: "Perfect score!"
        case (total - 1)...: "Excellent work."
        case 5...: "Good work."
        case 3...: "Keep practising: the explanations above show what changes in each word."
        default: "Read the explanations above and try again."
        }
    }

    // MARK: - Actions

    private func check() {
        focused = nil
        checked = true
        if score > best { best = score }
        if score == total {
            Haptics.success()
        } else {
            Haptics.tap()
        }
    }

    private func reset() {
        answers = Array(repeating: "", count: total)
        checked = false
    }
}
