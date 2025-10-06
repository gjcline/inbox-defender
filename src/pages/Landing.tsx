import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { HeroSection } from '../components/ui/hero-section-9';
import { Button } from '../components/ui/button';
import PricingSection4 from '../components/ui/pricing-section-4';
import {
  Mail,
  Shield,
  Zap,
  Lock,
  CheckCircle,
  Clock,
  BarChart3,
  ChevronDown,
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
    <div className="min-h-screen bg-white">
      <HeroSection />

      <motion.section
        id="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 bg-gray-50 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-semibold text-center text-gray-900 mb-20"
          >
            How it works
          </motion.h2>

          <div className="grid lg:grid-cols-3 gap-12">
            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-200 transition-colors duration-300">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                1. Connect your Gmail
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Secure OAuth connection in seconds. No passwords, no risk.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-orange-200 transition-colors duration-300">
                <Zap className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                2. Our AI flags outreach emails in real-time
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Advanced machine learning identifies cold outreach and sales pitches.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:bg-green-200 transition-colors duration-300">
                <Shield className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                3. We move them to the "Outreach (AI)" folder
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Clean inbox, organized outreach. Undo anytime with one click.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 bg-white"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 transition-colors duration-300">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-xl">Save time</h3>
              <p className="text-gray-600 text-lg">Less noise, more signal</p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-xl">Safer defaults</h3>
              <p className="text-gray-600 text-lg">Allowlist your contacts</p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors duration-300">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-xl">Weekly digest</h3>
              <p className="text-gray-600 text-lg">See what we caught + restore</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <PricingSection4 />

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 bg-white"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.p variants={itemVariants} className="text-gray-600 mb-8 text-lg">Trusted by teams at</motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center items-center gap-8 opacity-60"
            >
              <img
                className="h-5 w-fit"
                src="https://html.tailus.io/blocks/customers/nvidia.svg"
                alt="Nvidia Logo"
                height="20"
                width="auto"
              />
              <img
                className="h-4 w-fit"
                src="https://html.tailus.io/blocks/customers/column.svg"
                alt="Column Logo"
                height="16"
                width="auto"
              />
              <img
                className="h-4 w-fit"
                src="https://html.tailus.io/blocks/customers/github.svg"
                alt="GitHub Logo"
                height="16"
                width="auto"
              />
              <img
                className="h-5 w-fit"
                src="https://html.tailus.io/blocks/customers/nike.svg"
                alt="Nike Logo"
                height="20"
                width="auto"
              />
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="max-w-4xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
              "Inbox Defender gave me my mornings back. I used to spend 20 minutes sorting through cold outreach—now my inbox only shows what matters."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-lg">Sarah Chen</p>
                <p className="text-gray-600">VP Marketing, TechCorp</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-20 bg-gray-50"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl p-10 border border-gray-200 shadow-sm"
          >
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-6" />
            <p className="text-gray-700 text-lg leading-relaxed">
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
        className="py-24 bg-white"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            variants={itemVariants}
            className="text-4xl font-semibold text-center text-gray-900 mb-16"
          >
            Frequently asked questions
          </motion.h2>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="font-semibold text-gray-900 text-lg">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-6 h-6 text-gray-500" />
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
                        <p className="text-gray-700 text-lg leading-relaxed">{faq.answer}</p>
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
        className="bg-gray-50 border-t border-gray-200 py-20"
        id="support"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <Button size="lg" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</> : 'Sign in with Google'}
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row justify-between items-center"
          >
            <div className="flex gap-8 mb-8 md:mb-0">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Docs</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Privacy</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Terms</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">Support</a>
            </div>

            <p className="text-gray-500 text-sm">
              Not affiliated with Google. Gmail™ is a trademark of Google LLC.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
