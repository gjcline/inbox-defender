import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Sparkles as SparklesComp } from '../components/ui/sparkles';
import { Button } from '../components/ui/button';
import { WaitlistForm } from '../components/ui/WaitlistForm';
import { SplashCursor } from '../components/ui/splash-cursor';

export function Waitlist() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </nav>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 py-20 px-4 min-h-[calc(100vh-200px)] flex flex-col items-center justify-center"
        >
          <div className="max-w-5xl mx-auto w-full text-center">
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Join the{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Waitlist
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto"
            >
              Be the first to experience AI-powered email filtering that keeps your inbox clean
            </motion.p>
            <motion.div variants={itemVariants} className="mb-12">
              <WaitlistForm />
            </motion.div>
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
              <div className="h-px bg-neutral-800 w-32"></div>
              <p className="text-gray-400 text-sm">Want to learn more?</p>
              <Button
                size="lg"
                variant="outline"
                className="bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 px-8 py-6"
                onClick={() => window.open('https://cal.com/bliztic/email', '_blank')}
              >
                Book a call
              </Button>
            </motion.div>
          </div>
        </motion.section>

        <footer className="relative z-10 border-t border-neutral-800 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-8">
                <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy</a>
                <a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">Terms</a>
                <a href="mailto:info@bliztic.com" className="text-gray-400 hover:text-white transition-colors duration-200">Support</a>
              </div>
              <p className="text-gray-500 text-sm">
                Not affiliated with Google. Gmail™ is a trademark of Google LLC.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
