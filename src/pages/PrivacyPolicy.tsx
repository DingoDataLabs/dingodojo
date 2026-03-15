import { Link } from "react-router-dom";
import dingoLogo from "@/assets/dingo-logo.png";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">Privacy Policy</h1>
          <p className="text-primary-foreground/70 mt-2">Last updated: March 2026</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">

          <h2>1. About This Policy</h2>
          <p>Dingo Dojo is an online learning platform designed for Australian school students. The platform is operated by Dingo Stack (ABN 50 488 099 569) ('we', 'us', 'our'). This Privacy Policy explains how we collect, use, store, and protect personal information in connection with the Dingo Dojo platform. It applies to parents and guardians who create accounts, and to the child users whose learning activity occurs on the platform.</p>
          <p>We are committed to complying with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). Given that our platform is designed for children, we take the protection of children's information especially seriously.</p>

          <h2>2. Account Registration</h2>
          <p>Dingo Dojo accounts must be created by a parent or guardian. Children under 18 may not register independently. By creating an account, the parent or guardian consents to the collection and use of their own information and their child's information as described in this policy.</p>

          <h2>3. Information We Collect</h2>
          <h3>About the parent or guardian</h3>
          <p>When you register, we collect:</p>
          <ul>
            <li>Your email address</li>
            <li>Your subscription and billing information (processed securely by Stripe — we do not store payment card details)</li>
          </ul>
          <h3>About the child</h3>
          <p>When you set up a child's profile, we collect:</p>
          <ul>
            <li>First name or display name</li>
            <li>School year / age group</li>
            <li>Learning progress, XP, and activity data generated through use of the platform</li>
          </ul>
          <p>We do not collect the child's email address, phone number, home address, or any government identifier.</p>

          <h2>4. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account and subscription</li>
            <li>Deliver and personalise the learning experience for your child</li>
            <li>Track curriculum progress, XP, and achievement milestones</li>
            <li>Process subscription payments via Stripe</li>
            <li>Send you important account and service communications</li>
            <li>Improve and develop the platform using aggregated, de-identified usage data</li>
            <li>Comply with our legal obligations</li>
          </ul>
          <p>We do not use your child's personal information for advertising purposes, and we do not sell personal information to third parties.</p>

          <h2>5. Analytics and Usage Data</h2>
          <p>We may use analytics tools to understand how the platform is used — for example, which features are most helpful and where learners encounter difficulties. Any analytics we use will be selected to minimise personal data collection and will be governed by appropriate data processing agreements. Where analytics tools process personal data, they will be listed in an updated version of this policy.</p>
          <p>Usage data collected for analytics purposes is used only to improve the platform and is not shared with advertisers or third-party marketers.</p>

          <h2>6. Dojo Crew (Social Features)</h2>
          <p>Dingo Dojo includes a 'Dojo Crew' feature that allows children to connect with friends on the platform. This feature:</p>
          <ul>
            <li>Displays only the child's chosen username — never their real name or any other personal information</li>
            <li>Requires both parties to initiate and accept a connection request before a friendship is established</li>
            <li>Allows connected friends to view each other's learning activity and XP progress</li>
            <li>Does not include direct messaging or open communication between users</li>
          </ul>
          <p>Parents and guardians are responsible for ensuring their child uses an appropriate pseudonymous username and does not use their real name as their username. Dingo Dojo displays only the username as provided — we have no way of knowing whether a username reflects a real name or a pseudonym.</p>
          <p>We encourage parents and guardians to supervise their child's use of the Dojo Crew feature and to review the username their child has chosen before connecting with others.</p>

          <h2>7. Disclosure of Information</h2>
          <p>We do not sell, rent, or trade personal information. We may share information only in the following circumstances:</p>
          <ul>
            <li><strong>Service providers:</strong> We use trusted third-party services to operate the platform, including Supabase (database and authentication), Stripe (payment processing), and Google (AI-powered learning features). These providers are contractually required to handle data securely and only for the purposes we specify.</li>
            <li><strong>Legal obligations:</strong> We may disclose information if required by law, court order, or to protect the safety of our users.</li>
            <li><strong>Business transfer:</strong> In the unlikely event of a sale or merger, personal information may be transferred as part of that transaction. We will notify affected users in advance.</li>
          </ul>

          <h2>8. Data Storage and Security</h2>
          <p>Your information is stored on secure servers provided by Supabase. Data may be hosted in Australia or internationally, including in the United States. Where data is transferred overseas, we take steps to ensure it is protected in accordance with the Australian Privacy Principles.</p>
          <p>We implement appropriate technical and organisational security measures to protect personal information from unauthorised access, disclosure, alteration, or loss. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>

          <h2>9. Data Retention</h2>
          <p>We retain personal information for as long as your account is active or as needed to provide our services. When you delete your account (see Section 10), your personal data is permanently removed from our systems within a reasonable timeframe, except where we are required by law to retain certain records.</p>

          <h2>10. Your Rights and Account Deletion</h2>
          <p>As a parent or guardian, you have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you and your child</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for optional data uses</li>
          </ul>
          <p>You can delete your account directly within the Dingo Dojo app. Account deletion will permanently remove your profile and your child's learning data. For access or correction requests, please <Link to="/contact" className="text-primary hover:underline">contact us</Link>.</p>

          <h2>11. Children's Privacy</h2>
          <p>Dingo Dojo is designed specifically for Australian school students. We take the following steps to protect children's privacy:</p>
          <ul>
            <li>Only parents and guardians may create accounts and provide consent</li>
            <li>We collect only the minimum information necessary for the platform to function</li>
            <li>We do not display advertising to child users</li>
            <li>Social features are limited and do not expose real names or enable open messaging</li>
            <li>We do not knowingly collect personal information from children without parental consent</li>
          </ul>
          <p>If you believe we have inadvertently collected information from a child without appropriate consent, please contact us immediately and we will take prompt steps to delete it.</p>

          <h2>12. Cookies and Similar Technologies</h2>
          <p>We use cookies and similar technologies to maintain your session, remember your preferences, and support the operation of the platform. We do not use third-party advertising cookies. You can control cookie settings through your browser, but disabling certain cookies may affect the functionality of the platform.</p>

          <h2>13. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time to reflect changes to our practices or legal requirements. When we make material changes, we will provide at least 30 days' notice by email and by posting a prominent notice on the platform, before the changes take effect. The date at the top of this policy indicates when it was last updated. Continued use of the platform after the notice period constitutes acceptance of the updated policy.</p>

          <h2>14. Contact Us</h2>
          <p>If you have questions, concerns, or complaints about this Privacy Policy or how we handle your personal information, please <Link to="/contact" className="text-primary hover:underline">contact us</Link>.</p>
          <p>We will respond to privacy inquiries within a reasonable timeframe. If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.oaic.gov.au</a>.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>Dingo Stack · ABN 50 488 099 569</p>
        </div>
      </footer>
    </div>
  );
}
