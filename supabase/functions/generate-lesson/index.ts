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

// ── Calculator Tool ──────────────────────────────────────────────────

function safeCalculate(expression: string): string {
  try {
    const result = evaluate(expression);
    return String(result);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : 'Invalid expression'}`;
  }
}

const CALCULATE_TOOL = {
  type: "function" as const,
  function: {
    name: "calculate",
    description: "Evaluate a mathematical expression accurately. Use this for ALL arithmetic operations — never calculate mentally. Supports fractions (1/3 + 1/6), decimals, percentages, and complex expressions.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate, e.g. '3/4 + 1/8', '15 * 24', '250 / 1000'"
        }
      },
      required: ["expression"],
      additionalProperties: false,
    }
  }
};

// ── LLM Call with Tool Loop ──────────────────────────────────────────

async function callWithTools(
  apiKey: string,
  messages: { role: string; content: string }[],
  useTools: boolean,
  maxToolRounds = 10,
): Promise<string> {
  let currentMessages = [...messages];
  
  for (let round = 0; round < maxToolRounds; round++) {
    const body: Record<string, unknown> = {
      model: "google/gemini-2.5-flash",
      messages: currentMessages,
      temperature: 0.7,
      max_tokens: 5000,
    };
    if (useTools) {
      body.tools = [CALCULATE_TOOL];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("No response from AI");

    const msg = choice.message;

    // If the model wants to call tools
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // Add the assistant message with tool calls
      currentMessages.push(msg);
      
      // Execute each tool call and add results
      for (const toolCall of msg.tool_calls) {
        if (toolCall.function?.name === "calculate") {
          const args = JSON.parse(toolCall.function.arguments);
          const result = safeCalculate(args.expression);
          console.log(`calculate("${args.expression}") = ${result}`);
          currentMessages.push({
            role: "tool",
            content: result,
            // @ts-ignore - tool_call_id needed for API
            tool_call_id: toolCall.id,
          });
        }
      }
      continue; // Loop back to let the model use the results
    }

    // Final text response
    return msg.content || "";
  }

  throw new Error("Tool calling loop exceeded maximum rounds");
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
  // Look for numbers, math operators, math keywords
  const mathPatterns = [
    /\d+\s*[\+\-\*\/×÷]\s*\d+/,       // arithmetic expressions
    /\d+\/\d+/,                          // fractions
    /\d+\.\d+/,                          // decimals
    /\d+\s*%/,                           // percentages
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

// ── Agent 2: Math Verification ───────────────────────────────────────

interface QuestionToVerify {
  question: string;
  options: string[];
  correct_answer: number;
  type?: string;
}

async function verifyMathQuestion(apiKey: string, q: QuestionToVerify): Promise<{ correct: boolean; suggestedAnswer?: number }> {
  const prompt = `You are a math verification agent. Your ONLY job is to independently solve this question and check if the given answer is correct.

QUESTION: ${q.question}
OPTIONS:
${q.options.map((o: string, i: number) => `${i}: ${o}`).join('\n')}
CLAIMED CORRECT ANSWER INDEX: ${q.correct_answer} (which is "${q.options[q.correct_answer]}")

Instructions:
1. Re-read the question carefully — pay attention to what operation is actually being asked for
2. Extract the mathematical expression from the word problem
3. Use the calculate() tool to compute the answer — NEVER calculate mentally
4. Compare your calculated answer to each option
5. Respond with ONLY valid JSON: {"correct": true} if the claimed answer matches your calculation, or {"correct": false, "suggested_answer": <correct_index>} if it doesn't.`;

  try {
    const result = await callWithTools(apiKey, [
      { role: "system", content: "You are a precise math verification agent. Use the calculate() tool for ALL arithmetic. Reply ONLY with JSON." },
      { role: "user", content: prompt },
    ], true);

    let jsonStr = result.trim();
    // Extract JSON from potential markdown
    const jsonMatch = jsonStr.match(/\{[^}]+\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    
    const parsed = JSON.parse(jsonStr);
    return { correct: parsed.correct !== false, suggestedAnswer: parsed.suggested_answer };
  } catch (e) {
    console.error("Verification agent error:", e);
    return { correct: true }; // On error, trust Agent 1
  }
}

// ── Question Regeneration ────────────────────────────────────────────

async function regenerateMathQuestion(
  apiKey: string,
  original: QuestionToVerify,
  context: string,
): Promise<QuestionToVerify | null> {
  const prompt = `The following math question had an incorrect answer. Generate a REPLACEMENT question on the same topic with a verified correct answer.

ORIGINAL (INCORRECT) QUESTION: ${original.question}
TOPIC CONTEXT: ${context}

Generate a new multiple-choice question. Use the calculate() tool to verify your answer is correct.

Return ONLY valid JSON:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct_answer": 0,
  "hint": "...",
  "explanation": "..."
}`;

  try {
    const result = await callWithTools(apiKey, [
      { role: "system", content: "You are a math question generator. Use the calculate() tool for ALL arithmetic. Return ONLY JSON." },
      { role: "user", content: prompt },
    ], true);

    let jsonStr = result.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
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

  // Validate check questions in sections
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
            console.log(`⚠️ Dropping unverifiable check question at section ${i}`);
            // Convert to a learn section instead of removing it
            validatedLesson.sections[i] = {
              type: "learn",
              title: "Quick Note",
              content: section.explanation || "Let's continue to the next part!",
            };
          }
        }
      } else {
        console.log(`✅ Section check ${i} verified`);
      }
    }
  }

  // Validate final challenge questions
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
          // Skip this question entirely
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

${isMaths ? "CRITICAL: Use the calculate() tool for ALL arithmetic operations. NEVER calculate mentally. Always verify your answers with the tool before including them." : ""}
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
${isMaths ? "CRITICAL: Use the calculate() tool for EVERY arithmetic operation. Never do mental math." : ""}
${freeTextBlock}
Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "Engaging title",
  "emoji": "${topicEmoji}",
  "difficulty_level": "${difficulty.level}",
  "fun_fact": "Surprising fact related to topic",
  "sections": [
    { "type": "learn", "title": "Section title", "content": "Learning content (2-3 paragraphs)" },
    { "type": "check", "question_type": "multiple_choice", "question": "Comprehension check", "options": ["A", "B", "C", "D"], "correct_answer": 0, "hint": "Guiding hint", "explanation": "Why correct" },
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
${isEnglish ? '- Include at least one free-text writing question in final_challenge' : ''}`;

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

    // ── Agent 1: Generate lesson (with calculator tool for math) ──
    console.log(`Agent 1: Generating lesson for "${topicName}" (math tools: ${isMaths})`);
    const content = await callWithTools(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], isMaths);

    let lessonContent;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      lessonContent = JSON.parse(jsonStr.trim());
    } catch {
      throw new Error("Failed to parse lesson content");
    }

    // ── Agent 2: Validate math answers ──
    if (isMaths) {
      console.log("Agent 2: Validating math answers...");
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
