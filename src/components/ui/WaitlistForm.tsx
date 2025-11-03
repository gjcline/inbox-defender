import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from './button';
import { Loader2, CheckCircle } from 'lucide-react';

const INTEREST_OPTIONS = [
  'Cleaning up My inbox for Maximum Productivity',
  'Automatically Unsubscribing to Cold Emails and Spam',
  'Getting Paid to Receive Emails',
  'Getting a lifetime discount for Signing up Early',
  'Other'
];

interface FormData {
  name: string;
  email: string;
  mobile: string;
  interest: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  interest?: string;
  submit?: string;
}

export function WaitlistForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobile: '',
    interest: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return value;
  };

  const handlePhoneChange = (value: string) => {
    if (value.replace(/\D/g, '').length <= 10 || value.length < formData.mobile.length) {
      setFormData(prev => ({ ...prev, mobile: value }));
    }
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

    if (!formData.interest) {
      newErrors.interest = 'Please select your primary interest';
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
      const { error } = await supabase
        .from('waitlist')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.mobile.trim() || null,
          interest: formData.interest
        });

      if (error) {
        if (error.code === '23505') {
          setErrors({ submit: 'This email is already on the waitlist!' });
        } else {
          setErrors({ submit: 'Something went wrong. Please try again.' });
        }
        setIsSubmitting(false);
        return;
      }

      setSubmittedEmail(formData.email);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting waitlist form:', error);
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      mobile: '',
      interest: ''
    });
    setErrors({});
    setIsSuccess(false);
    setSubmittedEmail('');
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-2xl mx-auto"
      >
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border border-neutral-800 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-white mb-2">You're on the list!</h3>
          <p className="text-gray-300 mb-4">
            We'll send updates to <span className="text-blue-400 font-medium">{submittedEmail}</span>
          </p>
          <Button
            onClick={handleReset}
            variant="outline"
            className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
          >
            Submit Another
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border border-neutral-800 p-8 shadow-xl">
        <h3 className="text-2xl font-semibold text-white mb-2 text-center">Join the Waitlist</h3>
        <p className="text-gray-400 mb-6 text-center">Be the first to know when we launch</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="John Doe"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="john@example.com"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-300 mb-1.5">
              Mobile <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="tel"
              id="mobile"
              value={formData.mobile}
              onChange={(e) => {
                const value = e.target.value;
                if (value.replace(/\D/g, '').length <= 10) {
                  const formatted = formatPhoneNumber(value);
                  setFormData(prev => ({ ...prev, mobile: formatted }));
                } else {
                  setFormData(prev => ({ ...prev, mobile: value }));
                }
              }}
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="123-456-7890 or +1234567890"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              What are you most interested in? *
            </label>
            <div className="space-y-2.5">
              {INTEREST_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-start p-3 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors group"
                >
                  <input
                    type="radio"
                    name="interest"
                    value={option}
                    checked={formData.interest === option}
                    onChange={(e) => setFormData(prev => ({ ...prev, interest: e.target.value }))}
                    className="mt-0.5 w-4 h-4 text-blue-500 bg-neutral-800 border-neutral-600 focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            {errors.interest && (
              <p className="mt-2 text-sm text-red-400">{errors.interest}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800/50 border border-blue-500 text-white py-6 text-base font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Waitlist'
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
