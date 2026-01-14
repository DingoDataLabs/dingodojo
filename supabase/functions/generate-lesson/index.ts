import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NSW Stage 3 Mathematics Curriculum Structure
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

// Input validation
const validateInput = (data: unknown): { valid: boolean; error?: string; data?: {
  topicName: string;
  topicEmoji?: string;
  gradeLevel?: string;
  topicXp?: number;
  subjectSlug?: string;
}} => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const body = data as Record<string, unknown>;

  // Required: topicName
  if (typeof body.topicName !== 'string' || body.topicName.length < 1) {
    return { valid: false, error: 'topicName is required' };
  }
  if (body.topicName.length > 200) {
    return { valid: false, error: 'topicName exceeds maximum length of 200 characters' };
  }

  // Optional string fields
  if (body.topicEmoji !== undefined && (typeof body.topicEmoji !== 'string' || body.topicEmoji.length > 10)) {
    return { valid: false, error: 'topicEmoji must be a string with max 10 characters' };
  }
  if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 50)) {
    return { valid: false, error: 'gradeLevel must be a string with max 50 characters' };
  }
  if (body.subjectSlug !== undefined && (typeof body.subjectSlug !== 'string' || body.subjectSlug.length > 50)) {
    return { valid: false, error: 'subjectSlug must be a string with max 50 characters' };
  }

  // Optional numeric field
  if (body.topicXp !== undefined && (typeof body.topicXp !== 'number' || body.topicXp < 0 || body.topicXp > 100000)) {
    return { valid: false, error: 'topicXp must be a number between 0 and 100000' };
  }

  return {
    valid: true,
    data: {
      topicName: body.topicName as string,
      topicEmoji: body.topicEmoji as string | undefined,
      gradeLevel: body.gradeLevel as string | undefined,
      topicXp: body.topicXp as number | undefined,
      subjectSlug: body.subjectSlug as string | undefined,
    }
  };
};

// Difficulty progression based on XP
const getDifficultyLevel = (topicXp: number): { level: string; description: string; multiplier: number } => {
  if (topicXp < 50) return { level: "Beginning", description: "introducing core concepts with concrete examples", multiplier: 1 };
  if (topicXp < 150) return { level: "Developing", description: "building understanding with varied examples", multiplier: 1.2 };
  if (topicXp < 300) return { level: "Consolidating", description: "applying concepts to new situations", multiplier: 1.5 };
  if (topicXp < 500) return { level: "Extending", description: "tackling more complex problems and connections", multiplier: 1.8 };
  return { level: "Mastering", description: "challenging problems requiring deeper reasoning", multiplier: 2 };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user with getUser
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError.message, userError.status);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!userData?.user) {
      console.error('No user found in session');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No user in session' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = userData.user.id;
    console.log('Authenticated user:', userId);

    // Parse and validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validateInput(rawBody);
    if (!validation.valid || !validation.data) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { topicName, topicEmoji, gradeLevel, topicXp, subjectSlug } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficulty = getDifficultyLevel(topicXp || 0);
    const yearLevel = gradeLevel || "Year 5";
    const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";
    const isEnglish = subjectSlug === "english";

    const systemPrompt = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3). 
Create engaging, age-appropriate educational content that builds understanding progressively.
Use Australian English spelling (e.g., "colour" not "color", "favourite" not "favorite").
Include Australian references and examples where appropriate (Australian animals, places, sports like cricket/AFL).
Keep language simple but not condescending.

${isMaths ? NSW_MATHS_CURRICULUM : ""}

CURRENT STUDENT PERFORMANCE LEVEL: ${difficulty.level}
This means you should be ${difficulty.description}.

${isEnglish ? `IMPORTANT FOR ENGLISH LESSONS: Include at least one FREE-TEXT writing question in the final challenge where students must write a creative response. This is essential for developing writing skills.` : ''}`;

    // Determine free-text word limits based on difficulty level
    const freeTextWordLimits: Record<string, { min: number; max: number }> = {
      "Beginning": { min: 50, max: 100 },
      "Developing": { min: 100, max: 150 },
      "Consolidating": { min: 150, max: 200 },
      "Extending": { min: 200, max: 250 },
      "Mastering": { min: 250, max: 300 },
    };
    const wordLimits = freeTextWordLimits[difficulty.level] || { min: 100, max: 150 };

    const freeTextInstructions = isEnglish ? `

