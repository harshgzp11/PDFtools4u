import React from 'react';

export default function TermsOfService() {
  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Terms of Service</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing and using PDFTools4U, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-600 leading-relaxed">
            PDFTools4U provides a suite of online, browser-based tools for manipulating PDF and image files. The service is provided "as is" and "as available" without any warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Responsibilities</h2>
          <p className="text-gray-600 leading-relaxed">
            You are solely responsible for the files you process using our tools. You agree not to use PDFTools4U for any unlawful or prohibited activities, including processing files that infringe on copyrights or contain malicious code.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Privacy and Data Security</h2>
          <p className="text-gray-600 leading-relaxed">
            Our tools process files locally within your browser. We do not upload, store, or have access to the contents of your files. Please refer to our Privacy Policy for more information on how we protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            All content, features, and functionality on PDFTools4U, including but not limited to design, text, graphics, and code, are owned by PDFTools4U and are protected by international copyright and trademark laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            In no event shall PDFTools4U be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or for the cost of procurement of substitute services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these Terms of Service at any time. We will provide notice of significant changes, but it is your responsibility to review the terms periodically.
          </p>
        </section>
      </div>
    </div>
    </div>
  );
}
