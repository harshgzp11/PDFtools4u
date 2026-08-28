import React from 'react';
import { Mail, Clock, MapPin, FileText, Image, Wrench, Shield, MessageSquare, Zap } from 'lucide-react';

const HELP_TOPICS = [
  {
    icon: FileText,
    title: 'PDF Tool Support',
    keywords: ['compress PDF', 'merge PDF files', 'split PDF pages', 'convert PDF to Word', 'PDF to JPG', 'unlock PDF', 'protect PDF with password'],
    desc: 'Facing issues with our PDF tools? Whether you need help compressing a PDF under 100KB, merging multiple PDFs into one, splitting pages, or converting between formats like PDF to Word or PDF to Excel — email us with your browser name and a brief description.',
  },
  {
    icon: Image,
    title: 'Image Tool Support',
    keywords: ['resize image', 'compress image', 'remove background', 'convert image format', 'crop image', 'resize passport photo', 'HEIC to JPG'],
    desc: 'Having trouble resizing a passport photo to exact pixel dimensions, removing a background, or converting a HEIC image from iPhone to JPG or PDF? Our team can help you get the right output for government forms, job applications, and exam portals.',
  },
  {
    icon: Zap,
    title: 'Feature Requests & New Tools',
    keywords: ['suggest PDF tool', 'request image converter', 'new file format support', 'tool improvement'],
    desc: 'Don\'t see a tool you need? We actively build new PDF and image utilities based on user feedback. Suggest a new converter, OCR language, or document editing feature and we\'ll prioritize it on our roadmap.',
  },
  {
    icon: Shield,
    title: 'Privacy & Security Questions',
    keywords: ['client-side processing', 'local PDF processing', 'no file upload', 'data privacy', 'GDPR', 'DPDP', 'browser-based PDF tool'],
    desc: 'PDFTools4U processes all files 100% inside your browser using WebAssembly — your documents are never uploaded to any server. If you have questions about our zero-server-upload architecture, GDPR compliance, or India\'s DPDP Act, we\'re happy to explain.',
  },
  {
    icon: Wrench,
    title: 'Bug Reports',
    keywords: ['PDF conversion error', 'tool not working', 'file processing failed', 'browser compatibility issue'],
    desc: 'If a tool crashes, produces an incorrect output, or behaves unexpectedly, please mention your operating system, browser version (Chrome, Firefox, Safari, Edge), and what file type you were processing. This helps us replicate and fix the issue quickly.',
  },
  {
    icon: MessageSquare,
    title: 'Business & Partnership Inquiries',
    keywords: ['PDF API integration', 'white-label PDF tools', 'embed PDF tools', 'business partnership', 'educational institution'],
    desc: 'Interested in embedding our client-side PDF or image processing tools on your platform, blog, or educational portal? Reach out to discuss integration options, partnerships, or media collaborations.',
  },
];

export default function ContactUs() {
  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Contact PDFTools4U – PDF & Image Tool Support",
        "url": "https://www.pdftools4u.in/contact",
        "description": "Contact PDFTools4U for help with PDF tools (compress, merge, split, convert), image tools (resize, background remove), privacy questions, feature requests, and business partnerships.",
        "mainEntity": {
          "@type": "Organization",
          "name": "PDFTools4U",
          "url": "https://www.pdftools4u.in",
          "logo": "https://www.pdftools4u.in/logo.png",
          "contactPoint": {
            "@type": "ContactPoint",
            "email": "support@pdftools4u.in",
            "contactType": "customer support",
            "availableLanguage": ["English", "Hindi"],
            "areaServed": "IN",
            "hoursAvailable": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
              "opens": "09:00",
              "closes": "19:00"
            }
          }
        }
      })}} />

      <div className="max-w-3xl mx-auto py-16 px-6">

        {/* ── Hero CTA ── */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
            <Mail className="w-10 h-10" aria-hidden="true" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Contact PDFTools4U Support
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
            Need help with a PDF or image tool, want to report a bug, or have a feature request?
            Just send us an email — we read and reply to every message.
          </p>

          <a
            href="mailto:support@pdftools4u.in"
            className="inline-flex items-center gap-3 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Mail className="w-5 h-5" aria-hidden="true" />
            support@pdftools4u.in
          </a>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Mon – Sat, 9 AM – 7 PM IST
            </span>
            <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" aria-hidden="true" />
              Reply within 24–48 hours
            </span>
            <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Bengaluru, India
            </span>
          </div>
        </div>

        {/* ── How we can help ── */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">What Can We Help You With?</h2>
          <p className="text-sm sm:text-base text-gray-600 text-center mb-8">
            Mention the topic below in your email so we can route it to the right team faster.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HELP_TOPICS.map(({ icon: Icon, title, keywords, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map(kw => (
                    <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom note ── */}
        <div className="mt-12 text-center p-6 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong>Privacy reminder:</strong> PDFTools4U never uploads your files to any server.
            All PDF compression, merging, splitting, conversion, and image processing happens
            100% inside your browser. When contacting support, <strong>do not attach confidential documents</strong> — 
            only describe the issue or share a generic sample file if needed.
          </p>
        </div>

      </div>
    </div>
  );
}
