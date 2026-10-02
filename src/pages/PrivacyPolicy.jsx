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
            PDFtools4u &bull; Last Updated: October 1, 2026
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
              The supported PDF and image operations are designed to process selected files in your browser. This means:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-blue-900">
              <li>For supported operations, the selected file is read by the browser and processed on your device; the tool does not intentionally upload the file to PDFtools4u servers.</li>
              <li>This does not mean the website makes no network requests. The site loads scripts and other assets, and analytics services described below may receive usage and technical information.</li>
              <li>Some features may download processing libraries or models. Review the relevant tool instructions and your browser's Network panel if you need to verify a particular operation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">3. Information We Collect</h2>
            <p className="mb-3">
              When you visit the site or use its features, we and service providers may process standard technical and usage information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Hosting and delivery providers may process connection information such as your IP address, request details, browser, and device information.</li>
              <li>The site integrates Google Analytics 4 and Microsoft Clarity, configured to load after a visitor interacts with the page, and Vercel Analytics and Speed Insights. These services may process page views, interaction, performance, browser, and device information under their own policies and the site's configuration.</li>
              <li>Do not include sensitive document contents in feedback or other messages to us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">4. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              The site uses scripts and similar technologies for analytics, performance measurement, and site operation. We do not currently serve advertisements or use Google AdSense. For more detail, see our <a href="/cookie-policy" className="text-blue-600 hover:underline font-medium">Cookie Policy</a>.
            </p>
            <p>
              This site does not currently offer a per-category analytics consent control. You can block or delete cookies and other site data through your browser settings; blocking analytics may not prevent all non-cookie requests made by third-party scripts.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">5. Advertising and Third-Party Data Sharing</h2>
            <p>
              PDFtools4u does not currently display third-party advertisements or use Google AdSense. If advertising is introduced, this policy and the Cookie Policy will be updated to describe the advertising technology and applicable choices before it is enabled.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">6. Your Privacy Rights (DPDP, GDPR &amp; CCPA)</h2>
            <p className="mb-3">
              Depending on your location, privacy laws may provide rights regarding personal information. To make a request, contact us using the details below. We will review and respond as required by applicable law:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You have the right to access, restrict processing, or request the deletion of your personal data.</li>
              <li>You have the right to opt out of the sale or sharing of your data for targeted advertising purposes.</li>
              <li>Supported file processing is designed to happen locally in your browser; technical, analytics, and support data are separate and may be handled by the providers described in this policy.</li>
              <li>Nothing in this policy is a representation that using the site by itself satisfies a visitor's legal or regulatory obligations.</li>
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
              <li>              We do not currently use AdSense or serve advertisements on the site.</li>
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
