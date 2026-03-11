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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, subscription_tier, grade_level")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      imageBase64, question, workedSolutionType, correctAnswerValue,
      workingStepsExpected, bonusXp, topicName, subjectName, inputMethod,
    } = body;

    if (!imageBase64 || !question) {
      return new Response(JSON.stringify({ error: "imageBase64 and question required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const gradeLevel = profile.grade_level || "Year 5";
    const solType = workedSolutionType || "working";
    const maxBonus = bonusXp || 25;

    // ===== LLM CALL 1: Image validation =====
    console.log("Step 1: Validating image...");
    const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Does this image show handwritten or hand-drawn work on paper, or a digital drawing of mathematical working, charts, or diagrams? This includes written text, mathematical working, equations, diagrams, shapes, graphs, charts, or any student work. Reply ONLY with YES or NO." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!validationResponse.ok) {
      if (validationResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (validationResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Validation failed: ${validationResponse.status}`);
    }

    const validationResult = await validationResponse.json();
    const validationAnswer = validationResult.choices?.[0]?.message?.content?.trim().toUpperCase() || "";

    if (!validationAnswer.startsWith("YES")) {
      return new Response(JSON.stringify({ success: false, rejected: true, reason: "upload_not_handwriting" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== LLM CALL 2: Maths working assessment =====
    console.log("Step 2: Assessing maths working...");

    const criteriaDescription = solType === "chart"
      ? `
CORRECT ANSWER (1-5): Did the chart accurately represent the data/answer?
1: Chart does not answer the question  2: Major inaccuracies  3: Mostly correct  4: Accurate  5: Perfectly accurate

CHART ACCURACY & LABELS (1-5): Are axes labelled, scale correct, data points accurate?
1: No labels or scale  2: Missing key labels  3: Most labels present  4: Well labelled  5: Excellent with title, labels, scale

CORRECT METHOD (1-5): Was an appropriate chart type used with correct approach?
1: Wrong chart type  2: Partially appropriate  3: Reasonable choice  4: Good choice  5: Optimal chart type and method

NEAT & READABLE (1-5): Is it tidy, clear, and easy to read?
1: Very messy  2: Hard to read in parts  3: Acceptable  4: Clean and clear  5: Outstanding presentation`
      : `
CORRECT FINAL ANSWER (1-5): Did they arrive at the right answer?
1: Wrong answer, no relevant working  2: Wrong answer, some relevant steps  3: Close/minor error  4: Correct with minor notation issues  5: Perfectly correct

CLEAR WORKING STEPS (1-5): Are the steps shown clearly and in logical order?
1: No working shown  2: Minimal/unclear steps  3: Key steps shown  4: Clear progression  5: Exemplary step-by-step

CORRECT METHOD/STRATEGY (1-5): Was an appropriate mathematical strategy used?
1: No recognisable method  2: Partially correct method  3: Reasonable strategy  4: Good strategy  5: Optimal strategy

NEAT & READABLE LAYOUT (1-5): Is the working tidy and easy to follow?
1: Very messy  2: Hard to read  3: Acceptable  4: Clean and organised  5: Outstanding presentation`;

    const assessPrompt = `You are assessing a ${gradeLevel} student's mathematical ${solType === "chart" ? "chart/graph" : "working/solution"}.

QUESTION: ${question}
${correctAnswerValue ? `EXPECTED ANSWER: ${correctAnswerValue}` : ""}
${workingStepsExpected ? `EXPECTED STEPS: ${JSON.stringify(workingStepsExpected)}` : ""}

ASSESSMENT CRITERIA (calibrated for ${gradeLevel}):
${criteriaDescription}

Return ONLY valid JSON (no markdown):
{
  "correct_answer": <1-5>,
  "clear_working": <1-5>,
  "correct_method": <1-5>,
  "neat_layout": <1-5>,
  "composite_score": <average as decimal>,
  "transcribed_working": "<transcribe the student's working exactly as written>",
  "feedback": "<2-3 encouraging sentences about their work>",
  "overall_rating": "<one of: 'Fantastic!', 'Great Work!', 'Good Effort!', 'Keep Practising!'>",
  "annotations": [
    {
      "originalText": "<exact text/step from their working>",
      "suggestion": "<correction or praise>",
      "type": "<one of: 'correct', 'error', 'praise', 'method'>",
      "comment": "<brief encouraging explanation>"
    }
  ]
}

ANNOTATION GUIDELINES:
- 2-5 annotations highlighting key steps
- For "praise"/"correct" type, highlight good steps with positive comments
- For "error", be gentle — "Try this:" or "Even better:"
- Include at least 1 praise annotation
- Use Australian English`;

    const assessResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: assessPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!assessResponse.ok) {
      if (assessResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (assessResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Assessment failed: ${assessResponse.status}`);
    }

    const assessResult = await assessResponse.json();
    let assessContent = assessResult.choices?.[0]?.message?.content || "";

    let assessment;
    try {
      let jsonStr = assessContent.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      assessment = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse assessment JSON:", assessContent);
      throw new Error("Failed to parse maths assessment");
    }

    // Calculate bonus XP scaled by composite score
    const compositeScore = assessment.composite_score || 0;
    const bonusXpAwarded = Math.round((compositeScore / 5) * maxBonus);

    // ===== Upload image to Storage =====
    console.log("Step 3: Uploading image...");
    const imageId = crypto.randomUUID();
    const imagePath = `${profile.id}/${imageId}.jpg`;

    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadError } = await supabaseClient.storage
      .from("handwriting-submissions")
      .upload(imagePath, bytes, { contentType: "image/jpeg", upsert: false });

    if (uploadError) console.error("Upload error:", uploadError);

    // ===== Cleanup old images (keep last 5) =====
    console.log("Step 4: Cleaning up old images...");
    const { data: oldSubs } = await supabaseClient
      .from("maths_working_submissions")
      .select("id, image_path, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (oldSubs && oldSubs.length >= 5) {
      const toClean = oldSubs.slice(0, oldSubs.length - 4);
      for (const sub of toClean) {
        if (sub.image_path) {
          await supabaseClient.storage.from("handwriting-submissions").remove([sub.image_path]);
          await supabaseClient.from("maths_working_submissions").update({ image_path: null }).eq("id", sub.id);
        }
      }
    }

    // ===== Insert submission =====
    console.log("Step 5: Saving submission...");
    await supabaseClient.from("maths_working_submissions").insert({
      profile_id: profile.id,
      worked_solution_type: solType,
      correct_answer: assessment.correct_answer,
      clear_working: assessment.clear_working,
      correct_method: assessment.correct_method,
      neat_layout: assessment.neat_layout,
      composite_score: assessment.composite_score,
      transcribed_working: assessment.transcribed_working,
      feedback: assessment.feedback,
      overall_rating: assessment.overall_rating,
      annotations: assessment.annotations || [],
      bonus_xp_awarded: bonusXpAwarded,
      image_path: uploadError ? null : imagePath,
      input_method: inputMethod || "photographed",
      subject_name: subjectName || null,
      topic_name: topicName || null,
      question,
    });

    return new Response(
      JSON.stringify({
        success: true,
        assessment: {
          ...assessment,
          bonus_xp_awarded: bonusXpAwarded,
        },
        imagePath: uploadError ? null : imagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in assess-maths-working:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
