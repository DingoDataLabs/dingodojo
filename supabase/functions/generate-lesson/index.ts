import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evaluate } from "https://esm.sh/mathjs@13.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Curriculum & Config ──────────────────────────────────────────────

const NSW_MATHS_CURRICULUM = `
NSW Mathematics Stage 3 (Years 5 & 6) Curriculum Structure:

1. NUMBER AND ALGEBRA
- Represents Numbers (Whole Numbers): Prime/composite numbers, factors/multiples (HCF, LCM), integers (negative numbers in real contexts like temperature)
- Represents Numbers (Decimals & Percentages): Compare/order decimals to 3 decimal places, connect fractions/decimals/percentages, calculate simple percentages (10%, 25%, 50%)
- Additive Relations: Efficient strategies for adding/subtracting large numbers, word problems with budgeting/totals
- Multiplicative Relations: Multiply/divide decimals by 10/100/1000, estimation, remainders
- Partitioned Fractions: Add/subtract fractions with same/related denominators, find fraction of quantity

2. MEASUREMENT AND SPACE
- Geometric Measure (Length & Area): Unit conversion (mm, cm, m, km), perimeter of rectangles/squares, area calculation
- 2D Spatial Structure: Classify triangles (Equilateral, Isosceles, Scalene) and quadrilaterals, combine/split shapes, measure angles with protractor
- 3D Spatial Structure: Connect 3D objects to nets (prisms/pyramids), calculate volume of rectangular prisms
- Non-Spatial Measure: Convert 12/24-hour time, interpret timetables, connect mass to capacity

3. STATISTICS AND PROBABILITY
- Data: Interpret side-by-side column graphs and divided bar graphs, evaluate misleading graphs
- Chance: List outcomes, represent probability as fraction/decimal/percentage
`;

const getDifficultyLevel = (topicXp: number) => {
  if (topicXp < 50) return { level: "Beginning", description: "introducing core concepts with concrete examples", multiplier: 1 };
  if (topicXp < 150) return { level: "Developing", description: "building understanding with varied examples", multiplier: 1.2 };
  if (topicXp < 300) return { level: "Consolidating", description: "applying concepts to new situations", multiplier: 1.5 };
  if (topicXp < 500) return { level: "Extending", description: "tackling more complex problems and connections", multiplier: 1.8 };
  return { level: "Mastering", description: "challenging problems requiring deeper reasoning", multiplier: 2 };
};

// ── Input Validation ─────────────────────────────────────────────────

const validateInput = (data: unknown): { valid: boolean; error?: string; data?: {
  topicName: string; topicEmoji?: string; gradeLevel?: string; topicXp?: number; subjectSlug?: string;
}} => {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request body' };
  const body = data as Record<string, unknown>;
  if (typeof body.topicName !== 'string' || body.topicName.length < 1) return { valid: false, error: 'topicName is required' };
  if (body.topicName.length > 200) return { valid: false, error: 'topicName exceeds maximum length' };
  if (body.topicEmoji !== undefined && (typeof body.topicEmoji !== 'string' || body.topicEmoji.length > 10)) return { valid: false, error: 'Invalid topicEmoji' };
  if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 50)) return { valid: false, error: 'Invalid gradeLevel' };
  if (body.subjectSlug !== undefined && (typeof body.subjectSlug !== 'string' || body.subjectSlug.length > 50)) return { valid: false, error: 'Invalid subjectSlug' };
  if (body.topicXp !== undefined && (typeof body.topicXp !== 'number' || body.topicXp < 0 || body.topicXp > 100000)) return { valid: false, error: 'Invalid topicXp' };
  return { valid: true, data: {
    topicName: body.topicName as string, topicEmoji: body.topicEmoji as string | undefined,
    gradeLevel: body.gradeLevel as string | undefined, topicXp: body.topicXp as number | undefined,
    subjectSlug: body.subjectSlug as string | undefined,
  }};
};

// ── Calculator ───────────────────────────────────────────────────────

