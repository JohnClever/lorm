import CountdownTimer from "@/components/CountdownTimer";
import FeatureHighlights from "@/components/FeatureHighlights";
import EmailSignup from "@/components/EmailSignup";
import SocialLinks from "@/components/SocialLinks";
import { Toaster } from "sonner";

export default function Home() {
  // Set target date to 3 days from now
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Toaster position="top-center" richColors />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-blue-600/20"></div>
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-[var(--neon-purple)] via-[var(--neon-pink)] to-[var(--neon-blue)] bg-clip-text text-transparent mb-4">
              Lorm
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--neon-purple)] via-[var(--neon-pink)] to-[var(--neon-blue)] mx-auto rounded-full shadow-lg shadow-purple-500/50"></div>
          </div>

          {/* Tagline */}
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-white mb-6 drop-shadow-lg">
            Ship faster with type-safe APIs
          </h2>

          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Full-stack mobile framework that generates type-safe APIs from your
            database schema. Zero backend boilerplate. Works with React Native
            and Expo.
          </p>

          {/* Countdown Timer */}
          <div className="mb-16">
            <h3 className="text-xl md:text-2xl text-white mb-8 font-medium">
              Launching in
            </h3>
            <div className="backdrop-blur-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-6 shadow-2xl shadow-purple-500/20">
              <CountdownTimer targetDate={targetDate} />
            </div>
          </div>

          {/* Email Signup */}
          {/* <EmailSignup /> */}

          {/* Social Links */}
          <div className="mt-12">
            <p className="text-gray-300 mb-6">Follow our progress</p>
            <SocialLinks />
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-[var(--neon-purple)]/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[var(--neon-pink)]/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[var(--neon-blue)]/20 rounded-full blur-lg animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-[var(--neon-green)]/20 rounded-full blur-xl animate-pulse"></div>
      </section>

      {/* Feature Highlights */}
      {/* <section className="bg-gray-50">
        <FeatureHighlights />
      </section> */}

      {/* Footer */}
      {/* <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Lorm</h3>
              <p className="text-gray-400">
                Type-Safe Database ORM for Modern Applications
              </p>
            </div>
            
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-400 text-sm">
                &copy; 2024 Lorm. All rights reserved. Built by developers, for developers.
              </p>
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
