import React from 'react';

export default function PrivacyPolicy() {
  const handleEmailClick = (e) => {
    e.preventDefault();
    const user = "support";
    const domain = "pdftools4u.in";
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 sm:p-10 text-gray-800 animate-in fade-in">

        <div className="border-b border-gray-100 pb-6 mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
          <p className="text-sm font-medium text-gray-500 mt-2">
            PDFtools4u &bull; Last Updated: August 7, 2026
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-gray-600">

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains how PDFtools4u (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and discloses information when you use our website (<a href="https://www.pdftools4u.in" className="text-blue-600 hover:underline font-medium">pdftools4u.in</a>). Data privacy regulations require that we clearly communicate with website visitors about the data we collect and process, as well as inform you about your privacy rights.
            </p>
          </section>

          <section className="bg-blue-50/60 border border-blue-100 rounded-xl p-5">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-950 mb-3">2. Client-Side Processing (Your Files Are Safe)</h2>
            <p className="mb-3 text-blue-900">
              PDFtools4u operates strictly as a client-side web application. This means:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-blue-900">
              <li>All document processing, merging, splitting, compressing, and editing happens locally within your web browser.</li>
              <li>We do not upload, store, or transmit your PDF files or their contents to any external servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">3. Information We Collect</h2>
            <p className="mb-3">
              While we absolutely do not access or collect your document files, we may collect standard internet infrastructure data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may collect standard log information, including your IP address, browser type, device information, and operating system settings.</li>
              <li>We collect usage data via Google Analytics 4 and Microsoft Clarity to understand how our services are used and to improve our platform through aggregate performance and usage analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">4. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies to personalize content, serve advertisements, and analyze our traffic.
            </p>
            <p>
              This includes the use of both first-party cookies and third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">5. Advertising and Third-Party Data Sharing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We use third-party vendors, including Google AdSense, to serve advertisements on our site.</li>
              <li>We share necessary data with third-party vendors and ad networks that serve these advertisements.</li>
              <li>Google uses cookies to serve personalized ads based on your prior visits to this website or other websites on the internet.</li>
              <li>Users can opt out of personalized advertisements at any time by visiting Google&apos;s Ads Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">6. Your Privacy Rights (DPDP, GDPR &amp; CCPA)</h2>
            <p className="mb-3">
              Depending on your location, data privacy laws (such as India's Digital Personal Data Protection Act, GDPR, and CCPA) grant you specific rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You have the right to access, restrict processing, or request the deletion of your personal data.</li>
              <li>You have the right to opt out of the sale or sharing of your data for targeted advertising purposes.</li>
              <li><strong>Zero-Data-Retention Policy:</strong> We maintain a strict zero-data-retention policy for your processed files.</li>
              <li>We provide an email address for you to contact us and exercise these rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We base our retention periods for analytics and usage data on strict legal requirements and legitimate business needs.</li>
              <li>When this data is no longer needed, we securely delete or anonymize it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Our services are not directed at minors, and we set an age threshold of 13 years old to ensure we do not knowingly collect personal data from children.</li>
              <li>Additionally, we do not run targeted advertisements aimed at minors through our AdSense services.</li>
            </ul>
          </section>

          <section className="bg-gray-50 border border-gray-200/80 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">9. Contact Us</h2>
            <p className="mb-3">
              If you have any questions or concerns regarding this policy, you may contact us for privacy inquiries:
            </p>
            <ul className="space-y-2">
              <li><strong>Email:</strong> <button onClick={handleEmailClick} className="text-blue-600 hover:underline cursor-pointer">Email Support</button></li>
              <li>
                <strong>Website Contact Page:</strong>{' '}
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, "", "/contact");
                    window.dispatchEvent(new Event('popstate'));
                  }}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  https://www.pdftools4u.in/contact
                </a>
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}
