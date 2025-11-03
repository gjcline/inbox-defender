import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, Mail, Target, TrendingUp, Shield } from 'lucide-react';
import { SplashCursor } from '../components/ui/splash-cursor';
import { Sparkles as SparklesComp } from '../components/ui/sparkles';

const EMAIL_VOLUME_OPTIONS = [
  'Just starting',
  'Under 500',
  '500-2000',
  '2000+'
];

interface FormData {
  name: string;
  email: string;
  company: string;
  email_volume: string;
  biggest_challenge: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  email_volume?: string;
  submit?: string;
}

export function EmailHelp() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    email_volume: '',
    biggest_challenge: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.email_volume) {
      newErrors.email_volume = 'Please select your current email volume';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const submissionData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        company: formData.company.trim() || null,
        email_volume: formData.email_volume,
        biggest_challenge: formData.biggest_challenge.trim() || null,
        source: 'spam_filter_response'
      };

      const { error } = await supabase
        .from('lead_form_submissions')
        .insert(submissionData);

      if (error) {
        if (error.code === '23505') {
          setErrors({ submit: 'This email has already been submitted. We\'ll be in touch soon!' });
        } else {
          setErrors({ submit: 'Something went wrong. Please try again.' });
        }
        setIsSubmitting(false);
        return;
      }

      try {
        await fetch('https://hook.us2.make.com/1lc7hlbp2is7hljszvkrchg9khlm4k8e', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting lead form:', error);
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (isSuccess) {
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  <a
                    href="https://bliztic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                  <a
                    href="https://x.com/bliztics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Follow Us
                  </a>
                </div>
              </div>
            </div>
          </nav>

          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border-2 border-blue-500/20 p-12 text-center shadow-2xl"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-blue-500/10 rounded-full p-4">
                  <CheckCircle className="w-16 h-16 text-blue-400" />
                </div>
              </div>
              <h2 className="text-3xl font-semibold text-white mb-4">
                Thank You!
              </h2>
              <p className="text-lg text-gray-300 mb-2">
                We'll review your email setup and send you a personalized deliverability report within 24 hours.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Check your inbox at <span className="font-medium text-blue-400">{formData.email}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                  onClick={() => window.location.href = 'https://bliztic.com'}
                >
                  Visit Bliztic.com
                </Button>
                <Button
                  variant="outline"
                  className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                  onClick={() => window.location.href = 'https://x.com/bliztics'}
                >
                  Follow on X
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <a
                  href="https://bliztic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  About Us
                </a>
                <a
                  href="https://x.com/bliztics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Follow Us
                </a>
              </div>
            </div>
          </div>
        </nav>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        >
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/10 rounded-full p-4">
              <Mail className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your Message Deserves to Be Seen
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            Get a free email deliverability audit and learn how to land in more inboxes
          </p>
          <p className="text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Email deliverability is tricky. Small technical issues can cause your carefully crafted messages to be filtered before they're ever seen. You're not alone—even experienced cold emailers struggle with inbox placement. Let us help you understand what's happening and how to fix it.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border-2 border-neutral-800 p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Get Your Free Deliverability Audit
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="John Smith"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="john@company.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Company or Business Name <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  placeholder="Acme Inc."
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email_volume" className="block text-sm font-medium text-gray-300 mb-2">
                  Current Email Volume (per day) <span className="text-red-400">*</span>
                </label>
                <select
                  id="email_volume"
                  value={formData.email_volume}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_volume: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  disabled={isSubmitting}
                >
                  <option value="">Select your email volume...</option>
                  {EMAIL_VOLUME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.email_volume && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.email_volume}</p>
                )}
              </div>

              <div>
                <label htmlFor="biggest_challenge" className="block text-sm font-medium text-gray-300 mb-2">
                  What's your main struggle with cold email? <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="biggest_challenge"
                  value={formData.biggest_challenge}
                  onChange={(e) => setFormData(prev => ({ ...prev, biggest_challenge: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none"
                  placeholder="e.g., My emails go to spam, low open rates, domain reputation issues..."
                  disabled={isSubmitting}
                />
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <p className="text-sm text-red-400">{errors.submit}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800/50 border border-blue-500 text-white py-6 text-base font-semibold hover:shadow-xl transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Get Free Deliverability Help'
                )}
              </Button>
            </form>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
              <p className="text-gray-200 font-medium mb-2">
                We analyze thousands of emails daily through Inbox Defender
              </p>
              <p className="text-sm text-gray-400">
                We respect your inbox. No spam, just actionable advice.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              By submitting this form, you agree to receive email communication from Bliztic.
              You can unsubscribe at any time.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="bg-blue-500/10 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Understand Why Emails Are Filtered
            </h3>
            <p className="text-gray-400">
              Get clear insights into the technical factors causing your emails to be filtered or marked as spam.
            </p>
          </div>

          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="bg-blue-500/10 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Learn the Technical Fixes
            </h3>
            <p className="text-gray-400">
              Discover specific, actionable steps to improve your email authentication, reputation, and deliverability.
            </p>
          </div>

          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-xl p-6 border border-neutral-800">
            <div className="bg-blue-500/10 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Get Personalized Recommendations
            </h3>
            <p className="text-gray-400">
              Receive tailored guidance based on your specific email setup, volume, and sending patterns.
            </p>
          </div>
        </div>
      </motion.div>

      <footer className="relative z-10 border-t border-neutral-800 py-12 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-8">
              <a
                href="https://bliztic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                About
              </a>
              <a
                href="/privacy"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Terms
              </a>
            </div>

            <p className="text-gray-500 text-xs">
              © 2025 Bliztic. Not affiliated with Google. Gmail™ is a trademark of Google LLC.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
