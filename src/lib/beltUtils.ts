import { getMasteryLevel, type MasteryLevel } from "@/lib/progressUtils";

interface SubjectBeltInput {
  subjectId: string;
  topicIds: string[];
  progressMap: Record<string, number>; // topicId -> xp
}

/**
 * Calculate average XP across topics for a subject, then return belt level
 */
export function getSubjectBelt(input: SubjectBeltInput): { level: MasteryLevel; avgXp: number; topicCount: number } {
  const { topicIds, progressMap } = input;
  if (topicIds.length === 0) return { level: getMasteryLevel(0), avgXp: 0, topicCount: 0 };

  const totalXp = topicIds.reduce((sum, id) => sum + (progressMap[id] || 0), 0);
  const avgXp = Math.round(totalXp / topicIds.length);

  return { level: getMasteryLevel(avgXp), avgXp, topicCount: topicIds.length };
}

/**
 * Calculate overall belt across multiple subjects (English + Maths)
 */
export function getOverallBelt(
  subjects: { id: string; slug: string }[],
  topics: { id: string; subject_id: string }[],
  progressMap: Record<string, number>,
  prioritySlugs: string[] = ["english", "maths"]
): { level: MasteryLevel; avgXp: number; topicCount: number } {
  const prioritySubjectIds = subjects
    .filter(s => prioritySlugs.includes(s.slug))
    .map(s => s.id);

  const priorityTopics = topics.filter(t => prioritySubjectIds.includes(t.subject_id));
  if (priorityTopics.length === 0) return { level: getMasteryLevel(0), avgXp: 0, topicCount: 0 };

  const totalXp = priorityTopics.reduce((sum, t) => sum + (progressMap[t.id] || 0), 0);
  const avgXp = Math.round(totalXp / priorityTopics.length);

  return { level: getMasteryLevel(avgXp), avgXp, topicCount: priorityTopics.length };
}
