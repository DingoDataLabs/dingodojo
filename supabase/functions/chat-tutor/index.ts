import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
interface Message {
  role: string;
  content: string;
}

interface CurrentQuestion {
  question?: string;
  options?: string[];
  correct_answer?: number | string;
  hint?: string;
}

const validateInput = (data: unknown): { valid: boolean; error?: string; data?: {
  messages: Message[];
  topicName?: string;
  lessonContent?: { title?: string };
  currentQuestion?: CurrentQuestion;
  studentAnswer?: number | string;
  gradeLevel?: string;
}} => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const body = data as Record<string, unknown>;

  // Required: messages array
  if (!Array.isArray(body.messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  if (body.messages.length > 50) {
    return { valid: false, error: 'Maximum 50 messages allowed' };
  }

  for (const msg of body.messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: 'Each message must be an object' };
    }
    const message = msg as Record<string, unknown>;
    if (typeof message.role !== 'string' || !['user', 'assistant', 'system'].includes(message.role)) {
      return { valid: false, error: 'Invalid message role' };
    }
    if (typeof message.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }
    if (message.content.length > 5000) {
      return { valid: false, error: 'Message content exceeds maximum length of 5000 characters' };
    }
  }

  // Optional string fields
  if (body.topicName !== undefined && (typeof body.topicName !== 'string' || body.topicName.length > 200)) {
    return { valid: false, error: 'topicName must be a string with max 200 characters' };
  }
  if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 50)) {
    return { valid: false, error: 'gradeLevel must be a string with max 50 characters' };
  }

  // Optional lessonContent
  if (body.lessonContent !== undefined) {
    if (typeof body.lessonContent !== 'object' || body.lessonContent === null) {
      return { valid: false, error: 'lessonContent must be an object' };
    }
    const lessonContent = body.lessonContent as Record<string, unknown>;
    if (lessonContent.title !== undefined && (typeof lessonContent.title !== 'string' || lessonContent.title.length > 500)) {
      return { valid: false, error: 'lessonContent.title must be a string with max 500 characters' };
    }
  }

  // Optional currentQuestion
  if (body.currentQuestion !== undefined) {
    if (typeof body.currentQuestion !== 'object' || body.currentQuestion === null) {
      return { valid: false, error: 'currentQuestion must be an object' };
    }
    const currentQuestion = body.currentQuestion as Record<string, unknown>;
    if (currentQuestion.question !== undefined && (typeof currentQuestion.question !== 'string' || currentQuestion.question.length > 2000)) {
      return { valid: false, error: 'currentQuestion.question must be a string with max 2000 characters' };
    }
    if (currentQuestion.options !== undefined) {
      if (!Array.isArray(currentQuestion.options) || currentQuestion.options.length > 10) {
        return { valid: false, error: 'currentQuestion.options must be an array with max 10 items' };
      }
      for (const opt of currentQuestion.options) {
        if (typeof opt !== 'string' || opt.length > 500) {
          return { valid: false, error: 'Each option must be a string with max 500 characters' };
        }
      }
    }
    if (currentQuestion.hint !== undefined && (typeof currentQuestion.hint !== 'string' || currentQuestion.hint.length > 1000)) {
      return { valid: false, error: 'currentQuestion.hint must be a string with max 1000 characters' };
    }
  }

  return {
    valid: true,
    data: {
      messages: body.messages as Message[],
      topicName: body.topicName as string | undefined,
      lessonContent: body.lessonContent as { title?: string } | undefined,
      currentQuestion: body.currentQuestion as CurrentQuestion | undefined,
      studentAnswer: body.studentAnswer as number | string | undefined,
      gradeLevel: body.gradeLevel as string | undefined,
    }
  };
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const { messages, topicName, lessonContent, currentQuestion, studentAnswer, gradeLevel } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about what question the student is working on
    let questionContext = "";
    if (currentQuestion) {
      questionContext = `
The student is currently working on this question:
Question: ${currentQuestion.question}
Options: ${currentQuestion.options?.join(", ") || "N/A"}
${studentAnswer !== undefined ? `Their answer: ${currentQuestion.options?.[studentAnswer as number] || studentAnswer}` : "They haven't answered yet."}
Correct answer: ${currentQuestion.options?.[currentQuestion.correct_answer as number] || currentQuestion.correct_answer}
Hint (use to guide them): ${currentQuestion.hint || "No hint available"}

IMPORTANT: If they got it wrong, DO NOT reveal the correct answer! Instead:
1. Acknowledge their attempt positively
2. Use the hint to guide their thinking
3. Ask a guiding question to help them reconsider
4. Encourage them to try again`;
    }

    const systemPrompt = `You are Mirri, a friendly and encouraging AI study buddy for Australian primary school students (${gradeLevel || "Years 5-6"}, ages 10-11). 

Your personality:
- Warm, patient, and enthusiastic about learning
- Use friendly Australian expressions occasionally (like "No worries!", "Good on ya!", "Ripper!")
- Celebrate small wins with encouragement
- NEVER make kids feel bad for getting things wrong
- Keep responses SHORT (2-3 sentences max) and age-appropriate
- Use simple language and emojis sparingly 🦘

Current topic: ${topicName}
${lessonContent ? `Lesson context: The student is learning about ${lessonContent.title || topicName}` : ''}
${questionContext}

CRITICAL GUIDELINES:
- NEVER directly give away answers to questions
- When a student gets something wrong, guide them with hints and questions, NOT the answer
- Help explain concepts in different ways if they're confused
- Use the Socratic method - ask leading questions to help them discover the answer
- Stay focused on the current topic
- Be encouraging and positive - every attempt is progress!
- If asked something off-topic, gently redirect to the lesson
- If they're really stuck after multiple attempts, give stronger hints but still let them figure it out`;

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
          ...messages,
        ],
        stream: true,
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
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat tutor error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