function safeCalculate(expression: string): { success: boolean; result?: number; error?: string } {
  try {
    const result = evaluate(expression);
    return { success: true, result: Number(result) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Invalid expression' };
  }
}

// ── Simple LLM Call (no tool calling) ────────────────────────────────

async function callLLM(
  apiKey: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.7,
      max_tokens: 5000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
    const text = await response.text();
    console.error(`AI gateway error ${response.status}:`, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  return content;
}

// ── Subscription Check ───────────────────────────────────────────────

async function validateMissionAccess(supabaseClient: any, userId: string): Promise<{ allowed: boolean; error?: string }> {
  const { data: profile, error } = await supabaseClient
    .from('profiles').select('subscription_tier').eq('user_id', userId).single();
  if (error) return { allowed: false, error: 'Failed to verify subscription status' };
  return { allowed: true };
}

// ── Math Question Detection ──────────────────────────────────────────

function isMathQuestion(question: any): boolean {
  if (!question || typeof question !== 'object') return false;
  const text = `${question.question || ''} ${(question.options || []).join(' ')}`.toLowerCase();
  const mathPatterns = [
    /\d+\s*[\+\-\*\/×÷]\s*\d+/,
    /\d+\/\d+/,
    /\d+\.\d+/,
    /\d+\s*%/,
    /how many|how much|total|sum|difference|product|quotient|remainder/,
    /area|perimeter|volume|length|width|height|distance/,
    /calculate|solve|work out|find the|what is/,
    /greater|less|equal|compare/,
    /multiply|divide|add|subtract/,
    /fraction|decimal|percentage|ratio/,
    /average|mean|median/,
    /angle|degree/,
    /convert|conversion/,
  ];
  return mathPatterns.some(p => p.test(text));
}

// ── Agent 2: Two-expression comparison verification ──────────────────

async function verifyMathQuestion(apiKey: string, q: any): Promise<{ correct: boolean; suggestedAnswer?: number }> {
  // Agent 1 should have included calculation_expression. If not, skip.
  const agent1Expr = q.calculation_expression;
  if (!agent1Expr) {
    return { correct: true }; // No expression provided, skip verification
  }

  // Agent 2: independently extract the expression from the question text
  const extractPrompt = `You are a math verification agent. Read this question carefully and determine the mathematical expression needed to solve it.

QUESTION: ${q.question}
OPTIONS:
${q.options.map((o: string, i: number) => `${i}: ${o}`).join('\n')}

Think step by step about what the question is ACTUALLY asking. For example:
- "eats half of his pizza" means multiply by 1/2
- "shared equally among 5 friends" means divide by 5
- "ran 2 laps then 3 more" means 2 + 3

Respond with ONLY valid JSON:
{"expression": "the math expression, e.g. 3/4 + 1/2"}

If the question is conceptual (no calculation needed), respond: {"expression": null}`;

  try {
    const extractResult = await callLLM(apiKey, [
      { role: "system", content: "Extract math expressions from word problems. Reply ONLY with JSON, no markdown." },
      { role: "user", content: extractPrompt },
    ]);

    let jsonStr = extractResult.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    const jsonMatch = jsonStr.match(/\{[^}]+\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    const extracted = JSON.parse(jsonStr);

    if (!extracted.expression) {
      return { correct: true }; // Agent 2 says conceptual, skip
    }

    const agent2Expr = extracted.expression;

    // Evaluate both expressions with mathjs
    const calc1 = safeCalculate(agent1Expr);
    const calc2 = safeCalculate(agent2Expr);

    if (!calc1.success) {
      console.log(`Agent 1 expression "${agent1Expr}" failed to evaluate: ${calc1.error}`);
      // Fall back: if Agent 2's expression works, use that
      if (calc2.success) {
        console.log(`Using Agent 2 expression "${agent2Expr}" = ${calc2.result}`);
        return verifyAnswerAgainstOptions(q, calc2.result!);
      }
      return { correct: true }; // Neither evaluates, trust Agent 1
    }

    if (!calc2.success) {
      console.log(`Agent 2 expression "${agent2Expr}" failed to evaluate: ${calc2.error}. Using Agent 1's.`);
      return verifyAnswerAgainstOptions(q, calc1.result!);
    }

    // Both expressions evaluated — compare results
    const match = Math.abs(calc1.result! - calc2.result!) < 0.001;
    if (match) {
      console.log(`Expressions agree: "${agent1Expr}" = "${agent2Expr}" = ${calc1.result}`);
      return verifyAnswerAgainstOptions(q, calc1.result!);
    }

    // DISAGREEMENT: agents interpreted the word problem differently
    console.log(`❌ Expression mismatch! Agent1: "${agent1Expr}"=${calc1.result}, Agent2: "${agent2Expr}"=${calc2.result}`);
    return { correct: false };
  } catch (e) {
    console.error("Verification agent error:", e);
    return { correct: true };
  }
}

// Check if the correct_answer option matches the calculated value
function verifyAnswerAgainstOptions(q: any, calcValue: number): { correct: boolean; suggestedAnswer?: number } {
  const correctOption = q.options[q.correct_answer];
  
  // Try numeric comparison on the marked correct option
  const optionNum = parseFloat(correctOption.replace(/[^0-9.\-\/]/g, ''));
  if (!isNaN(optionNum) && Math.abs(optionNum - calcValue) < 0.001) {
    return { correct: true };
  }

  // Check if option text contains the result
  const resultStr = String(calcValue);
  if (correctOption.includes(resultStr)) {
    return { correct: true };
  }

  // Try fraction representation: e.g. calcValue=0.75 → check for "3/4"
  // Search all options for a match
  for (let i = 0; i < q.options.length; i++) {
    const oNum = parseFloat(q.options[i].replace(/[^0-9.\-\/]/g, ''));
    if (!isNaN(oNum) && Math.abs(oNum - calcValue) < 0.001) {
      if (i !== q.correct_answer) {
        console.log(`Answer fix: calculated ${calcValue}, matches option ${i}, not ${q.correct_answer}`);
        return { correct: false, suggestedAnswer: i };
      }
      return { correct: true };
    }
    // Try evaluating option as expression (e.g. "3/4")
    const optCalc = safeCalculate(q.options[i].trim());
    if (optCalc.success && Math.abs(optCalc.result! - calcValue) < 0.001) {
      if (i !== q.correct_answer) {
        console.log(`Answer fix: calculated ${calcValue}, option "${q.options[i]}" evaluates to match, not option ${q.correct_answer}`);
        return { correct: false, suggestedAnswer: i };
      }
      return { correct: true };
    }
  }

  return { correct: true }; // Can't match to options, trust Agent 1
}

// ── Question Regeneration ────────────────────────────────────────────

async function regenerateMathQuestion(apiKey: string, original: any, context: string): Promise<any | null> {
  const prompt = `Generate a replacement multiple-choice math question about "${context}". The previous question had an incorrect answer.

Previous question (DO NOT reuse): ${original.question}

Return ONLY valid JSON (no markdown):
{
  "question": "New question text",
  "options": ["A", "B", "C", "D"],
  "correct_answer": 0,
  "calculation_expression": "the math expression needed to solve this, e.g. 3/4 + 1/2",
  "hint": "Guiding hint",
  "explanation": "Why the answer is correct"
}

CRITICAL: 
- Include a "calculation_expression" field with the mathematical expression derived from your question.
- Use the calculate tool mentally: make sure the expression evaluates to match the correct option.
- Make sure the correct_answer index points to the actually correct option.`;

  try {
    const result = await callLLM(apiKey, [
      { role: "system", content: "Generate math questions with calculation expressions. Reply ONLY with JSON, no markdown." },
      { role: "user", content: prompt },
    ]);

    let jsonStr = result.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Regeneration error:", e);
    return null;
  }
}

// ── Validate & Fix All Math in Lesson ────────────────────────────────

async function validateAndFixLesson(apiKey: string, lesson: any, topicName: string): Promise<any> {
  const validatedLesson = { ...lesson };

  if (validatedLesson.sections) {
    for (let i = 0; i < validatedLesson.sections.length; i++) {
      const section = validatedLesson.sections[i];
      if (section.type !== 'check') continue;
      if (!isMathQuestion(section)) continue;

      console.log(`Verifying section check ${i}: "${section.question?.substring(0, 60)}..."`);
      const result = await verifyMathQuestion(apiKey, section);

      if (!result.correct) {
        console.log(`❌ Section check ${i} failed verification. Regenerating...`);
        for (let attempt = 0; attempt < 2; attempt++) {
          const replacement = await regenerateMathQuestion(apiKey, section, topicName);
          if (!replacement) continue;
          const recheck = await verifyMathQuestion(apiKey, replacement);
          if (recheck.correct) {
            console.log(`✅ Replacement verified on attempt ${attempt + 1}`);
            validatedLesson.sections[i] = { ...section, ...replacement };
            break;
          }
          if (attempt === 1) {
            console.log(`⚠️ Dropping unverifiable check at section ${i}`);
            validatedLesson.sections[i] = {
              type: "learn", title: "Quick Note",
              content: section.explanation || "Let's continue to the next part!",
            };
          }
        }
      } else {
        console.log(`✅ Section check ${i} verified`);
      }
    }
  }

  if (validatedLesson.final_challenge?.questions) {
    const validQuestions: any[] = [];
    for (let i = 0; i < validatedLesson.final_challenge.questions.length; i++) {
      const q = validatedLesson.final_challenge.questions[i];
      if (q.type === 'free_text' || !isMathQuestion(q)) {
        validQuestions.push(q);
        continue;
      }

      console.log(`Verifying challenge Q${i}: "${q.question?.substring(0, 60)}..."`);
      const result = await verifyMathQuestion(apiKey, q);

      if (!result.correct) {
        console.log(`❌ Challenge Q${i} failed. Regenerating...`);
        let fixed = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          const replacement = await regenerateMathQuestion(apiKey, q, topicName);
          if (!replacement) continue;
          const recheck = await verifyMathQuestion(apiKey, replacement);
          if (recheck.correct) {
            console.log(`✅ Challenge replacement verified on attempt ${attempt + 1}`);
            validQuestions.push({ ...q, ...replacement });
            fixed = true;
            break;
          }
        }
        if (!fixed) {
          console.log(`⚠️ Dropping unverifiable challenge question ${i}`);
        }
      } else {
        console.log(`✅ Challenge Q${i} verified`);
        validQuestions.push(q);
      }
    }
    validatedLesson.final_challenge.questions = validQuestions;
  }

  return validatedLesson;
}

// ── Build Prompts ────────────────────────────────────────────────────

function buildPrompts(topicName: string, topicEmoji: string, yearLevel: string, difficulty: any, topicXp: number, subjectSlug?: string) {
  const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";
  const isEnglish = subjectSlug === "english";

  const wordLimits: Record<string, { min: number; max: number }> = {
    "Beginning": { min: 50, max: 100 }, "Developing": { min: 100, max: 150 },
    "Consolidating": { min: 150, max: 200 }, "Extending": { min: 200, max: 250 },
    "Mastering": { min: 250, max: 300 },
  };
  const wl = wordLimits[difficulty.level] || { min: 100, max: 150 };

  const systemPrompt = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3).
Create engaging, age-appropriate educational content that builds understanding progressively.
Use Australian English spelling (e.g., "colour" not "color", "favourite" not "favorite").
Include Australian references and examples where appropriate.
Keep language simple but not condescending.

${isMaths ? NSW_MATHS_CURRICULUM : ""}

CURRENT STUDENT PERFORMANCE LEVEL: ${difficulty.level}
This means you should be ${difficulty.description}.

${isMaths ? `CRITICAL: For EVERY question that involves a calculation:
1. Double-check all arithmetic carefully
2. Include a "calculation_expression" field with the pure math expression needed to solve the question (e.g. "3/4 + 1/2", "12 * 1/3", "5/6 - 1/3")
3. Make sure the correct_answer index corresponds to the actually correct option
4. Show your working in the explanation field` : ""}
${isEnglish ? "IMPORTANT: Include at least one FREE-TEXT writing question in the final challenge." : ""}`;

  const freeTextBlock = isEnglish ? `
FOR ENGLISH LESSONS - FREE-TEXT WRITING QUESTIONS:
Include at least ONE free-text question:
{
  "type": "free_text",
  "question": "Write a short ${wl.min}-${wl.max} word story/paragraph about [prompt]",
  "assessment_criteria": ["Clear structure", "Descriptive language", "Correct spelling", "Creative ideas"],
  "example_elements": ["setting description", "character feelings", "dialogue", "sensory details"],
  "min_words": ${wl.min}, "max_words": ${wl.max},
  "hint": "Think about [guidance]",
  "explanation": "This writing task helps you practise [skill]",
  "points": 50
}` : '';

  const userPrompt = `Create an interactive lesson for "${topicName}" for a ${yearLevel} Australian student (NSW Stage 3).
Student XP: ${topicXp}, Level: "${difficulty.level}" — ${difficulty.description}.

IMPORTANT: This lesson must be INTERACTIVE with checkpoints to verify understanding.
${freeTextBlock}
Return ONLY valid JSON (no markdown, no code blocks, no backticks):
{
  "title": "Engaging title",
  "emoji": "${topicEmoji}",
  "difficulty_level": "${difficulty.level}",
  "fun_fact": "Surprising fact related to topic",
  "sections": [
    { "type": "learn", "title": "Section title", "content": "Learning content (2-3 paragraphs)" },
    { "type": "check", "question_type": "multiple_choice", "question": "Comprehension check", "options": ["A", "B", "C", "D"], "correct_answer": 0, "calculation_expression": "math expression if applicable", "hint": "Guiding hint", "explanation": "Why correct" },
    { "type": "learn", "title": "Building on that...", "content": "More content" },
    { "type": "check", "question_type": "multiple_choice", "question": "Another check", "options": ["A", "B", "C", "D"], "correct_answer": 0, "hint": "Hint", "explanation": "Explanation" }
  ],
  "final_challenge": {
    "title": "Challenge Time!",
    "description": "Brief intro",
    "questions": [
      { "type": "multiple_choice", "question": "Challenging question", "options": ["A", "B", "C", "D"], "correct_answer": 0, "hint": "Hint", "explanation": "Explanation", "points": 20 },
      { "type": "multiple_choice", "question": "Another challenge", "options": ["A", "B", "C", "D"], "correct_answer": 0, "hint": "Hint", "explanation": "Explanation", "points": 30 }
    ]
  },
  "total_xp": 50
}

Guidelines:
- 2-3 learning sections, each followed by a comprehension check
- Final challenge: 2-3 harder questions
- Hints guide thinking, don't reveal answers
- Use Australian contexts: km not miles, dollars not pounds, cricket/AFL
- Progressive difficulty within the module
${isEnglish ? '- Include at least one free-text writing question in final_challenge' : ''}
${isMaths ? '- Double-check all math: make sure correct_answer index matches the right option' : ''}`;

  return { systemPrompt, userPrompt, isMaths };
}

// ── Main Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    const missionAccess = await validateMissionAccess(supabaseClient, userId);
    if (!missionAccess.allowed) {
      return new Response(JSON.stringify({ error: missionAccess.error, code: 'LIMIT_REACHED' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validation = validateInput(rawBody);
    if (!validation.valid || !validation.data) {
      return new Response(JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { topicName, topicEmoji, gradeLevel, topicXp, subjectSlug } = validation.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const difficulty = getDifficultyLevel(topicXp || 0);
    const yearLevel = gradeLevel || "Year 5";
    const { systemPrompt, userPrompt, isMaths } = buildPrompts(
      topicName, topicEmoji || '📚', yearLevel, difficulty, topicXp || 0, subjectSlug
    );

    // ── Agent 1: Generate lesson ──
    console.log(`Agent 1: Generating lesson for "${topicName}" (math validation: ${isMaths})`);
    const content = await callLLM(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let lessonContent;
    try {
      let jsonStr = content.trim();
      // Strip markdown code fences
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
      // Extract JSON object
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
      lessonContent = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error("Failed to parse lesson JSON. Raw (first 500):", content.substring(0, 500));
      throw new Error("Failed to parse lesson content");
    }

    // ── Agent 2: Validate math answers using mathjs ──
    if (isMaths) {
      console.log("Agent 2: Validating math answers with mathjs...");
      lessonContent = await validateAndFixLesson(LOVABLE_API_KEY, lessonContent, topicName);
    }

    return new Response(
      JSON.stringify({ success: true, content: lessonContent, difficultyLevel: difficulty.level }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating lesson:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (msg === "CREDITS_EXHAUSTED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "An error occurred while processing your request", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
