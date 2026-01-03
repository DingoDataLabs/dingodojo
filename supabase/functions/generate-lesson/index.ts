import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { topicName, topicEmoji, gradeLevel, topicXp, subjectSlug } = await req.json();

    if (!topicName) {
      throw new Error("Topic name is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficulty = getDifficultyLevel(topicXp || 0);
    const yearLevel = gradeLevel || "Year 5";
    const isMaths = subjectSlug === "maths" || subjectSlug === "mathematics";

    console.log(`Generating lesson for: ${topicName}, Grade: ${yearLevel}, XP: ${topicXp}, Difficulty: ${difficulty.level}`);

    const systemPrompt = `You are an expert educational content creator for Australian primary school students (NSW ${yearLevel}, Stage 3). 
Create engaging, age-appropriate educational content that builds understanding progressively.
Use Australian English spelling (e.g., "colour" not "color", "favourite" not "favorite").
Include Australian references and examples where appropriate (Australian animals, places, sports like cricket/AFL).
Keep language simple but not condescending.

${isMaths ? NSW_MATHS_CURRICULUM : ""}

CURRENT STUDENT PERFORMANCE LEVEL: ${difficulty.level}
This means you should be ${difficulty.description}.`;

    const userPrompt = `Create an interactive lesson module for "${topicName}" for a ${yearLevel} Australian student (NSW Stage 3).

The student's current XP on this topic is ${topicXp || 0}, placing them at the "${difficulty.level}" level.
Adjust the complexity and challenge accordingly - ${difficulty.description}.

IMPORTANT: This lesson must be INTERACTIVE with multiple checkpoints to verify understanding before progressing.

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
        "question": "A more challenging question that requires applying what was learned",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "hint": "A hint that guides thinking without revealing the answer",
        "explanation": "Detailed explanation of the correct answer",
        "points": 20
      },
      {
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
- Make questions progressively harder within the module`;

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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

    console.log("Raw AI response:", content);

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
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse lesson content");
    }

    console.log("Parsed lesson content:", lessonContent);

    return new Response(
      JSON.stringify({ success: true, content: lessonContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating lesson:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
