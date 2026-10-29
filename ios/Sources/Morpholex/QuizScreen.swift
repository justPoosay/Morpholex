import SwiftUI

/// One word formation exercise: read the article, type a word into each gap, then check.
struct QuizScreen: View {
    let exercise: QuizExercise

    @Environment(Theme.self) private var theme
    @AppStorage private var best: Int
    @State private var answers: [String]
    @State private var checked = false
    @FocusState private var focused: Int?

    /// Every word and gap of the article has this height, so the lines of text stay even.
    private static let tokenHeight: CGFloat = 30
    private static let fieldWidth: CGFloat = 120

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

                    if checked {
                        resultCard.id("result")
                        reviewSection
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

    // MARK: - Header

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
                Text("Type the correct form of the word in capitals next to each gap. Each correct answer is worth one point.")
                    .font(.subheadline)
                    .foregroundStyle(palette.mutedForeground)

                Text("**Example:** (0) ........ (\(exercise.example.base)) → \(exercise.example.answer.uppercased())")
                    .font(.subheadline)
                    .foregroundStyle(palette.foreground)
            }
            .settingsCard(palette)
        }
    }

    // MARK: - The article

    private var article: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(exercise.paragraphs.enumerated()), id: \.offset) { _, tokens in
                FlowLayout(spacing: 5) {
                    ForEach(tokens) { token in
                        tokenView(token)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func tokenView(_ token: QuizToken) -> some View {
        switch token.kind {
        case .word(let word):
            Text(word)
                .font(.system(size: 17))
                .foregroundStyle(palette.foreground)
                .frame(height: Self.tokenHeight)
        case .gap(let number, let trailing):
            if (1...total).contains(number) {
                gapView(index: number - 1, trailing: trailing)
            } else {
                exampleGap(trailing: trailing)
            }
        }
    }

    /// Gap 0, the example, shown as in the exam.
    private func exampleGap(trailing: String) -> some View {
        HStack(spacing: 4) {
            Text("(0)")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(palette.foreground)
            Text("........")
                .foregroundStyle(palette.mutedForeground)
            Text("(\(exercise.example.base))")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(palette.primary)
            if !trailing.isEmpty {
                Text(trailing).foregroundStyle(palette.foreground)
            }
        }
        .font(.system(size: 17))
        .frame(height: Self.tokenHeight)
    }

    /// A gap to type into with its base word, or, after checking, the answer.
    private func gapView(index: Int, trailing: String) -> some View {
        let gap = exercise.gaps[index]
        let typed = answers[index].trimmingCharacters(in: .whitespaces)
        let correct = checked && exercise.isCorrect(answers[index], gap: index)

        return HStack(spacing: 4) {
            Text("(\(index + 1))")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(palette.foreground)

            if checked {
                // A wrong answer stays visible, crossed out, in front of the right one.
                if !correct && !typed.isEmpty {
                    Text(typed)
                        .strikethrough()
                        .foregroundStyle(palette.mutedForeground)
                }
                Text(gap.answers[0])
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(correct ? palette.success : palette.destructive)
            } else {
                TextField("", text: $answers[index])
                    .font(.system(size: 17))
                    .foregroundStyle(palette.primary)
                    .multilineTextAlignment(.center)
                    .wordInputTraits()
                    .submitLabel(index == total - 1 ? .done : .next)
                    .focused($focused, equals: index)
                    .onSubmit { focused = index + 1 < total ? index + 1 : nil }
                    .frame(width: Self.fieldWidth)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(focused == index ? palette.primary : palette.mutedForeground.opacity(0.7))
                            .frame(height: focused == index ? 2 : 1)
                    }

                Text("(\(gap.base))")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(palette.primary)
            }

            if !trailing.isEmpty {
                Text(trailing).foregroundStyle(palette.foreground)
            }
        }
        .font(.system(size: 17))
        .frame(height: Self.tokenHeight)
    }

    // MARK: - Checking

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
        case 3...: "Keep practising: the review below shows what changes in each word."
        default: "Read the review below and try again."
        }
    }

    /// Each gap's base word, answer and what changes, with what you wrote.
    private var reviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Review")
                .font(.system(size: 13, weight: .semibold))
                .textCase(.uppercase)
                .tracking(1.2)
                .foregroundStyle(palette.primary)

            ForEach(exercise.gaps.indices, id: \.self) { index in
                reviewRow(index)
            }
        }
    }

    private func reviewRow(_ index: Int) -> some View {
        let gap = exercise.gaps[index]
        let correct = exercise.isCorrect(answers[index], gap: index)
        let typed = answers[index].trimmingCharacters(in: .whitespaces)
        let note = correct ? gap.change : (typed.isEmpty ? "No answer · \(gap.change)" : "You wrote “\(typed)” · \(gap.change)")

        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(correct ? palette.success : palette.destructive)
                .padding(.top, 1)

            VStack(alignment: .leading, spacing: 3) {
                Text("\(index + 1). \(gap.base) → \(gap.answers[0])")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(palette.foreground)
                Text(note)
                    .font(.footnote)
                    .foregroundStyle(palette.mutedForeground)
            }

            Spacer(minLength: 0)
        }
        .settingsCard(palette)
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
