import { useState } from "react";
import { Link } from "react-router-dom";
import dingoLogo from "@/assets/dingo-logo.png";
import { ArrowLeft, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (message.length > 2000) {
      toast.error("Message must be less than 2000 characters.");
      return;
    }
    setSending(true);
    // Simulate send — in production this would call an edge function
    await new Promise(r => setTimeout(r, 1200));
    toast.success("Message sent! We'll get back to you within 5 business days.");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setSending(false);
  };

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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">Contact Us</h1>
          <p className="text-primary-foreground/70 mt-2">We'd love to hear from you</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="bento-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Get in Touch</h2>
              <p className="text-sm text-muted-foreground">We aim to respond within 5 business days</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={100} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" maxLength={255} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" maxLength={200} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
              <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" maxLength={2000} rows={6} className="rounded-xl" />
              <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
            </div>
            <Button type="submit" disabled={sending} className="w-full h-12 rounded-xl font-semibold gap-2">
              {sending ? "Sending..." : <><Send className="w-4 h-4" /> Send Message</>}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dingo Stack</strong> · ABN 50 488 099 569
          </p>
          <p className="text-sm text-muted-foreground">
            For privacy concerns, you may also contact the <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Office of the Australian Information Commissioner</a>.
          </p>
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
