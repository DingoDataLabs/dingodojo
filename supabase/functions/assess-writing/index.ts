import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentResponse, 
      question, 
      assessmentCriteria, 
      exampleElements,
      minWords,
      maxWords,
      maxPoints,
      gradeLevel,
      topicName
    } = await req.json();

    if (!studentResponse || !question) {
      throw new Error("Student response and question are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const wordCount = studentResponse.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const yearLevel = gradeLevel || "Year 5";

    console.log(`Assessing writing for: ${topicName}, Words: ${wordCount}, Grade: ${yearLevel}`);

    const systemPrompt = `You are a warm, encouraging Australian primary school teacher assessing a ${yearLevel} student's creative writing.
Your role is to provide constructive, age-appropriate feedback that celebrates what they did well while gently guiding improvement.
Use Australian English spelling and be supportive - remember these are children learning to write!
Never be harsh or discouraging. Frame all feedback positively.`;

    const userPrompt = `Assess this ${yearLevel} student's writing response.

QUESTION/PROMPT:
${question}

STUDENT'S RESPONSE (${wordCount} words):
${studentResponse}

${assessmentCriteria ? `ASSESSMENT CRITERIA:\n${assessmentCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}` : ''}

${exampleElements ? `ELEMENTS TO LOOK FOR:\n${exampleElements.join(', ')}` : ''}

WORD REQUIREMENTS: ${minWords || 50}-${maxWords || 200} words (student wrote ${wordCount})

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "score": <number between 0 and ${maxPoints || 50}>,
  "maxScore": ${maxPoints || 50},
  "feedback": "<2-3 encouraging sentences about their overall work>",
  "strengths": ["<specific thing they did well>", "<another strength>"],
  "improvements": ["<gentle suggestion framed positively>", "<optional second suggestion>"],
  "overallRating": "<one of: 'Fantastic!', 'Great Work!', 'Good Effort!', 'Keep Practising!'>"
}

SCORING GUIDE:
- 90-100%: Exceptional - exceeds all criteria, creative, well-structured
- 75-89%: Great - meets most criteria well, good effort
- 60-74%: Good - meets basic criteria, room for improvement
- 40-59%: Developing - partial criteria met, needs more practice
- Below 40%: Only if completely off-topic or minimal effort

Be generous and encouraging - this is a learning exercise!`;

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
        temperature: 0.5,
        max_tokens: 1000,
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

    console.log("Raw AI assessment:", content);

    let assessment;
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
      assessment = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback assessment
      assessment = {
        score: Math.round((maxPoints || 50) * 0.7),
        maxScore: maxPoints || 50,
        feedback: "Great effort on your writing! Keep practising and you'll keep getting better.",
        strengths: ["You completed the task", "You shared your ideas"],
        improvements: ["Try adding more descriptive words next time"],
        overallRating: "Good Effort!"
      };
    }

    return new Response(
      JSON.stringify({ success: true, assessment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error assessing writing:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
