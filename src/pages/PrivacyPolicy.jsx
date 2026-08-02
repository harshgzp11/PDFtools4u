import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Privacy Policy</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed">
            At PDFTools4U, your privacy is our top priority. We do not collect, store, or transmit your files to any external servers. All file processing is performed locally within your browser using JavaScript.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Local Processing</h2>
          <p className="text-gray-600 leading-relaxed">
            When you use our tools to convert, edit, or manipulate PDFs and images, the operations happen entirely on your device. This means your sensitive documents never leave your computer, ensuring complete confidentiality and security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Analytics and Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            We may use basic, anonymized analytics to understand how our tools are used and to improve your user experience. We do not track personally identifiable information (PII). Cookies used are strictly for essential site functionality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Third-Party Services</h2>
          <p className="text-gray-600 leading-relaxed">
            Since our tools operate locally, we do not share your files or data with third-party services. However, standard browser extensions or services you have installed may interact with the webpage independently of our control.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to update this Privacy Policy at any time. Any changes will be posted on this page immediately. By continuing to use PDFTools4U after changes are made, you agree to the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions or concerns regarding our privacy practices, please contact us at support@pdftools4u.com.
          </p>
        </section>
      </div>
    </div>
    </div>
  );
}
