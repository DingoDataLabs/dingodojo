import { Link } from "react-router-dom";
import dingoLogo from "@/assets/dingo-logo.png";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditions() {
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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">Terms and Conditions of Use</h1>
          <p className="text-primary-foreground/70 mt-2">Last updated: 15 March 2026</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">

          <h2>1. Introduction</h2>
          <p>Welcome to Dingo Dojo. These Terms and Conditions ("Terms") govern your access to and use of the Dingo Dojo platform, including the website, web application, and all related services (collectively, the "Platform"). The Platform is operated by Dingo Stack (ABN 50 488 099 569) ("we", "us", or "our").</p>
          <p>By registering for an account or using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree, please do not use the Platform. These Terms constitute a legally binding agreement between you and us. We recommend you save or print a copy for your records.</p>

          <h2>2. Eligibility and Account Registration</h2>
          <h3>2.1 Who May Register</h3>
          <p>Dingo Dojo is an educational platform designed for children. Accounts must be created by a parent or legal guardian ("Account Holder") aged 18 years or over. Children access the Platform under the Account Holder's account and supervision. By creating an account, you confirm that:</p>
          <ul>
            <li>you are aged 18 years or over;</li>
            <li>you are the parent or legal guardian of the child or children who will use the Platform;</li>
            <li>you have the legal authority to enter into these Terms on behalf of yourself and to consent to the use of the Platform by the child or children in your care; and</li>
            <li>all information you provide during registration is accurate and up to date.</li>
          </ul>

          <h3>2.2 Account Security</h3>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately if you become aware of any unauthorised use of your account. We are not liable for any loss or damage arising from your failure to keep your credentials secure.</p>

          <h2>3. The Platform</h2>
          <p>Dingo Dojo is a gamified, AI-powered learning platform delivering curriculum-aligned educational content for children. The Platform may include interactive lessons and challenges, AI-generated content and feedback, progress and achievement systems, a virtual tutor assistant, and social features. We reserve the right to modify, add, or remove features of the Platform at any time.</p>

          <h2>4. Subscription Plans, Fees, and Billing</h2>
          <h3>4.1 Available Plans</h3>
          <p>The Platform is offered under a free plan with limited access and a paid plan with full access. We may also offer free trials, promotional pricing, or discounted subscriptions from time to time. The specific terms and duration of any such offer will be presented to you at sign-up.</p>

          <h3>4.2 Billing</h3>
          <p>Paid subscriptions are billed in advance on a recurring basis (monthly or annually, as selected at sign-up). All fees are displayed in Australian dollars (AUD) and are inclusive of any applicable Goods and Services Tax (GST) unless otherwise stated. Payment is processed through our third-party payment provider, Stripe. By providing payment details, you authorise us to charge your nominated payment method for all amounts due. You are responsible for ensuring your payment details remain current and valid.</p>

          <h3>4.3 No Refunds</h3>
          <p>All payments are non-refundable. Once a billing period has commenced, no refunds or credits will be issued for that period, including in the event of cancellation, non-use, or partial use of the Platform. This does not affect any rights you may have under the Australian Consumer Law that cannot be excluded.</p>

          <h3>4.4 Cancellation</h3>
          <p>You may cancel your paid subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period, and you will retain access to paid features until that date. No partial-period refunds are provided upon cancellation.</p>

          <h3>4.5 Free Trials and Promotional Offers</h3>
          <p>Where we offer a free trial or promotional period, your subscription will automatically convert to the applicable paid plan at the standard rate once that period ends. Charges will apply automatically without further notice. It is your responsibility to cancel before the end of any free or promotional period if you do not wish to be charged.</p>

          <h2>5. Acceptable Use</h2>
          <p>You agree to use the Platform only for its intended educational purpose and in accordance with these Terms and all applicable Australian laws. You must not:</p>
          <ul>
            <li>share your account credentials with any person who is not a child under your care;</li>
            <li>use the Platform for any unlawful, harmful, or fraudulent purpose;</li>
            <li>attempt to access, interfere with, or damage any part of the Platform, our servers, or third-party systems connected to the Platform;</li>
            <li>reverse-engineer, decompile, copy, or reproduce any part of the Platform;</li>
            <li>upload or transmit any content that is offensive, defamatory, abusive, or in violation of any third-party rights; or</li>
            <li>use automated tools (including bots or scrapers) to interact with the Platform.</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that breach these Terms or that we reasonably believe are being misused.</p>

          <h2>6. Privacy and Data Collection</h2>
          <h3>6.1 Personal Information We Collect</h3>
          <p>We collect the following personal information in connection with your use of the Platform:</p>
          <ul>
            <li>Account Holder information: name, email address, and payment details;</li>
            <li>Child profile information: first name or display name, school year / age group;</li>
            <li>Learning data: progress, XP, achievements, and activity generated through platform use.</li>
          </ul>

          <h3>6.2 How We Use Your Information</h3>
          <p>We use the personal information we collect to provide, operate, and improve the Platform; personalise learning content and track progress; process payments; communicate with Account Holders about their account and the Platform; and comply with our legal obligations.</p>

          <h3>6.3 Accounts Are Held by Parents or Guardians</h3>
          <p>Children do not register directly. All accounts are held by the Account Holder, who is responsible for managing the child's access. We do not knowingly collect personal information directly from children without the consent of a parent or guardian.</p>

          <h3>6.4 Privacy Policy</h3>
          <p>Our collection, use, and disclosure of personal information is further described in our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which forms part of these Terms and is available on the Platform.</p>

          <h2>7. Artificial Intelligence and Generated Content</h2>
          <p>The Platform uses artificial intelligence technology to generate educational content, including lesson questions, worked examples, writing prompts, and feedback, as well as to power our virtual tutor assistant. Further details are set out in our <Link to="/ai-transparency" className="text-primary hover:underline">AI Transparency Statement</Link>, available on the Platform. You acknowledge and agree that:</p>
          <ul>
            <li>AI-generated content is produced algorithmically and may occasionally contain errors or inaccuracies;</li>
            <li>AI-generated content does not constitute professional educational or specialist advice; and</li>
            <li>we do not guarantee that AI-generated content will be free from errors and we are not liable for any reliance placed on it.</li>
          </ul>
          <p>Account Holders are encouraged to review their child's use of the Platform and to contact us if they have concerns about any content on the Platform.</p>

          <h2>8. Intellectual Property</h2>
          <p>All content on the Platform, including text, graphics, logos, mascots, illustrations, software, curriculum materials, and AI-generated content, is owned by or licensed to us and is protected by Australian and international intellectual property laws.</p>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for your personal, non-commercial educational purposes. You may not copy, reproduce, distribute, publish, modify, or create derivative works from any Platform content without our prior written consent.</p>
          <p>All rights not expressly granted in these Terms are reserved by us.</p>

          <h2>9. Disclaimers and Limitation of Liability</h2>
          <h3>9.1 Platform Provided "As Is"</h3>
          <p>To the fullest extent permitted by applicable law, the Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free from harmful components.</p>

          <h3>9.2 Educational Outcomes</h3>
          <p>We do not guarantee any particular educational outcomes or academic results from use of the Platform. The Platform is designed to supplement, not replace, formal schooling and parental involvement in a child's education.</p>

          <h3>9.3 Limitation of Liability</h3>
          <p>To the fullest extent permitted by law, our total liability to you for any claim arising out of or in connection with these Terms or the Platform is limited to the total fees paid by you to us in the 12 months preceding the event giving rise to the claim. We are not liable for any indirect, incidental, special, consequential, or punitive loss or damage, even if we have been advised of the possibility of such loss.</p>

          <h3>9.4 Australian Consumer Law</h3>
          <p>Nothing in these Terms excludes, restricts, or modifies any right or guarantee you have under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010 (Cth)) that cannot lawfully be excluded. To the extent permitted by the ACL, our liability for breach of any non-excludable guarantee is limited to re-supplying the relevant service or paying the cost of having it re-supplied.</p>

          <h2>10. Termination</h2>
          <p>We may suspend or terminate your access to the Platform at any time if we reasonably believe you have breached these Terms, if required by law, or if we cease operating the Platform. We will endeavour to provide reasonable notice where practicable.</p>
          <p>You may close your account at any time by <Link to="/contact" className="text-primary hover:underline">contacting us</Link>. Upon termination, your access to the Platform will cease and we may delete your account data in accordance with our Privacy Policy, subject to any legal retention obligations.</p>

          <h2>11. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. We will notify Account Holders of material changes by email or by displaying a notice on the Platform before the changes take effect. Your continued use of the Platform after updated Terms become effective constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Platform and cancel any paid subscription before the changes take effect.</p>

          <h2>12. Governing Law and Disputes</h2>
          <p>These Terms are governed by the laws of Australia. Any dispute arising out of or in connection with these Terms or the Platform will be subject to the exclusive jurisdiction of the courts of Australia. We encourage you to contact us in the first instance to resolve any concern informally before commencing formal proceedings.</p>

          <h2>13. Contact Us</h2>
          <p>If you have any questions, concerns, or complaints about these Terms or the Platform, please reach out via our <Link to="/contact" className="text-primary hover:underline">Contact Us</Link> page.</p>
          <p>We aim to respond to all enquiries within 5 business days.</p>
          <p className="text-sm text-muted-foreground mt-8">Dingo Dojo — Terms and Conditions — 15 March 2026</p>
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
