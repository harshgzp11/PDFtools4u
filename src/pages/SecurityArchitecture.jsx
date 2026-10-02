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
    a: "Supported tools are designed to read selected files in the browser and process them on your device rather than upload them to PDFtools4u servers. The website still makes network requests for scripts, assets, and analytics. The exact behaviour can differ by tool, so check that tool's instructions and inspect your browser's Network panel if you need to verify a specific operation."
  },
  {
    q: "Does using a local-processing tool make my organization compliant with privacy laws?",
    a: "No. Local file processing may reduce the need to send a document to a processing server, but the site also uses analytics and third-party assets. Your organization's legal obligations depend on its use, settings, and circumstances. Review our Privacy Policy and consult qualified counsel for compliance advice."
  },
  {
    q: "Does using a browser-based PDF converter reduce file conversion speeds or output quality?",
    a: "Processing on your device avoids uploading and downloading the selected file for supported operations, but speed and output quality depend on the tool, file, browser, and device. Review the result before relying on it."
  },
  {
    q: "How can I verify what a tool sends over the network?",
    a: "Open your browser's developer tools and select the Network panel before using the tool. Compare requests and payloads before and during processing. A page can make requests for assets or analytics even when its file-processing code runs locally. Review the relevant tool's instructions and avoid using sensitive files if the network behaviour is unclear."
  }
];

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
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in space-y-16">
        
        {/* Hero Section */}
        <header className="relative text-center max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs sm:text-sm font-semibold shadow-xs mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Browser-Based File Processing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            Security & <span className="text-emerald-600">Architecture</span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
            Supported PDF and image tools are designed to process selected files locally in your browser rather than upload them to PDFtools4u servers. The website also loads assets and analytics, which may send separate technical and usage information. Processing details can vary by tool.
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
                  <th className="py-4 px-4 text-gray-600">What this means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">File Processing Location</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Supported operations run in the browser</td>
                  <td className="py-4 px-4 text-gray-600">Check each tool's instructions for its processing path</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Data Upload Bandwidth</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Designed not to upload selected files to our servers</td>
                  <td className="py-4 px-4 text-gray-600">The site still requests assets and analytics</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Storage & Retention</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">No server-side file retention as part of supported local processing</td>
                  <td className="py-4 px-4 text-gray-600">Browser memory and temporary object URLs are controlled by the browser</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Decryption & Passwords</td>
                  <td className="py-4 px-4 text-emerald-700 bg-emerald-50/30 font-semibold">Check the specific tool's documented flow</td>
                  <td className="py-4 px-4 text-gray-600">Do not assume all sites or tools handle credentials the same way</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium text-gray-900">Legal and compliance status</td>
                  <td colSpan="2" className="py-4 px-4 text-gray-600">Local processing does not itself establish compliance. Assess your obligations and the site's analytics and other network activity.</td>
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
              Supported operations are designed to read selected files in browser memory instead of uploading them to PDFtools4u servers. The website still makes separate requests for assets and analytics.
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
                  Supported file processing does not create a server-side copy as part of the operation. The browser manages in-memory data and temporary object URLs; close the page when finished, and avoid using shared devices for sensitive files.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-gray-900">2. LocalStorage Constraints</h4>
                <p className="text-gray-600 mt-2">
                  The site may use browser storage for operation. Analytics services can separately process usage or performance information as described in our Privacy Policy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xl text-gray-900">3. F12 Network Verification</h4>
                <p className="text-gray-600 mt-2">
                  Use the Network panel to compare requests before and during a specific operation. The page can make asset or analytics requests, so inspect their destinations and payloads instead of assuming there are no network requests.
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
              Clear answers about supported local processing, analytics, and what this architecture does not guarantee.
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
