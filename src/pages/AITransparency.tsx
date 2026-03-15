import { Link } from "react-router-dom";
import dingoLogo from "@/assets/dingo-logo.png";
import { ArrowLeft } from "lucide-react";

export default function AITransparency() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative" style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)) 0%, hsl(var(--ochre)) 50%, hsl(var(--ochre-light)) 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-16">
          <nav className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img src={dingoLogo} alt="Dingo Dojo" className="w-12 h-12" />
              <span className="text-xl font-display font-bold text-primary-foreground">Dingo Dojo</span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </nav>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">Responsible AI & Transparency Disclosure</h1>
          <p className="text-primary-foreground/70 mt-2">Version 1.0 · Effective March 2026</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">

          <p>Dingo Dojo uses artificial intelligence (AI) to personalise learning experiences for Australian school students. We believe families and schools deserve to understand exactly how AI is used, what data is involved, and who provides the underlying technology. This document explains all of that in plain English.</p>
          <p>We are committed to using AI responsibly, protecting the privacy of children, and being transparent whenever our AI systems change.</p>

          <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-6 not-prose mb-8">
            <h3 className="font-display font-bold text-foreground text-lg mb-3">Our AI Commitment</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-secondary font-bold">✔</span> AI is used only to help students learn — never to profile, advertise to, or manipulate children.</li>
              <li className="flex items-start gap-2"><span className="text-secondary font-bold">✔</span> No student data is used to train AI models.</li>
              <li className="flex items-start gap-2"><span className="text-secondary font-bold">✔</span> Parents and schools will be notified of any material changes to the AI systems we use.</li>
              <li className="flex items-start gap-2"><span className="text-secondary font-bold">✔</span> All AI interactions are designed for school aged students and include content safety guidelines.</li>
            </ul>
          </div>

          <h2>1. Overview of AI Features</h2>
          <p>Dingo Dojo uses AI in five distinct ways, each serving a specific educational purpose:</p>
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-display font-bold text-foreground">AI Feature</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">How It Works</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">Data Sent to AI</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">Stored?</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border"><td className="p-3 font-medium">Lesson Generation</td><td className="p-3">Creates personalised lesson content</td><td className="p-3">Topic name, year level, XP progress</td><td className="p-3">No (transient)</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Writing Assessment</td><td className="p-3">Reviews and provides feedback on writing</td><td className="p-3">Student's written text, question prompt</td><td className="p-3">Yes (submission record)</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Maths Working Assessment</td><td className="p-3">Reviews photos/drawings of maths working</td><td className="p-3">Photo/drawing of student's work</td><td className="p-3">Yes (image + record, up to 5 kept)</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Handwriting Assessment</td><td className="p-3">Reads and assesses handwritten responses</td><td className="p-3">Photo of handwritten work</td><td className="p-3">Yes (image + record, up to 5 kept)</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Mirri — AI Study Buddy</td><td className="p-3">Answers student questions and provides hints</td><td className="p-3">Conversation messages, question context</td><td className="p-3">No (session only)</td></tr>
              </tbody>
            </table>
          </div>

          <h2>2. Detailed AI Feature Descriptions</h2>

          <h3>2.1 Lesson Generation</h3>
          <p>When a student starts a learning session (called a Mission), Dingo Dojo automatically creates a fresh lesson tailored to the student's year level and current progress in that topic. No two lessons are identical. The lesson is generated in three sequential steps:</p>
          <ul>
            <li><strong>Scaffold</strong> — the core teaching content (explanations, examples, fun facts)</li>
            <li><strong>Checks</strong> — comprehension questions based on the scaffold sections</li>
            <li><strong>Challenge</strong> — harder questions and writing or maths tasks</li>
          </ul>
          <p><strong>What is sent to the AI:</strong> the topic name, subject, year level (e.g. 'Year 5'), and the student's XP progress in that topic. No personally identifying information (name, school, email) is included in these requests.</p>
          <p><strong>What the AI returns:</strong> structured lesson content in a format the app can display. The content is immediately shown to the student and is not stored in the database — each session generates content fresh.</p>
          <p><strong>Arithmetic validation:</strong> for Maths lessons, all AI-generated answers are independently recalculated by a server-side maths library (Math.js) to catch any errors before the student sees the question.</p>

          <h3>2.2 Writing Assessment</h3>
          <p>For English Missions at all levels and bonus subject Missions, students may be asked to write a short creative or informational piece (typically 50–300 words). When the student submits their writing, the AI reads their response and provides personalised feedback.</p>
          <p><strong>What is sent to the AI:</strong> the student's typed text, the question prompt, assessment criteria, word count requirements, and year level. No name or account details are included.</p>
          <p><strong>What the AI returns:</strong> a score, an overall rating, 2–3 sentences of general feedback, a list of strengths, improvement suggestions, and specific inline annotations highlighting good phrases or areas for improvement.</p>
          <p><strong>What is stored:</strong> the submission record (score, feedback, rating, annotations). The student's raw typed text is not stored independently — only the AI-generated assessment output is retained.</p>

          <h3>2.3 Maths Working Assessment</h3>
          <p>At the Extending and Mastering difficulty levels in Mathematics, students may be asked to demonstrate their working-out on paper or on a digital drawing canvas. The student then submits a photo or their canvas drawing, and the AI reviews their approach.</p>
          <p>This feature operates in two AI steps:</p>
          <ul>
            <li><strong>Step 1 — Image validation:</strong> confirms the image shows mathematical working.</li>
            <li><strong>Step 2 — Assessment:</strong> the AI scores four criteria (correct answer, clear working, correct method, neat layout) each rated 1–5, provides feedback, and highlights correct steps with praise or flags errors with gentle corrections.</li>
          </ul>

          <h3>2.4 Handwriting Assessment (Champion plan)</h3>
          <p>Champion subscribers can handwrite their responses on paper and submit a photo. This feature is designed to practise both writing quality and content simultaneously.</p>
          <p>This feature operates in three AI steps:</p>
          <ul>
            <li><strong>Step 1 — Image validation:</strong> confirms the image shows handwritten work on paper.</li>
            <li><strong>Step 2 — Handwriting assessment:</strong> assesses letter formation, spacing and sizing, and overall presentation, each rated 1–5. It also transcribes the handwritten text exactly as written.</li>
            <li><strong>Step 3 — Content assessment:</strong> the transcribed text is assessed for writing quality using the same criteria as the digital writing assessment.</li>
          </ul>
          <p><strong>What is stored:</strong> handwriting scores, content scores, feedback, and the transcribed text. The image is stored and automatically cleaned up — only the five most recent submissions per student are retained.</p>

          <h3>2.5 Mirri — AI Study Buddy</h3>
          <p>Mirri is Dingo Dojo's AI tutor avatar — a friendly dingo character who appears as a chat assistant during lessons. Students can ask Mirri questions about the topic, ask for hints, or request an explanation of a concept in a different way.</p>
          <p>Mirri is specifically designed not to give away answers. Instead, Mirri uses a Socratic approach — asking guiding questions and providing hints that help the student discover the answer themselves.</p>
          <p><strong>What is sent to the AI:</strong> the conversation history for the current session (up to 50 messages), the topic name, the current question context, and the student's year level.</p>
          <p><strong>What the AI returns:</strong> a short conversational response (2–3 sentences), streamed to the screen in real time.</p>
          <p><strong>What is stored:</strong> nothing. Mirri chat messages are session-only and are not saved to the database.</p>

          <h2>3. Which AI Technology Is Used</h2>
          <p>All AI features in Dingo Dojo are currently powered by Google Gemini 2.5 Flash, a large language model (LLM) developed by Google DeepMind.</p>
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border"><td className="p-3 font-medium text-foreground bg-muted">AI Provider</td><td className="p-3">Google DeepMind (via Lovable AI Gateway)</td></tr>
                <tr className="border-b border-border"><td className="p-3 font-medium text-foreground bg-muted">Model</td><td className="p-3">Google Gemini 2.5 Flash</td></tr>
                <tr className="border-b border-border"><td className="p-3 font-medium text-foreground bg-muted">Infrastructure</td><td className="p-3">Supabase Edge Functions (Deno runtime)</td></tr>
                <tr className="border-b border-border"><td className="p-3 font-medium text-foreground bg-muted">Database</td><td className="p-3">Supabase (PostgreSQL)</td></tr>
                <tr><td className="p-3 font-medium text-foreground bg-muted">Maths Validation</td><td className="p-3">Math.js (open-source, server-side only)</td></tr>
              </tbody>
            </table>
          </div>
          <p>Google Gemini 2.5 Flash was chosen because it is capable of understanding Australian English and curriculum content, processing images (required for handwriting and maths working features), and responding appropriately for a children's educational context. Google's policy, as of the time of writing, is that data submitted via the API is not used to train Google's AI models by default.</p>

          <h2>4. How Student Data Is Handled</h2>
          <h3>4.1 What data is sent to the AI model</h3>
          <ul>
            <li>Topic and subject name (e.g. 'Fractions', 'Maths')</li>
            <li>Year level (e.g. 'Year 5' or 'Year 6')</li>
            <li>Student's XP progress within a topic</li>
            <li>Student's typed writing responses (for writing assessment)</li>
            <li>Images submitted by the student (photos or drawings)</li>
            <li>Chat messages in the current Mirri session</li>
            <li>The current question text and context (for Mirri tutoring)</li>
          </ul>
          <p><strong>What is never sent to the AI:</strong> the student's full name, email address, parent contact details, school name, date of birth, or any account credentials.</p>

          <h3>4.2 Data storage and retention</h3>
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-display font-bold text-foreground">Feature</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">What Is Stored</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">Retention</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border"><td className="p-3">Lesson Generation</td><td className="p-3">Nothing (transient)</td><td className="p-3">Session only</td></tr>
                <tr className="border-t border-border"><td className="p-3">Writing Assessment</td><td className="p-3">Score, feedback, rating, annotations</td><td className="p-3">Until account deletion</td></tr>
                <tr className="border-t border-border"><td className="p-3">Maths Working</td><td className="p-3">Score, feedback, transcription, image</td><td className="p-3">Image: 5 most recent. Record: until deletion</td></tr>
                <tr className="border-t border-border"><td className="p-3">Handwriting</td><td className="p-3">Score, feedback, HW scores, transcription, image</td><td className="p-3">Image: 5 most recent. Record: until deletion</td></tr>
                <tr className="border-t border-border"><td className="p-3">Mirri Chat</td><td className="p-3">Nothing</td><td className="p-3">Session only</td></tr>
              </tbody>
            </table>
          </div>

          <h3>4.3 Children's privacy</h3>
          <ul>
            <li>Accounts are created and managed by parents or guardians. Children do not independently register.</li>
            <li>We do not collect or store children's full dates of birth, photos of faces, or location data.</li>
            <li>Images submitted for handwriting or maths working are stored securely with access controls and are automatically purged over time (rolling 5-submission limit per feature).</li>
            <li>AI responses are generated under strict content guidelines — the AI is instructed to be encouraging, age-appropriate, and to never produce inappropriate content.</li>
            <li>No student data is used for advertising, sold to third parties, or used for any purpose beyond delivering the educational service.</li>
          </ul>

          <h2>5. How AI Costs Are Covered</h2>
          <p>Running AI models has a real cost. We believe in being transparent about how those costs are funded. AI usage costs are covered by subscription revenue from Dingo Dojo's paid plans. No third-party advertising revenue is involved.</p>
          <div className="overflow-x-auto not-prose mb-6">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-display font-bold text-foreground">Plan</th>
                  <th className="text-left p-3 font-display font-bold text-foreground">AI Features Included</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border"><td className="p-3 font-medium">Free</td><td className="p-3">Limited access to Lesson Generation and Mirri. AI costs on the free tier are subsidised by paying subscribers.</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Explorer</td><td className="p-3">Full access to Lesson Generation, Writing Assessment, Maths Working Assessment, and Mirri for core subjects.</td></tr>
                <tr className="border-t border-border"><td className="p-3 font-medium">Champion</td><td className="p-3">All Explorer features plus Handwriting Assessment and bonus subjects.</td></tr>
              </tbody>
            </table>
          </div>
          <p>We do not operate on an ad-supported model. We do not allow advertisers to influence AI content. AI-generated content is produced solely to serve the student's learning — not commercial interests.</p>

          <h2>6. Material Change Notification Policy</h2>
          <p>Dingo Dojo is committed to notifying users whenever we make a material change to the AI systems underpinning the platform. A 'material change' includes:</p>
          <ul>
            <li>Switching to a different AI model or provider</li>
            <li>Adding a new AI feature that processes student data in a new way</li>
            <li>Changing how student data is sent to or stored from AI systems</li>
            <li>A significant change to what data is retained and for how long</li>
          </ul>
          <p><strong>How we will notify you:</strong></p>
          <ul>
            <li>A notice will be posted on our website on this AI Transparency page, or registered users will be notified via email</li>
            <li>The version number and effective date of this document will be updated</li>
            <li>For significant changes, in-app notifications will be displayed upon login</li>
          </ul>

          <h2>7. AI Limitations and Human Oversight</h2>
          <h3>Known limitations</h3>
          <ul>
            <li>AI-generated content may occasionally contain inaccuracies. For Maths, we have implemented server-side arithmetic validation (Math.js) as an independent check.</li>
            <li>AI assessment of student writing is designed to be encouraging and formative, not high-stakes. It should not be treated as equivalent to a teacher's professional assessment.</li>
            <li>AI chat responses (Mirri) are limited to a session context window. Mirri does not remember previous sessions.</li>
            <li>Image-based AI features work best with clear, well-lit photographs. Poor image quality may affect assessment accuracy.</li>
          </ul>
          <h3>Human oversight</h3>
          <ul>
            <li>Dingo Dojo's team reviews AI-generated lesson quality on a regular basis.</li>
            <li>Parents can view their child's AI assessment results at any time through the Progress section of the app.</li>
            <li>Students and parents can report concerns about AI-generated content using the in-app feedback mechanism or by <Link to="/contact" className="text-primary hover:underline">contacting us</Link> directly.</li>
            <li>We do not use AI to make decisions about a student's academic standing, school placement, or any high-stakes outcome.</li>
          </ul>

          <h2>8. Curriculum Alignment and Content Safety</h2>
          <p>All AI-generated lesson content is anchored to the NSW Mathematics Stage 3 curriculum and general Australian primary English standards. Content safety measures built into our AI prompts include:</p>
          <ul>
            <li>The AI is instructed to use Australian English spelling and Australian contexts</li>
            <li>All AI responses are required to be age-appropriate for school aged students</li>
            <li>The AI is explicitly prohibited from generating negatively-framed questions</li>
            <li>The AI tutoring assistant (Mirri) is instructed to never reveal answers directly</li>
            <li>Assessment feedback is always required to be positive, encouraging, and constructive</li>
          </ul>

          <h2>9. Your Rights and How to Contact Us</h2>
          <p>Parents and guardians have the following rights regarding AI-processed data:</p>
          <ul>
            <li><strong>Access:</strong> request a summary of the AI-generated assessment data stored for your child</li>
            <li><strong>Deletion:</strong> request deletion of your child's account and all associated data</li>
            <li><strong>Correction:</strong> if you believe an AI assessment result is significantly inaccurate or unfair, contact us to have it reviewed</li>
          </ul>
          <p>To exercise any of these rights, or to ask questions about this disclosure, please <Link to="/contact" className="text-primary hover:underline">contact us</Link>.</p>

          <h2>10. Updates to This Disclosure</h2>
          <p>This document will be reviewed and updated:</p>
          <ul>
            <li>Whenever a material change to our AI systems occurs (see Section 6)</li>
            <li>At least annually, to ensure accuracy</li>
            <li>When relevant laws or regulations affecting AI and children's privacy change in Australia</li>
          </ul>
          <p>Previous versions of this disclosure will be archived and available on request.</p>

          <p className="text-sm text-muted-foreground mt-8">Document Version 1.0 · Effective March 2026 · This disclosure is provided by Dingo Dojo for informational purposes. It does not constitute legal advice.</p>
        </div>
      </div>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>Dingo Stack · ABN 50 488 099 569</p>
        </div>
      </footer>
    </div>
  );
}
