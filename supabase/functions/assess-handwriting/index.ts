import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile + check Champion
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, subscription_tier, grade_level")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.subscription_tier !== "champion") {
      return new Response(JSON.stringify({ error: "Champion subscription required", code: "CHAMPION_REQUIRED" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body = await req.json();
    const { imageBase64, question, assessmentCriteria, exampleElements, minWords, maxWords, maxPoints, topicName, subjectName } = body;

    if (!imageBase64 || !question) {
      return new Response(JSON.stringify({ error: "imageBase64 and question are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gradeLevel = profile.grade_level || "Year 5";

    // ===== LLM CALL 1: Image validation gate =====
    console.log("Step 1: Validating image...");
    const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Does this image show handwritten or hand-drawn work on paper? This includes written text, mathematical working, equations, diagrams, shapes, angles, charts, or any other student work produced by pen or pencil on paper. Reply ONLY with YES or NO.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!validationResponse.ok) {
      if (validationResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (validationResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Validation call failed: ${validationResponse.status}`);
    }

    const validationResult = await validationResponse.json();
    const validationAnswer = validationResult.choices?.[0]?.message?.content?.trim().toUpperCase() || "";

    if (!validationAnswer.startsWith("YES")) {
      return new Response(JSON.stringify({ success: false, rejected: true, reason: "upload_not_handwriting" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== LLM CALL 2: Handwriting assessment + transcription =====
    console.log("Step 2: Assessing handwriting...");
    const handwritingPrompt = `You are assessing a ${gradeLevel} student's handwritten work. Assess their handwriting quality and transcribe the text exactly as written.

QUESTION THE STUDENT WAS ANSWERING:
${question}

HANDWRITING RUBRIC (calibrated for ${gradeLevel}):

LETTER FORMATION (1-5):
1: Many letters poorly formed, difficult to distinguish
2: Some letters inconsistent, several reversals or unclear shapes
3: Most letters correctly formed, occasional inconsistencies
4: Letters well-formed and consistent, good proportions
5: Excellent letter formation, consistently neat and precise

SPACING & SIZING (1-5):
1: Words run together, very inconsistent letter sizes
2: Uneven spacing, some words hard to separate, variable sizes
3: Generally even spacing, mostly consistent sizing
4: Good consistent spacing between words and letters, uniform sizing
5: Excellent spacing and sizing throughout, very professional appearance

PRESENTATION (1-5):
1: Very messy, hard to read, no care taken
2: Below expected standard, some effort but needs improvement
3: Acceptable presentation, meets basic expectations
4: Clean and tidy, good effort, easy to read
5: Outstanding presentation, pride taken in work, exemplary neatness

Return ONLY valid JSON (no markdown, no code blocks):
{
  "letter_formation": <1-5>,
  "letter_formation_comment": "<short encouraging comment>",
  "spacing_sizing": <1-5>,
  "spacing_sizing_comment": "<short encouraging comment>",
  "presentation": <1-5>,
  "presentation_comment": "<short encouraging comment>",
  "composite_score": <average of 3 scores as decimal>,
  "transcribed_text": "<exact text as written by the student, preserving all spelling errors, no corrections>"
}`;

    const handwritingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: handwritingPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!handwritingResponse.ok) {
      if (handwritingResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (handwritingResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Handwriting assessment failed: ${handwritingResponse.status}`);
    }

    const hwResult = await handwritingResponse.json();
    let hwContent = hwResult.choices?.[0]?.message?.content || "";
    
    let handwriting;
    try {
      let jsonStr = hwContent.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      handwriting = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse handwriting JSON:", hwContent);
      throw new Error("Failed to parse handwriting assessment");
    }

    // ===== LLM CALL 3: Content assessment (identical to assess-writing) =====
    console.log("Step 3: Assessing content...");
    const studentResponse = handwriting.transcribed_text || "";
    const wordCount = studentResponse.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

    const systemPrompt = `You are a warm, encouraging Australian primary school teacher assessing a ${gradeLevel} student's creative writing.
Your role is to provide constructive, age-appropriate feedback that celebrates what they did well while gently guiding improvement.
Use Australian English spelling and be supportive - remember these are children learning to write!
Never be harsh or discouraging. Frame all feedback positively.`;

    const userPrompt = `Assess this ${gradeLevel} student's writing response.

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

    const contentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!contentResponse.ok) {
      if (contentResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (contentResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Content assessment failed: ${contentResponse.status}`);
    }

    const contentResult = await contentResponse.json();
    let contentContent = contentResult.choices?.[0]?.message?.content || "";
    
    let writing;
    try {
      let jsonStr = contentContent.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      writing = JSON.parse(jsonStr.trim());
    } catch {
      writing = {
        score: Math.round((maxPoints || 50) * 0.7),
        maxScore: maxPoints || 50,
        feedback: "Great effort on your writing! Keep practising and you'll keep getting better.",
        strengths: ["You completed the task", "You shared your ideas"],
        improvements: ["Try adding more descriptive words next time"],
        overallRating: "Good Effort!",
      };
    }

    // ===== Upload image to Storage =====
    console.log("Step 4: Uploading image...");
    const imageId = crypto.randomUUID();
    const imagePath = `${profile.id}/${imageId}.jpg`;
    
    // Decode base64 to Uint8Array
    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabaseClient.storage
      .from("handwriting-submissions")
      .upload(imagePath, bytes, { contentType: "image/jpeg", upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Continue without image - don't fail the whole request
    }

    // ===== Cleanup old images (keep only 5 most recent) =====
    console.log("Step 5: Cleaning up old images...");
    const { data: oldSubmissions } = await supabaseClient
      .from("handwriting_submissions")
      .select("id, image_path, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (oldSubmissions && oldSubmissions.length >= 5) {
      const toClean = oldSubmissions.slice(0, oldSubmissions.length - 4); // Keep 4 + the new one = 5
      for (const sub of toClean) {
        if (sub.image_path) {
          await supabaseClient.storage
            .from("handwriting-submissions")
            .remove([sub.image_path]);
          // Update the row to clear image_path (keep the data row)
          await supabaseClient
            .from("handwriting_submissions")
            .update({ image_path: null })
            .eq("id", sub.id);
        }
      }
    }

    // ===== Insert submission record =====
    console.log("Step 6: Saving submission...");
    await supabaseClient.from("handwriting_submissions").insert({
      profile_id: profile.id,
      image_path: uploadError ? null : imagePath,
      letter_formation: handwriting.letter_formation,
      spacing_sizing: handwriting.spacing_sizing,
      presentation: handwriting.presentation,
      composite_score: handwriting.composite_score,
      transcribed_text: handwriting.transcribed_text,
      content_score: writing.score,
      content_max_score: writing.maxScore,
      content_feedback: writing.feedback,
      content_overall_rating: writing.overallRating,
      subject_name: subjectName || null,
      topic_name: topicName || null,
      question: question,
    });

    return new Response(
      JSON.stringify({
        success: true,
        handwriting: {
          letter_formation: handwriting.letter_formation,
          letter_formation_comment: handwriting.letter_formation_comment,
          spacing_sizing: handwriting.spacing_sizing,
          spacing_sizing_comment: handwriting.spacing_sizing_comment,
          presentation: handwriting.presentation,
          presentation_comment: handwriting.presentation_comment,
          composite_score: handwriting.composite_score,
          transcribed_text: handwriting.transcribed_text,
        },
        writing,
        imagePath: uploadError ? null : imagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in assess-handwriting:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
