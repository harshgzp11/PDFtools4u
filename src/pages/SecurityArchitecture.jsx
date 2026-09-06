import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ServerOff, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Layers 
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: "How does pdftools4u.in process documents without uploading them to a remote server?",
    a: "Our platform utilizes a client-side architecture powered by WebAssembly (Wasm) and modern JavaScript engines. When you select a document, it is loaded directly into your browser's local sandbox memory using the HTML5 File API. All conversions, compression, and edits execute directly on your device's CPU—zero document data or metadata is ever transmitted to an external server."
  },
  {
    q: "Is pdftools4u.in compliant with corporate data regulations like GDPR and HIPAA?",
    a: "Because PDFtools4u operates entirely on your local machine with zero server uploads, we never receive, store, or transmit your documents or Personally Identifiable Information (PII). By eliminating third-party data processing and cloud storage, using our tools avoids data processor liabilities and supports GDPR, HIPAA, and CCPA privacy standards by design (Privacy by Architecture)."
  },
  {
    q: "Does using a browser-based PDF converter reduce file conversion speeds or output quality?",
    a: "No. Local WebAssembly processing eliminates slow network upload and download bottlenecks. Conversions begin instantly without waiting in remote server queues, delivering full-fidelity output while utilizing your device's native computing performance."
  },
  {
    q: "Are my password-protected and encrypted PDFs safe from interception here?",
    a: "Yes. Decryption and encryption occur completely inside your browser's private memory sandbox. Your master passwords and document contents are never transmitted across the network, eliminating the transit security liabilities inherent in traditional server-side conversion services."
  }
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": FAQ_ITEMS.map(item => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a
    }
  }))
};

export default function SecurityArchitecture({ onSelectTool }) {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(prev => prev === index ? null : index);
  };

  const handleNavigateHome = (e) => {
    e.preventDefault();
    onSelectTool && onSelectTool(null);
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      {/* Schema.org FAQPage JSON-LD */}
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in space-y-16">
        
        {/* Hero Section */}
        <header className="relative text-center max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs sm:text-sm font-semibold shadow-xs mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Uploads • 100% Client-Side Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Security & <span className="text-emerald-600">Architecture</span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
            Unlike traditional web utilities that force you to upload your sensitive files to a remote server, PDFtools4u is engineered differently. Our entire processing engine runs <strong className="text-gray-900 font-bold">locally within your browser's memory sandbox</strong>.
          </p>
        </header>

        {/* Architecture Comparison Table */}
        <section className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-xs tracking-wider uppercase mb-2">
              <Layers className="w-4 h-4" /> Architectural Comparison
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Client-Side WASM vs. Traditional Cloud Processing
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm sm:text-base border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-4 px-4">Architecture Metric</th>
                  <th className="py-4 px-4 text-emerald-700 bg-emerald-50/50 rounded-t-xl font-bold">PDFtools4u (Local)</th>
                  <th className="py-4 px-4 text-gray-600">Traditional Cloud Utilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">File Processing Location</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Local Browser RAM (Device CPU)</td>
                  <td className="py-4 px-4 text-rose-600">Remote Cloud Server (AWS/GCP)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Data Upload Bandwidth</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">0 Bytes (Zero network upload)</td>
                  <td className="py-4 px-4 text-rose-600">Full document size sent over HTTP</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Storage & Retention</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">0 Seconds (Wiped on tab close)</td>
                  <td className="py-4 px-4 text-gray-600">1 to 24 Hours on remote disk queue</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Decryption & Passwords</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Keys stay in isolated local memory</td>
                  <td className="py-4 px-4 text-rose-600">Master passwords sent over network</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Data Processor Risk (GDPR/HIPAA)</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Zero third-party liability</td>
                  <td className="py-4 px-4 text-gray-600">Requires DPA & third-party trust</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Core Principles */}
        <section className="grid md:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-emerald-200 transition-all duration-300">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <ServerOff className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Server Uploads</h3>
            <p className="text-gray-600 leading-relaxed">
              When you "upload" a file on PDFtools4u, it never leaves your machine. The file is loaded directly into your browser's local memory footprint via the HTML5 File API. We have zero access to your documents.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-emerald-200 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">WebAssembly (WASM) Engine</h3>
            <p className="text-gray-600 leading-relaxed">
              We compile heavy processing libraries (like PDF and image manipulation engines) into WebAssembly. This allows your browser to execute complex operations at near-native speed without relying on a backend cloud cluster.
            </p>
          </div>
        </section>

        {/* The Technical Details */}
        <section className="bg-gray-50 border border-gray-200 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">How We Ensure Your Privacy</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-gray-900">1. Stateless Operation</h4>
                <p className="text-gray-600 mt-2">
                  Our application is completely stateless. Once you refresh the page or close your browser tab, all document data loaded into memory is instantly destroyed by your browser's garbage collector.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-gray-900">2. LocalStorage Constraints</h4>
                <p className="text-gray-600 mt-2">
                  We only use `localStorage` to save your basic UI preferences (like Dark Mode or your last used tool). No file metadata, contents, or telemetry tracking is ever stored.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-gray-900">3. F12 Network Verification</h4>
                <p className="text-gray-600 mt-2">
                  We challenge our users to verify our claims. Press `F12` to open your browser's Developer Tools, go to the Network tab, and process a file. You will see absolutely no outgoing network requests containing your file payload.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions (Visual FAQ for Users & Google Search) */}
        <section className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12">
          <div className="max-w-3xl mb-8">
            <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-xs tracking-wider uppercase mb-2">
              <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Private PDF Utility Infrastructure FAQ
            </h2>
            <p className="text-gray-600 mt-2">
              Clear, technical answers regarding our zero-server processing architecture and privacy compliance.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-emerald-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-6 text-left font-bold text-gray-900 text-lg bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <span className="text-emerald-600 ml-4 flex-shrink-0">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-6 pt-2 bg-white text-gray-600 leading-relaxed border-t border-gray-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-4 pb-12">
          <button 
            onClick={handleNavigateHome}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-1"
          >
            Return to Tools <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}

