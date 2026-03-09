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

type Phase = "scaffold" | "checks" | "challenge";

interface ValidatedInput {
  topicName: string;
  topicEmoji?: string;
  gradeLevel?: string;
  topicXp?: number;
  subjectSlug?: string;
  phase?: Phase;
  scaffoldSections?: { title: string; content: string }[];
}

const validateInput = (data: unknown): { valid: boolean; error?: string; data?: ValidatedInput } => {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request body' };
  const body = data as Record<string, unknown>;
  if (typeof body.topicName !== 'string' || body.topicName.length < 1) return { valid: false, error: 'topicName is required' };
  if (body.topicName.length > 200) return { valid: false, error: 'topicName exceeds maximum length' };
  if (body.topicEmoji !== undefined && (typeof body.topicEmoji !== 'string' || body.topicEmoji.length > 10)) return { valid: false, error: 'Invalid topicEmoji' };
  if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 50)) return { valid: false, error: 'Invalid gradeLevel' };
  if (body.subjectSlug !== undefined && (typeof body.subjectSlug !== 'string' || body.subjectSlug.length > 50)) return { valid: false, error: 'Invalid subjectSlug' };
  if (body.topicXp !== undefined && (typeof body.topicXp !== 'number' || body.topicXp < 0 || body.topicXp > 100000)) return { valid: false, error: 'Invalid topicXp' };
  
  const phase = (body.phase as string) || "scaffold";
  if (!["scaffold", "checks", "challenge"].includes(phase)) return { valid: false, error: 'Invalid phase' };

  return {
    valid: true,
    data: {
      topicName: body.topicName as string,
      topicEmoji: body.topicEmoji as string | undefined,
      gradeLevel: body.gradeLevel as string | undefined,
      topicXp: body.topicXp as number | undefined,
      subjectSlug: body.subjectSlug as string | undefined,
      phase: phase as Phase,
      scaffoldSections: body.scaffoldSections as { title: string; content: string }[] | undefined,
    },
  };
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

// ── Simple LLM Call ──────────────────────────────────────────────────

async function callLLM(
  apiKey: string,
  messages: { role: string; content: string }[],
  maxTokens = 3000,
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
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

async function validateMissionAccess(supabaseClient: any, userId: string, subjectSlug?: string): Promise<{ allowed: boolean; error?: string }> {
  const { data: profile, error } = await supabaseClient
    .from('profiles').select('subscription_tier').eq('user_id', userId).single();
  if (error) return { allowed: false, error: 'Failed to verify subscription status' };

  if (profile.subscription_tier !== 'champion') {
    const EXPLORER_SUBJECTS = ['english', 'maths', 'mathematics'];
    if (subjectSlug && !EXPLORER_SUBJECTS.includes(subjectSlug)) {
      return { allowed: false, error: 'Champion subscription required for this subject.' };
    }
  }

  return { allowed: true };
}

// ── Server-side Math Correction ──────────────────────────────────────

function findMatchingOption(options: string[], calcValue: number): number | null {
  for (let i = 0; i < options.length; i++) {
    const opt = options[i].trim();
    const optCalc = safeCalculate(opt);
    if (optCalc.success && Math.abs(optCalc.result! - calcValue) < 0.001) return i;
    const numMatch = opt.match(/-?[\d.]+/);
    if (numMatch) {
      const oNum = parseFloat(numMatch[0]);
      if (!isNaN(oNum) && Math.abs(oNum - calcValue) < 0.001) return i;
    }
  }
  return null;
}

function correctMathQuestions(questions: any[]): any[] {
  let fixed = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || !q.calculation_expression || !q.options) continue;
    const calc = safeCalculate(q.calculation_expression);
    if (!calc.success) { console.log(`⚠️ Q${i}: couldn't evaluate "${q.calculation_expression}"`); continue; }
    const matchIdx = findMatchingOption(q.options, calc.result!);
    if (matchIdx !== null && matchIdx !== q.correct_answer) {
      console.log(`🔧 Q${i}: corrected answer from ${q.correct_answer} to ${matchIdx} (calc=${calc.result})`);
      q.correct_answer = matchIdx;
      fixed++;
    }
  }
  console.log(`Math correction: ${fixed} answer(s) fixed`);
  return questions;
}

