import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const validateInput = (data: unknown): { valid: boolean; error?: string; data?: {
  studentResponse: string;
  question: string;
  assessmentCriteria?: string[];
  exampleElements?: string[];
  minWords?: number;
  maxWords?: number;
  maxPoints?: number;
  gradeLevel?: string;
  topicName?: string;
}} => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const body = data as Record<string, unknown>;

  // Required fields
  if (typeof body.studentResponse !== 'string' || body.studentResponse.length < 10) {
    return { valid: false, error: 'Student response must be at least 10 characters' };
  }
  if (body.studentResponse.length > 10000) {
    return { valid: false, error: 'Student response exceeds maximum length of 10000 characters' };
  }

  if (typeof body.question !== 'string' || body.question.length < 5) {
    return { valid: false, error: 'Question must be at least 5 characters' };
  }
  if (body.question.length > 2000) {
    return { valid: false, error: 'Question exceeds maximum length of 2000 characters' };
  }

  // Optional array fields
  if (body.assessmentCriteria !== undefined) {
    if (!Array.isArray(body.assessmentCriteria) || body.assessmentCriteria.length > 20) {
      return { valid: false, error: 'Assessment criteria must be an array with max 20 items' };
    }
    for (const criterion of body.assessmentCriteria) {
      if (typeof criterion !== 'string' || criterion.length > 500) {
        return { valid: false, error: 'Each criterion must be a string with max 500 characters' };
      }
    }
  }

  if (body.exampleElements !== undefined) {
    if (!Array.isArray(body.exampleElements) || body.exampleElements.length > 20) {
      return { valid: false, error: 'Example elements must be an array with max 20 items' };
    }
    for (const element of body.exampleElements) {
      if (typeof element !== 'string' || element.length > 200) {
        return { valid: false, error: 'Each element must be a string with max 200 characters' };
      }
    }
  }

  // Optional numeric fields
  if (body.minWords !== undefined && (typeof body.minWords !== 'number' || body.minWords < 0 || body.minWords > 1000)) {
    return { valid: false, error: 'minWords must be a number between 0 and 1000' };
  }
  if (body.maxWords !== undefined && (typeof body.maxWords !== 'number' || body.maxWords < 1 || body.maxWords > 5000)) {
    return { valid: false, error: 'maxWords must be a number between 1 and 5000' };
  }
  if (body.maxPoints !== undefined && (typeof body.maxPoints !== 'number' || body.maxPoints < 1 || body.maxPoints > 100)) {
    return { valid: false, error: 'maxPoints must be a number between 1 and 100' };
  }

  // Optional string fields
  if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 50)) {
    return { valid: false, error: 'gradeLevel must be a string with max 50 characters' };
  }
  if (body.topicName !== undefined && (typeof body.topicName !== 'string' || body.topicName.length > 200)) {
    return { valid: false, error: 'topicName must be a string with max 200 characters' };
  }

  return {
    valid: true,
    data: {
      studentResponse: body.studentResponse as string,
      question: body.question as string,
      assessmentCriteria: body.assessmentCriteria as string[] | undefined,
      exampleElements: body.exampleElements as string[] | undefined,
      minWords: body.minWords as number | undefined,
      maxWords: body.maxWords as number | undefined,
      maxPoints: body.maxPoints as number | undefined,
      gradeLevel: body.gradeLevel as string | undefined,
      topicName: body.topicName as string | undefined,
    }
  };
};

// Validate subscription tier and daily limits
const validateMissionAccess = async (
  supabaseClient: any,
  userId: string
): Promise<{ allowed: boolean; error?: string }> => {
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('subscription_tier, missions_today, last_mission_date')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile for mission access:', error);
    return { allowed: false, error: 'Failed to verify subscription status' };
  }

  if (profile.subscription_tier === 'champion') {
    return { allowed: true };
  }

  const today = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' });
  const lastMissionDate = profile.last_mission_date as string | null;
  const isNewDay = !lastMissionDate || lastMissionDate !== today;
  const effectiveMissionsToday: number = isNewDay ? 0 : (profile.missions_today || 0);

  if (effectiveMissionsToday >= 2) {
    return { 
      allowed: false, 
      error: 'Daily mission limit reached. Upgrade to Champion for unlimited access!' 
    };
  }

  return { allowed: true };
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify the user with detailed logging
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
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
    
    console.log('Authenticated user:', userData.user.id);

    // Validate subscription tier and daily limits
    const missionAccess = await validateMissionAccess(supabaseClient, userData.user.id);
    if (!missionAccess.allowed) {
      return new Response(
        JSON.stringify({ error: missionAccess.error, code: 'LIMIT_REACHED' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { studentResponse, question, assessmentCriteria, exampleElements, minWords, maxWords, maxPoints, gradeLevel, topicName } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const wordCount = studentResponse.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const yearLevel = gradeLevel || "Year 5";

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
  "overallRating": "<one of: 'Fantastic!', 'Great Work!', 'Good Effort!', 'Keep Practising!'>",
  "annotations": [
    {
      "originalText": "<exact text from student's response that needs attention>",
      "suggestion": "<corrected version or improvement suggestion>",
      "type": "<one of: 'spelling', 'grammar', 'punctuation', 'style', 'praise'>",
      "comment": "<brief, encouraging explanation for the student>"
    }
  ]
}

ANNOTATION GUIDELINES:
- Include 2-5 annotations highlighting the most important areas
- For "praise" type, highlight excellent phrases or word choices with positive comments
- For corrections, be gentle - use phrases like "Try this:" or "Even better:"
- Focus on teaching moments, not every error
- Include at least 1-2 "praise" annotations to celebrate good writing
- Use exact text matches from the student's response for "originalText"

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
    } catch {
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
        error: "An error occurred while processing your request",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