FOR ENGLISH LESSONS - FREE-TEXT WRITING QUESTIONS:
Include at least ONE free-text question in the final_challenge where students write a creative response.
Free-text questions should use this structure:
{
  "type": "free_text",
  "question": "Write a short ${wordLimits.min}-${wordLimits.max} word story/paragraph about [creative prompt related to the lesson topic]",
  "assessment_criteria": [
    "Clear structure (beginning, middle, end)",
    "Use of descriptive language",
    "Correct spelling and punctuation",
    "Creative and original ideas"
  ],
  "example_elements": ["setting description", "character feelings", "dialogue", "sensory details"],
  "min_words": ${wordLimits.min},
  "max_words": ${wordLimits.max},
  "hint": "Think about [guidance for the writing task]",
  "explanation": "This writing task helps you practise [skill being developed]",
  "points": 50
}
` : '';

    const userPrompt = `Create an interactive lesson module for "${topicName}" for a ${yearLevel} Australian student (NSW Stage 3).

The student's current XP on this topic is ${topicXp || 0}, placing them at the "${difficulty.level}" level.
Adjust the complexity and challenge accordingly - ${difficulty.description}.

IMPORTANT: This lesson must be INTERACTIVE with multiple checkpoints to verify understanding before progressing.
${freeTextInstructions}
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the JSON):
{
  "title": "An engaging title for the lesson",
  "emoji": "${topicEmoji || '📚'}",
  "difficulty_level": "${difficulty.level}",
  "fun_fact": "An interesting and surprising fact related to the topic that Australian kids would love",
  "sections": [
    {
      "type": "learn",
      "title": "Section title",
      "content": "First chunk of learning content (2-3 paragraphs max). Use simple language, real-world Australian examples, and build understanding step by step."
    },
    {
      "type": "check",
      "question_type": "multiple_choice",
      "question": "A quick comprehension check question about what was just taught",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "hint": "A gentle hint to guide students toward the right answer without giving it away",
      "explanation": "Brief explanation of why this is correct"
    },
    {
      "type": "learn",
      "title": "Building on that...",
      "content": "Second chunk of learning content that builds on the first section and introduces slightly more complexity."
    },
    {
      "type": "check",
      "question_type": "multiple_choice",
      "question": "Another comprehension check",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "hint": "A helpful hint",
      "explanation": "Why this answer is correct"
    }
  ],
  "final_challenge": {
    "title": "Challenge Time!",
    "description": "A brief intro to the final challenge",
    "questions": [
      {
        "type": "multiple_choice",
        "question": "A more challenging question that requires applying what was learned",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "hint": "A hint that guides thinking without revealing the answer",
        "explanation": "Detailed explanation of the correct answer",
        "points": 20
      },
      {
        "type": "multiple_choice",
        "question": "Another challenging question, possibly multi-step or requiring reasoning",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "hint": "Another guiding hint",
        "explanation": "Detailed explanation",
        "points": 30
      }
    ]
  },
  "total_xp": 50
}

Guidelines:
- Include exactly 2-3 learning sections, each followed by a comprehension check
- The final challenge should have 2-3 questions that are MORE difficult than the checks
- Hints should guide thinking, not reveal answers (e.g., "Think about what happens when..." not "The answer is...")
- For "${difficulty.level}" level, ${difficulty.description}
- Use Australian contexts: kilometres not miles, dollars not pounds, local wildlife, sports like cricket or AFL
- Make questions progressively harder within the module
${isEnglish ? '- IMPORTANT: Include at least one free-text writing question in the final_challenge with type: "free_text"' : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    let lessonContent;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      lessonContent = JSON.parse(jsonStr.trim());
    } catch {
      throw new Error("Failed to parse lesson content");
    }

    return new Response(
      JSON.stringify({ success: true, content: lessonContent, difficultyLevel: difficulty.level }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating lesson:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing your request",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
