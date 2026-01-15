import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnnotatedWriting } from "@/components/AnnotatedWriting";
import { CheckCircle } from "lucide-react";

interface WritingAnnotation {
  originalText: string;
  suggestion: string;
  type: "spelling" | "grammar" | "punctuation" | "style" | "praise";
  comment: string;
}

interface FreeTextFeedback {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  overallRating: string;
  annotations?: WritingAnnotation[];
}

interface WritingFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: FreeTextFeedback;
  studentResponse: string;
}

export function WritingFeedbackModal({ 
  isOpen, 
  onClose, 
  feedback, 
  studentResponse 
}: WritingFeedbackModalProps) {
  const ratingEmoji = 
    feedback.overallRating === "Fantastic!" ? "🌟" :
    feedback.overallRating === "Great Work!" ? "⭐" :
    feedback.overallRating === "Good Effort!" ? "👍" : "💪";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="text-3xl">{ratingEmoji}</span>
            <span>{feedback.overallRating}</span>
            <span className="text-sm font-medium text-primary ml-auto">
              +{feedback.score}/{feedback.maxScore} XP
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Feedback */}
          <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-xl p-4">
            <p className="text-foreground">{feedback.feedback}</p>
          </div>

          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <div>
              <p className="font-semibold text-sm text-eucalyptus mb-2">✓ What you did well:</p>
              <ul className="text-sm text-foreground/80 list-disc list-inside space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements.length > 0 && (
            <div>
              <p className="font-semibold text-sm text-sky mb-2">💡 Next time, try:</p>
              <ul className="text-sm text-foreground/80 list-disc list-inside space-y-1">
                {feedback.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Annotated Writing */}
          <div className="border-t border-border pt-4">
            <p className="font-semibold text-sm text-foreground mb-3">Your Writing with Feedback:</p>
            <AnnotatedWriting
              originalText={studentResponse}
              annotations={feedback.annotations || []}
            />
          </div>
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
