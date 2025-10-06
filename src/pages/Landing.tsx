import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { Sparkles as SparklesComp } from '../components/ui/sparkles';
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px]" />
      <SparklesComp
        density={800}
        direction="top"
        speed={0.5}
        color="#FFFFFF"
        className="absolute inset-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
      />

      <nav className="relative z-50 border-b border-neutral-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Inbox Defender</h1>
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
            <Button
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800 border border-blue-500 text-white text-lg px-8 py-6"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 bg-black relative z-10"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
              Why it works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Inbox Defender doesn't just hide noise—it reduces it.
            </p>
          </motion.div>

          <div className="space-y-8 mb-12">
            <motion.div variants={itemVariants} className="flex items-start gap-6 group">
              <div className="w-14 h-14 bg-blue-900/30 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-900/50 transition-colors duration-300">
                <Eye className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Detect
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Recognizes cold outreach and sales sequences the moment they arrive.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start gap-6 group">
              <div className="w-14 h-14 bg-orange-900/30 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-900/50 transition-colors duration-300">
                <Navigation className="w-7 h-7 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Deflect
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Routes them to a quiet folder so your main inbox stays focused (undo anytime).
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start gap-6 group">
              <div className="w-14 h-14 bg-green-900/30 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-900/50 transition-colors duration-300">
                <Ban className="w-7 h-7 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Deter
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Sends intelligent opt-out signals so repeat senders slow down over time.
                </p>
              </div>
            </motion.div>
          </div>

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
              className="border-zinc-700 text-white hover:bg-zinc-900/50 px-8 py-6 w-full sm:w-auto"
            >
              Try with 1-click: Gmail
            </Button>
          </motion.div>

          <motion.p variants={itemVariants} className="text-center text-sm text-zinc-500">
            Secure Google OAuth • No password sharing • You stay in control
          </motion.p>
        </div>
      </motion.section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 bg-black relative z-10"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-900/50 transition-colors duration-300">
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white mb-3 text-xl">Save time</h3>
              <p className="text-gray-400 text-lg">Less noise, more signal</p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-900/50 transition-colors duration-300">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-3 text-xl">Safer defaults</h3>
              <p className="text-gray-400 text-lg">Allowlist your contacts</p>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center group">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-900/50 transition-colors duration-300">
                <BarChart3 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-semibold text-white mb-3 text-xl">Weekly digest</h3>
              <p className="text-gray-400 text-lg">See what we caught + restore</p>
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
        className="py-20 bg-black relative z-10"
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
        className="py-24 bg-black relative z-10"
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
        className="bg-black border-t border-neutral-800 py-20 relative z-10"
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
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Support</a>
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
