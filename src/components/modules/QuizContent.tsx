import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Trophy, RotateCcw } from 'lucide-react';
import { QuizContent as QuizContentType, QuizQuestion } from '../../lib/moduleContent';

interface QuizContentProps {
  content: QuizContentType;
  onComplete?: (score: number) => void;
  isCompleted: boolean;
  previousScore?: number;
}

interface QuestionState {
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  hasAnswered: boolean;
}

export function QuizContent({ content, onComplete, isCompleted, previousScore }: QuizContentProps) {
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    const question = content.questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = answerIndex === question.correctAnswer;

    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        selectedAnswer: answerIndex,
        isCorrect,
        hasAnswered: true
      }
    }));
  };

  const calculateScore = () => {
    const correctCount = Object.values(questionStates).filter(state => state.isCorrect).length;
    const totalQuestions = content.questions.length;
    return Math.round((correctCount / totalQuestions) * 100);
  };

  const handleSubmit = () => {
    const score = calculateScore();
    setFinalScore(score);
    setShowResults(true);

    // If passing score met, complete the module
    if (score >= content.passingScore && onComplete) {
      onComplete(score);
    }
  };

  const handleRetry = () => {
    setQuestionStates({});
    setShowResults(false);
    setFinalScore(null);
  };

  const allQuestionsAnswered = content.questions.every(
    q => questionStates[q.id]?.hasAnswered
  );

  const correctCount = Object.values(questionStates).filter(state => state.isCorrect).length;
  const isPassing = finalScore !== null && finalScore >= content.passingScore;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Quiz header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Knowledge Check</h2>
            <p className="text-sm text-slate-400">
              Passing score: {content.passingScore}% • {content.questions.length} questions
            </p>
          </div>

          {(isCompleted || showResults) && (
            <div className={`flex items-center gap-2 ${isPassing ? 'text-green-400' : 'text-orange-400'}`}>
              {isPassing ? (
                <>
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {finalScore || previousScore}% - Passed!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {finalScore}% - Try again
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {!showResults && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>
                {Object.keys(questionStates).length} / {content.questions.length} answered
              </span>
            </div>
            <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{
                  width: `${(Object.keys(questionStates).length / content.questions.length) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quiz questions */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {content.questions.map((question, index) => {
            const state = questionStates[question.id];
            const hasAnswered = state?.hasAnswered || false;
            const selectedAnswer = state?.selectedAnswer;
            const isCorrect = state?.isCorrect;

            return (
              <div
                key={question.id}
                className={`
                  bg-slate-800 rounded-xl border-2 p-6 transition-all
                  ${hasAnswered
                    ? isCorrect
                      ? 'border-green-600'
                      : 'border-red-600'
                    : 'border-slate-700'
                  }
                `}
              >
                {/* Question */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${hasAnswered
                      ? isCorrect
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-medium text-white flex-1">
                    {question.question}
                  </h3>
                  {hasAnswered && (
                    <div>
                      {isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Answer options */}
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswer === optionIndex;
                    const isCorrectAnswer = optionIndex === question.correctAnswer;
                    const showCorrectAnswer = hasAnswered && !isCorrect && isCorrectAnswer;

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => !hasAnswered && handleAnswerSelect(question.id, optionIndex)}
                        disabled={hasAnswered}
                        className={`
                          w-full text-left px-4 py-3 rounded-lg border-2 transition-all
                          ${hasAnswered
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer hover:border-cyan-500'
                          }
                          ${isSelected && isCorrect
                            ? 'bg-green-900/30 border-green-600 text-white'
                            : isSelected && !isCorrect
                            ? 'bg-red-900/30 border-red-600 text-white'
                            : showCorrectAnswer
                            ? 'bg-green-900/20 border-green-600 text-white'
                            : isSelected
                            ? 'bg-cyan-900/30 border-cyan-600 text-white'
                            : 'bg-slate-900/50 border-slate-700 text-slate-300'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                            ${isSelected || showCorrectAnswer
                              ? 'border-white'
                              : 'border-slate-600'
                            }
                          `}>
                            {String.fromCharCode(65 + optionIndex)}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation (shown after answering) */}
                {hasAnswered && (
                  <div className={`
                    mt-4 p-4 rounded-lg border-l-4
                    ${isCorrect
                      ? 'bg-green-900/20 border-green-500'
                      : 'bg-orange-900/20 border-orange-500'
                    }
                  `}>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      <strong className="font-semibold">
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect.'}
                      </strong>{' '}
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit/Retry buttons */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {showResults ? (
              <>
                Score: <span className="font-bold text-white">{finalScore}%</span> ({correctCount} / {content.questions.length} correct)
              </>
            ) : (
              <>
                {Object.keys(questionStates).length} / {content.questions.length} answered
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showResults && !isPassing && (
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                Retry Quiz
              </button>
            )}

            {!showResults && allQuestionsAnswered && (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
              >
                Submit Answers
              </button>
            )}

            {showResults && isPassing && !isCompleted && onComplete && (
              <button
                onClick={() => onComplete(finalScore!)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Complete Module
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
