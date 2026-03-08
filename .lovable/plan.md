

# Chunked Lesson Generation with Progressive Loading

## Overview
Split the single `generate-lesson` edge function call into 3 sequential calls, showing the lesson scaffold to the user immediately after Call 1 while Calls 2 and 3 run in the background.

## Architecture

```text
User clicks "Start Mission"
  │
  ├─ Call 1: Generate scaffold (title, fun_fact, learn sections)
  │     → Immediately render learn sections to user
  │     → User starts reading
  │
  ├─ Call 2: Generate check questions (for each learn section)
  │     → Inject into sections as they arrive
  │     → mathjs correction applied server-side
  │
  └─ Call 3: Generate final challenge questions
        → Inject into lesson state
        → mathjs correction applied server-side
```

## Edge Function Changes (`supabase/functions/generate-lesson/index.ts`)

Add a `phase` parameter to the request body. The function handles 3 phases:

- **Phase 1 (`scaffold`)**: Smaller prompt asking for only `title`, `emoji`, `difficulty_level`, `fun_fact`, and `sections` array with only `"learn"` type entries (no checks). Low token output (~1500 tokens). Returns the scaffold JSON.

- **Phase 2 (`checks`)**: Receives the scaffold's learn section titles/content as context. Generates one `"check"` question per learn section with `calculation_expression` for maths. Server-side `correctMathAnswers()` applied before returning. Returns array of check questions.

- **Phase 3 (`challenge`)**: Receives the topic context. Generates 2-3 final challenge questions with `calculation_expression` for maths. Server-side `correctMathAnswers()` applied. Returns the `final_challenge` object.

Auth and subscription validation only run on Phase 1. Phases 2 and 3 accept a lightweight token check only.

## Frontend Changes (`src/pages/TrainingSession.tsx`)

1. **`generateLesson` function**: Refactor to call Phase 1 first, set `lessonContent` with placeholder empty checks and challenge, then fire Phases 2 and 3 sequentially in the background.

2. **New state**: Add `questionsLoading: boolean` to track whether check/challenge questions are still being fetched.

3. **Progressive rendering**: The user sees learn sections immediately. When they reach a check section that hasn't loaded yet, show a brief skeleton/spinner. By the time they finish reading the first learn section (~30-60 seconds), the checks will have arrived.

4. **Merge logic**: When Phase 2 returns, interleave check questions after their corresponding learn sections. When Phase 3 returns, attach the final challenge.

5. **DB caching**: Only save to `generated_modules` once all 3 phases complete (full lesson assembled).

## Benefits
- User sees content in ~2-3 seconds instead of ~5-8 seconds
- Each LLM call uses ~1500-2000 tokens (well under the 5000 limit) -- no truncation risk
- Rate limits less likely since calls are spaced out by the user's reading time
- mathjs server-side correction still applies to all math questions

