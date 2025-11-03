import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { Sparkles as SparklesComp } from '../components/ui/sparkles';
import { Button } from '../components/ui/button';
import PricingSection4 from '../components/ui/pricing-section-4';
import { WhyItWorks } from '../components/ui/WhyItWorks';
import { BenefitsSection } from '../components/ui/BenefitsSection';
import { SplashCursor } from '../components/ui/splash-cursor';
import { WaitlistForm } from '../components/ui/WaitlistForm';
import {
  Mail,
  Shield,
  Zap,
  Lock,
  CheckCircle,
  Clock,
  BarChart3,
  ChevronDown,
  Eye,
  Navigation,
  Ban,
} from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      question: "Can I undo a move?",
      answer: "Yes, 1-click restore in the app."
    },
    {
      question: "Do you read my emails?",
      answer: "We analyze headers + small snippets to classify; no selling data."
    },
    {
      question: "What if something important is filtered?",
      answer: "Allowlist contacts, and we never move recent two-way threads."
    },
    {
      question: "Is this easy to remove?",
      answer: "Yes, disconnect in one click; labels remain for your records."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <>
      <SplashCursor />
      <div className="min-h-screen bg-black relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px] z-10 pointer-events-none" />
      <SparklesComp
        density={800}
        direction="top"
        speed={0.5}
        color="#FFFFFF"
        className="absolute inset-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)] z-20 pointer-events-none"
      />

      <nav className="relative z-50 border-b border-neutral-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logoexample1.png"
                alt="Inbox Defender logo"
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-semibold text-white">Inbox Defender</h1>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-gray-300 hover:text-white transition-colors">FAQ</a>
              <Button onClick={handleGoogleSignIn} disabled={isLoading} className="bg-gradient-to-t from-blue-500 to-blue-600 border border-blue-500">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</> : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 py-32 px-4"
      >
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold text-white mb-8"
          >
            Stop cold emails from
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              cluttering your inbox
            </span>
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            AI-powered email filtering that keeps your inbox clean without missing important messages
          </motion.p>
          <motion.div variants={itemVariants}>
            <WaitlistForm />
          </motion.div>
        </div>
      </motion.section>

      <section id="features" className="py-24 relative z-10">
        <WhyItWorks className="mb-16" accentColor="rgb(59, 130, 246)" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800 border border-blue-500 text-white px-8 py-6 w-full sm:w-auto"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</>
              ) : (
                'Start free trial'
              )}
            </Button>
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              variant="outline"
              className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 px-8 py-6 w-full sm:w-auto flex items-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>Gmail</span>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px bg-zinc-800 w-16"></div>
            <span className="text-zinc-600 text-sm">OR</span>
            <div className="h-px bg-zinc-800 w-16"></div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <Button
              size="lg"
              variant="outline"
              className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 px-8 py-6"
              onClick={() => window.open('https://cal.com/bliztic/email', '_blank')}
            >
              Book a call
            </Button>
          </motion.div>

          <motion.p variants={itemVariants} className="text-center text-sm text-zinc-500">
            Secure Google OAuth • No password sharing • You stay in control
          </motion.p>
        </motion.div>
      </section>

      <section className="py-24 relative z-10">
        <BenefitsSection accentColor="rgb(59, 130, 246)" />
      </section>

      <PricingSection4 />

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-20 relative z-10"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-10 border border-neutral-800 shadow-xl"
          >
            <Lock className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <p className="text-gray-300 text-lg leading-relaxed">
              Uses Gmail API with Google OAuth. We only store minimal metadata to operate features. You can undo any move.
            </p>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="faq"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 relative z-10"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            variants={itemVariants}
            className="text-4xl font-semibold text-center text-white mb-16"
          >
            Frequently asked questions
          </motion.h2>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-xl border border-neutral-800 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-neutral-800/50 transition-colors duration-200"
                >
                  <span className="font-semibold text-white text-lg">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-6">
                        <p className="text-gray-300 text-lg leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.footer
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="border-t border-neutral-800 py-20 relative z-10"
        id="support"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800 border border-blue-500 text-white text-lg px-8 py-6"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</> : 'Sign in with Google'}
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row justify-between items-center"
          >
            <div className="flex gap-8 mb-8 md:mb-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Docs</a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy</a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">Terms</a>
              <a href="mailto:info@bliztic.com" className="text-gray-400 hover:text-white transition-colors duration-200">Support</a>
            </div>

            <p className="text-gray-500 text-sm">
              Not affiliated with Google. Gmail™ is a trademark of Google LLC.
            </p>
          </motion.div>
        </div>
      </motion.footer>
      </div>
    </>
  );
}
