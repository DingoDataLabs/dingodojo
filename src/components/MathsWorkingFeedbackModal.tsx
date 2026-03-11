import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface MathsAnnotation {
  originalText: string;
  suggestion: string;
  type: "correct" | "error" | "praise" | "method";
  comment: string;
}

interface MathsWorkingFeedback {
  correct_answer: number;
  clear_working: number;
  correct_method: number;
  neat_layout: number;
  composite_score: number;
  feedback: string;
  overall_rating: string;
  annotations: MathsAnnotation[];
  bonus_xp_awarded: number;
  transcribed_working: string;
}

interface MathsWorkingFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: MathsWorkingFeedback;
  bonusXp: number;
  workedSolutionType: "chart" | "working";
}

function ScoreBar({ score, label, comment }: { score: number; label: string; comment?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`text-sm ${i < score ? "text-primary" : "text-muted-foreground/30"}`}>
              {i < score ? "●" : "○"}
            </span>
          ))}
        </div>
      </div>
      {comment && <p className="text-xs text-muted-foreground">{comment}</p>}
    </div>
  );
}

export function MathsWorkingFeedbackModal({
  isOpen,
  onClose,
  feedback,
  bonusXp,
  workedSolutionType,
}: MathsWorkingFeedbackModalProps) {
  const ratingEmoji =
    feedback.overall_rating === "Fantastic!" ? "🌟" :
    feedback.overall_rating === "Great Work!" ? "⭐" :
    feedback.overall_rating === "Good Effort!" ? "👍" : "💪";

  const isChart = workedSolutionType === "chart";

  const criteria = isChart
    ? [
        { label: "Correct Answer", score: feedback.correct_answer },
        { label: "Chart Accuracy & Labels", score: feedback.clear_working },
        { label: "Correct Method", score: feedback.correct_method },
        { label: "Neat & Readable", score: feedback.neat_layout },
      ]
    : [
        { label: "Correct Final Answer", score: feedback.correct_answer },
        { label: "Clear Working Steps", score: feedback.clear_working },
        { label: "Correct Method/Strategy", score: feedback.correct_method },
        { label: "Neat & Readable Layout", score: feedback.neat_layout },
      ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="text-3xl">{ratingEmoji}</span>
            <span>{feedback.overall_rating}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scores */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                📐 {isChart ? "Chart Assessment" : "Working Assessment"}
              </p>
              <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {feedback.composite_score.toFixed(1)}/5
              </span>
            </div>
            {criteria.map((c) => (
              <ScoreBar key={c.label} label={c.label} score={c.score} />
            ))}
          </div>

          {/* Bonus XP */}
          {bonusXp > 0 && (
            <div className="bg-ochre/10 border border-ochre/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">+{bonusXp} Bonus XP! 🎉</p>
              <p className="text-sm text-muted-foreground">Awarded for showing your working</p>
            </div>
          )}

          {/* Feedback */}
          <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-xl p-4">
            <p className="text-foreground">{feedback.feedback}</p>
          </div>

          {/* Annotations */}
          {feedback.annotations && feedback.annotations.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-sm text-foreground">Detailed Feedback:</p>
              {feedback.annotations.map((ann, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm ${
                    ann.type === "praise" || ann.type === "correct"
                      ? "bg-eucalyptus/10 border border-eucalyptus/20"
                      : "bg-sky/10 border border-sky/20"
                  }`}
                >
                  <p className="font-medium">
                    {ann.type === "praise" || ann.type === "correct" ? "✅" : "💡"}{" "}
                    <span className="font-mono text-xs bg-muted px-1 rounded">{ann.originalText}</span>
                  </p>
                  {ann.suggestion && <p className="text-muted-foreground mt-1">→ {ann.suggestion}</p>}
                  <p className="text-foreground/80 mt-1">{ann.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Transcribed working */}
          {feedback.transcribed_working && (
            <div className="border-t border-border pt-4">
              <p className="font-semibold text-sm text-foreground mb-2">Your Working (transcribed):</p>
              <div className="bg-muted/30 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap">
                {feedback.transcribed_working}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full h-12 text-lg font-bold rounded-xl gap-2">
            <CheckCircle className="w-5 h-5" />
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