// ── Phase-specific Prompt Builders ───────────────────────────────────

function buildScaffoldPrompt(topicName: string, topicEmoji: string, yearLevel: string, difficulty: any, subjectSlug?: string) {
  const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";

  const system = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3).
Use Australian English spelling. Include Australian references where appropriate.
${isMaths ? NSW_MATHS_CURRICULUM : ""}
CURRENT STUDENT LEVEL: ${difficulty.level} — ${difficulty.description}.`;

  const user = `Create a lesson SCAFFOLD for "${topicName}" (${topicEmoji}) for ${yearLevel}.
Student level: "${difficulty.level}".

Return ONLY valid JSON:
{
  "title": "Engaging lesson title",
  "emoji": "${topicEmoji}",
  "difficulty_level": "${difficulty.level}",
  "fun_fact": "A surprising fact about the topic",
  "sections": [
    { "type": "learn", "title": "Section 1 title", "content": "2-3 paragraphs of learning content" },
    { "type": "learn", "title": "Section 2 title", "content": "2-3 paragraphs building on section 1" },
    { "type": "learn", "title": "Section 3 title", "content": "2-3 paragraphs with deeper concepts" }
  ],
  "total_xp": 50
}

Guidelines:
- Create 2-3 learn sections that build progressively
- Use Australian contexts: km not miles, dollars not pounds, cricket/AFL
- Content should be engaging, age-appropriate, and accurate
- Do NOT include any check questions — only learning sections`;

  return { system, user };
}

function buildChecksPrompt(topicName: string, yearLevel: string, difficulty: any, scaffoldSections: { title: string; content: string }[], subjectSlug?: string) {
  const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";

  const system = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3).
Use Australian English spelling.
${isMaths ? NSW_MATHS_CURRICULUM : ""}
STUDENT LEVEL: ${difficulty.level} — ${difficulty.description}.
${isMaths ? `CRITICAL: For EVERY question involving a calculation, include a "calculation_expression" field with the pure math expression (e.g. "3/4 + 1/2"). Double-check all arithmetic.` : ""}
CRITICAL: Multiple choice questions must always have a single correct positive answer. Do not use negatively-framed questions (e.g. 'which is NOT...', 'which does NOT...', 'except', 'which of these is false'). Each question should ask what IS correct, not what is incorrect.`;

  const sectionsContext = scaffoldSections.map((s, i) => `Section ${i + 1}: "${s.title}"\n${s.content}`).join("\n\n");

  const user = `Based on these learning sections for "${topicName}":

${sectionsContext}

Create ONE comprehension check question for EACH learning section.

Return ONLY valid JSON:
{
  "checks": [
    {
      "question_type": "multiple_choice",
      "question": "Question testing section 1 understanding",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      ${isMaths ? '"calculation_expression": "math expression if applicable",' : ''}
      "hint": "Guiding hint (don't reveal answer)",
      "explanation": "Why the correct answer is right"
    }
  ]
}

Guidelines:
- One check per learning section, in order
- Hints should guide thinking, not reveal answers
- ${isMaths ? 'Include "calculation_expression" for arithmetic questions, omit for conceptual ones' : 'Test comprehension of the section content'}
- Use Australian English`;

  return { system, user };
}

function buildChallengePrompt(topicName: string, yearLevel: string, difficulty: any, subjectSlug?: string) {
  const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";
  const isEnglish = subjectSlug === "english";

  const wordLimits: Record<string, { min: number; max: number }> = {
    "Beginning": { min: 50, max: 100 }, "Developing": { min: 100, max: 150 },
    "Consolidating": { min: 150, max: 200 }, "Extending": { min: 200, max: 250 },
    "Mastering": { min: 250, max: 300 },
  };
  const wl = wordLimits[difficulty.level] || { min: 100, max: 150 };

  const system = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3).
