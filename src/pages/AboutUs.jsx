import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Code, 
  FileText, 
  Image as ImageIcon, 
  UserCheck, 
  ArrowRight, 
  Mail, 
  Clock, 
  Globe,
  CheckCircle2
} from 'lucide-react';

export default function AboutUs() {
  const handleNavigateHome = (e) => {
    e.preventDefault();
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event('popstate'));
  };

  const handleNavigateContact = (e) => {
    e.preventDefault();
    window.history.pushState({}, "", "/contact");
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in space-y-16">
        
        {/* Hero Section - PDFtools4u Theme */}
        <header className="relative text-center max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs sm:text-sm font-semibold shadow-xs mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>India's Web Utility Hub • 100% Free & Secure</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            About <span className="text-blue-600">PDFtools4u</span>: India’s Fast, Secure & Free Web Utility Hub
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
            Welcome to <strong className="text-gray-900 font-bold">PDFtools4u</strong>, a single, unified web utility platform designed to simplify your digital workflow. Whether you are an Indian student navigating strict government exam upload portals, a freelancer formatting graphics, or a software engineer debugging code, our goal is to provide elite-level <strong className="text-gray-900 font-bold">Free online web utilities</strong> completely free of charge—with zero hidden costs, subscriptions, or watermarks.
          </p>

          <p className="text-base text-gray-600 leading-relaxed mt-4">
            We bridge the gap between complex file processing and casual daily web usage, giving you premium-grade features completely accessible from any mobile device or desktop browser.
          </p>
        </header>

        {/* 3 Core Categories Grid - Matching Dashboard Tool Cards Style */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Core Categories & Keyword Clusters
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              To fulfill the diverse digital demands of Indian netizens, our workspace is structured across three highly optimized tool suites:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Advanced PDF Utilities */}
            <div className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  Advanced PDF Utilities
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A comprehensive toolkit built to organize, optimize, and secure your files. From high-speed PDF compression tools optimized for Indian portal limits (like UPSC, SSC, and EPFO) to advanced PDF converters, we handle your documentation challenges effortlessly with our <strong className="text-gray-900 font-semibold">secure PDF processing tools</strong> and <strong className="text-gray-900 font-semibold">secure file converter</strong>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Portal-Ready PDF Processing</span>
              </div>
            </div>

            {/* Smart Image Optimization */}
            <div className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <ImageIcon className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  Smart Image Optimization
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Designed for digital creators and casual users alike. Instantly resize, crop, or switch image formats (like PNG or WebP to high-quality JPG) to meet specific pixel rules or optimize website performance using our <strong className="text-gray-900 font-semibold">fast image resizer India</strong>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>High-Speed Format Conversion</span>
              </div>
            </div>

            {/* Everyday Developer Tools */}
            <div className="bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Code className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  Everyday Developer Tools
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Built specifically for coding students, programmers, and web designers. Access client-side JSON formatters, code minifiers, and encoders to streamline daily debugging workflows without leaving your browser tab with our <strong className="text-gray-900 font-semibold">developer tools online free</strong>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-purple-600">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Client-Side Utilities</span>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Pledge Card Section - Light & Clean Theme */}
        <section className="bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-blue-50/60 border border-emerald-100 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Data Protection Guarantee</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Why Millions Trust Us: 100% Local & Secure Data Privacy
            </h2>

            <p className="text-gray-700 text-sm sm:text-base leading-relaxed max-w-4xl">
              We understand that your files, data, and scripts are deeply private. Unlike traditional cloud platforms that store your data indefinitely, PDFtools4u is engineered with a strict <strong className="text-emerald-950 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">Privacy-First Architecture</strong>:
            </p>

            <div className="grid sm:grid-cols-3 gap-6 pt-2">
              <div className="bg-white/90 border border-emerald-100/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Local Processing</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Most of our conversion systems execute locally via your web browser, ensuring your private information never touches an external server.
                </p>
              </div>

              <div className="bg-white/90 border border-blue-100/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Instant Deletion</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  For tools requiring minimal server handling, your uploaded data is automatically and permanently wiped out from our secure servers within 1 hour of processing.
                </p>
              </div>

              <div className="bg-white/90 border border-purple-100/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-purple-200 transition-all">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <UserCheck className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">No Registration</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  You never need to hand over your email address, phone number, or credentials to use our suite.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Built This? Section - Professional Author Card */}
        <section className="bg-gray-50 border border-gray-200 rounded-3xl p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-2xl rounded-2xl flex items-center justify-center shadow-md shrink-0">
            HS
          </div>

          <div className="space-y-4 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-blue-700" />
              <span>Independent Software Developer • India</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              Who Built This?
            </h2>

            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              PDFtools4u was envisioned and developed by <strong className="text-gray-900 font-bold">Harsh Srivastava</strong>, an independent software developer based in India. Frustrated by online utility platforms that are slow, hidden behind expensive paywalls, or cluttered with malware-ridden pop-up ads, I built this web toolbox to offer a clean, blazing-fast, and premium user experience for everyone.
            </p>

            <p className="text-gray-600 text-sm">
              Have feedback or a tool suggestion? Reach out directly via our <a href="/contact" onClick={handleNavigateContact} className="text-blue-600 hover:underline font-semibold">Contact Us</a> page.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={handleNavigateContact}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
              >
                <span>Contact Us</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* CTA Internal Link Banner - Light Theme */}
        <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/60 border border-blue-200/80 rounded-3xl p-8 sm:p-10 text-center shadow-xs">
          <div className="max-w-2xl mx-auto space-y-5">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Ready to Simplify Your Digital Tasks?
            </h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Access all our free, privacy-first PDF, image, and developer utilities directly in your browser.
            </p>

            <div>
              <a
                href="/"
                onClick={handleNavigateHome}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <span>Explore All PDF Tools →</span>
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
