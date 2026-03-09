import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnnotatedWriting } from "@/components/AnnotatedWriting";
import { Camera, PenTool, CheckCircle } from "lucide-react";

interface WritingAnnotation {
  originalText: string;
  suggestion: string;
  type: "spelling" | "grammar" | "punctuation" | "style" | "praise";
  comment: string;
}

interface SubmissionDetail {
  id: string;
  submission_type: string;
  subject_name: string | null;
  topic_name: string | null;
  question: string | null;
  student_text: string | null;
  image_path: string | null;
  content_score: number | null;
  content_max_score: number | null;
  content_feedback: string | null;
  content_overall_rating: string | null;
  strengths: string[];
  improvements: string[];
  annotations: WritingAnnotation[];
  letter_formation: number | null;
  spacing_sizing: number | null;
  presentation: number | null;
  composite_score: number | null;
  letter_formation_comment: string | null;
  spacing_sizing_comment: string | null;
  presentation_comment: string | null;
  created_at: string;
  signedUrl?: string;
}

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionDetail | null;
}

function DotScore({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-sm ${i < score ? "text-primary" : "text-muted-foreground/30"}`}>
          {i < score ? "●" : "○"}
        </span>
      ))}
    </div>
  );
}

export function SubmissionDetailModal({ isOpen, onClose, submission }: SubmissionDetailModalProps) {
  if (!submission) return null;

  const ratingEmoji =
    submission.content_overall_rating === "Fantastic!" ? "🌟" :
    submission.content_overall_rating === "Great Work!" ? "⭐" :
    submission.content_overall_rating === "Good Effort!" ? "👍" : "💪";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

  const hasHandwriting = submission.submission_type === "handwritten" && submission.composite_score != null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="text-3xl">{ratingEmoji}</span>
            <div className="flex-1 min-w-0">
              <span>{submission.content_overall_rating || "Submission"}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                {submission.subject_name} · {submission.topic_name} · {formatDate(submission.created_at)}
              </p>
            </div>
            <span className="text-sm font-medium text-primary">
              +{submission.content_score || 0}/{submission.content_max_score || 0} XP
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question */}
          {submission.question && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Question</p>
              <p className="text-sm text-foreground">{submission.question}</p>
            </div>
          )}

          {/* Handwriting photo */}
          {hasHandwriting && submission.signedUrl && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={submission.signedUrl}
                alt="Handwriting submission"
                className="w-full max-h-64 object-contain bg-muted/30"
              />
            </div>
          )}

          {/* Handwriting Assessment */}
          {hasHandwriting && (
            <div className="bg-sky/10 border border-sky/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  ✍️ Handwriting
                </p>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {Number(submission.composite_score).toFixed(1)}/5
                </span>
              </div>
              {[
                { label: "Letter Formation", score: submission.letter_formation!, comment: submission.letter_formation_comment },
                { label: "Spacing & Sizing", score: submission.spacing_sizing!, comment: submission.spacing_sizing_comment },
                { label: "Presentation", score: submission.presentation!, comment: submission.presentation_comment },
              ].map((criterion) => (
                <div key={criterion.label} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{criterion.label}</p>
                    {criterion.comment && <p className="text-xs text-muted-foreground">{criterion.comment}</p>}
                  </div>
                  <DotScore score={criterion.score} />
                </div>
              ))}
            </div>
          )}

          {/* Overall Feedback */}
          {submission.content_feedback && (
            <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-xl p-4">
              <p className="text-foreground text-sm">{submission.content_feedback}</p>
            </div>
          )}

          {/* Strengths */}
          {submission.strengths.length > 0 && (
            <div>
              <p className="font-semibold text-sm text-eucalyptus mb-2">✓ What you did well:</p>
              <ul className="text-sm text-foreground/80 list-disc list-inside space-y-1">
                {submission.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {submission.improvements.length > 0 && (
            <div>
              <p className="font-semibold text-sm text-sky mb-2">💡 Next time, try:</p>
              <ul className="text-sm text-foreground/80 list-disc list-inside space-y-1">
                {submission.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Annotated Writing */}
          {submission.student_text && (
            <div className="border-t border-border pt-4">
              <p className="font-semibold text-sm text-foreground mb-3">
                {hasHandwriting ? "Transcribed Writing with Feedback:" : "Your Writing with Feedback:"}
              </p>
              <AnnotatedWriting
                originalText={submission.student_text}
                annotations={submission.annotations || []}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full h-12 text-lg font-bold rounded-xl gap-2">
            <CheckCircle className="w-5 h-5" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { SubmissionDetail };
