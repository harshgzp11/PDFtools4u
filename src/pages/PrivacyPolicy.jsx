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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Analytics, Cookies, and Advertising</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We use third-party advertising companies like Google AdSense to serve ads when you visit our website. These companies may use information (not including your name, address, email address, or telephone number) about your visits to this and other websites in order to provide advertisements about goods and services of interest to you.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Google, as a third-party vendor, uses cookies (such as the DoubleClick cookie) to serve ads based on your prior visits to our website or other websites on the Internet. You may opt out of the use of the DoubleClick cookie for interest-based advertising by visiting the Google Ads Preference Manager.
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
            If you have any questions or concerns regarding our privacy practices, please contact us at <strong>support@pdftools4u.in</strong>.
          </p>
        </section>
      </div>
    </div>
    </div>
  );
}