Use Australian English spelling.
${isMaths ? NSW_MATHS_CURRICULUM : ""}
STUDENT LEVEL: ${difficulty.level} — ${difficulty.description}.
${isMaths ? `CRITICAL: For EVERY question involving a calculation, include a "calculation_expression" field. Double-check all arithmetic.` : ""}
${isEnglish ? "IMPORTANT: Include at least one FREE-TEXT writing question." : ""}
CRITICAL: Multiple choice questions must always have a single correct positive answer. Do not use negatively-framed questions (e.g. 'which is NOT...', 'which does NOT...', 'except', 'which of these is false'). Each question should ask what IS correct, not what is incorrect.`;

  const freeTextBlock = isEnglish ? `
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

  const user = `Create a FINAL CHALLENGE for "${topicName}" (${yearLevel}, level: ${difficulty.level}).
${freeTextBlock}

Return ONLY valid JSON:
{
  "final_challenge": {
    "title": "Challenge Time!",
    "description": "Brief motivational intro",
    "questions": [
      {
        "type": "multiple_choice",
        "question": "Challenging question 1",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0,
        ${isMaths ? '"calculation_expression": "math expression",' : ''}
        "hint": "Hint",
        "explanation": "Explanation",
        "points": 20
      },
      {
        "type": "multiple_choice",
        "question": "Challenging question 2",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0,
        ${isMaths ? '"calculation_expression": "math expression",' : ''}
        "hint": "Hint",
        "explanation": "Explanation",
        "points": 30
      }
    ]
  }
}

Guidelines:
- 2-3 questions that are harder than the learning checks
- Progressive difficulty within the challenge
- ${isMaths ? 'Include "calculation_expression" for arithmetic questions' : ''}
- ${isEnglish ? 'Include at least one free-text writing question' : ''}
- Use Australian English and contexts`;

  return { system, user };
}

// ── Parse JSON from LLM response ─────────────────────────────────────

function parseJSON(content: string): any {
  let jsonStr = content.trim();
  jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];
  return JSON.parse(jsonStr.trim());
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

    const { topicName, topicEmoji, gradeLevel, topicXp, subjectSlug, phase, scaffoldSections } = validation.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const difficulty = getDifficultyLevel(topicXp || 0);
    const yearLevel = gradeLevel || "Year 5";
    const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";

    // Only validate subscription on scaffold phase
    if (phase === "scaffold") {
      const userId = userData.user.id;
      const missionAccess = await validateMissionAccess(supabaseClient, userId);
      if (!missionAccess.allowed) {
        return new Response(JSON.stringify({ error: missionAccess.error, code: 'LIMIT_REACHED' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── Phase: Scaffold ──
    if (phase === "scaffold") {
      console.log(`Phase 1 (scaffold): "${topicName}" [${difficulty.level}]`);
      const { system, user } = buildScaffoldPrompt(topicName, topicEmoji || '📚', yearLevel, difficulty, subjectSlug);
      const content = await callLLM(LOVABLE_API_KEY, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], 3000);

      const scaffold = parseJSON(content);
      return new Response(
        JSON.stringify({ success: true, content: scaffold, difficultyLevel: difficulty.level, phase: "scaffold" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Phase: Checks ──
    if (phase === "checks") {
      if (!scaffoldSections || scaffoldSections.length === 0) {
        return new Response(JSON.stringify({ error: 'scaffoldSections required for checks phase' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log(`Phase 2 (checks): "${topicName}" — ${scaffoldSections.length} sections`);
      const { system, user } = buildChecksPrompt(topicName, yearLevel, difficulty, scaffoldSections, subjectSlug);
      const content = await callLLM(LOVABLE_API_KEY, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], 3000);

      const parsed = parseJSON(content);
      let checks = parsed.checks || [];

      if (isMaths) {
        checks = correctMathQuestions(checks);
      }

      return new Response(
        JSON.stringify({ success: true, checks, phase: "checks" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Phase: Challenge ──
    if (phase === "challenge") {
      console.log(`Phase 3 (challenge): "${topicName}" [${difficulty.level}]`);
      const { system, user } = buildChallengePrompt(topicName, yearLevel, difficulty, subjectSlug);
      const content = await callLLM(LOVABLE_API_KEY, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], 3000);

      const parsed = parseJSON(content);
      const finalChallenge = parsed.final_challenge || parsed;

      if (isMaths && finalChallenge.questions) {
        finalChallenge.questions = correctMathQuestions(finalChallenge.questions);
      }

      return new Response(
        JSON.stringify({ success: true, final_challenge: finalChallenge, phase: "challenge" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid phase' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
