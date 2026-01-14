import { useMemo } from "react";

interface WritingAnnotation {
  originalText: string;
  suggestion: string;
  type: "spelling" | "grammar" | "punctuation" | "style" | "praise";
  comment: string;
}

interface AnnotatedWritingProps {
  originalText: string;
  annotations: WritingAnnotation[];
}

export function AnnotatedWriting({ originalText, annotations }: AnnotatedWritingProps) {
  const annotatedContent = useMemo(() => {
    if (!annotations || annotations.length === 0) {
      return [{ text: originalText, annotation: null }];
    }

    // Sort annotations by their position in the text
    const sortedAnnotations = [...annotations]
      .map(ann => ({
        ...ann,
        index: originalText.toLowerCase().indexOf(ann.originalText.toLowerCase())
      }))
      .filter(ann => ann.index !== -1)
      .sort((a, b) => a.index - b.index);

    if (sortedAnnotations.length === 0) {
      return [{ text: originalText, annotation: null }];
    }

    const segments: { text: string; annotation: WritingAnnotation | null }[] = [];
    let lastIndex = 0;

    for (const ann of sortedAnnotations) {
      // Avoid overlapping annotations
      if (ann.index < lastIndex) continue;

      // Add text before this annotation
      if (ann.index > lastIndex) {
        segments.push({
          text: originalText.slice(lastIndex, ann.index),
          annotation: null
        });
      }

      // Add the annotated text
      segments.push({
        text: originalText.slice(ann.index, ann.index + ann.originalText.length),
        annotation: ann
      });

      lastIndex = ann.index + ann.originalText.length;
    }

    // Add remaining text
    if (lastIndex < originalText.length) {
      segments.push({
        text: originalText.slice(lastIndex),
        annotation: null
      });
    }

    return segments;
  }, [originalText, annotations]);

  const getAnnotationStyle = (type: WritingAnnotation["type"]) => {
    switch (type) {
      case "praise":
        return "bg-eucalyptus/20 border-b-2 border-eucalyptus";
      case "spelling":
        return "bg-coral/20 border-b-2 border-coral border-dashed";
      case "grammar":
        return "bg-ochre/20 border-b-2 border-ochre";
      case "punctuation":
        return "bg-sky/20 border-b-2 border-sky";
      case "style":
        return "bg-primary/20 border-b-2 border-primary";
      default:
        return "bg-muted";
    }
  };

  const getTypeIcon = (type: WritingAnnotation["type"]) => {
    switch (type) {
      case "praise": return "⭐";
      case "spelling": return "📝";
      case "grammar": return "✏️";
      case "punctuation": return "🔤";
      case "style": return "💡";
      default: return "📌";
    }
  };

  const getTypeLabel = (type: WritingAnnotation["type"]) => {
    switch (type) {
      case "praise": return "Great work!";
      case "spelling": return "Spelling";
      case "grammar": return "Grammar";
      case "punctuation": return "Punctuation";
      case "style": return "Writing tip";
      default: return "Note";
    }
  };

  return (
    <div className="space-y-4">
      {/* The annotated text */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          ✍️ Your Writing
        </h4>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {annotatedContent.map((segment, idx) => {
            if (!segment.annotation) {
              return <span key={idx}>{segment.text}</span>;
            }
            
            return (
              <span
                key={idx}
                className={`${getAnnotationStyle(segment.annotation.type)} cursor-help rounded px-0.5 transition-all hover:opacity-80`}
                title={`${getTypeIcon(segment.annotation.type)} ${segment.annotation.comment}`}
              >
                {segment.text}
              </span>
            );
          })}
        </p>
      </div>

      {/* Annotations legend */}
      {annotations && annotations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            📋 Feedback Notes
          </h4>
          <div className="space-y-2">
            {annotations.map((ann, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-sm ${
                  ann.type === "praise" 
                    ? "bg-eucalyptus/10 border border-eucalyptus/30" 
                    : "bg-muted/50 border border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{getTypeIcon(ann.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ann.type === "praise" 
                          ? "bg-eucalyptus/20 text-eucalyptus" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {getTypeLabel(ann.type)}
                      </span>
                    </div>
                    <p className="text-foreground/80 mb-1">{ann.comment}</p>
                    {ann.type !== "praise" && ann.suggestion && (
                      <div className="mt-2 p-2 bg-background rounded border border-border">
                        <span className="text-xs text-muted-foreground">Try this: </span>
                        <span className="text-foreground font-medium">{ann.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}