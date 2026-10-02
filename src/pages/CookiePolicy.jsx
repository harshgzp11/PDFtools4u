import React from 'react';

export default function CookiePolicy() {
  const handleEmailClick = (e) => {
    e.preventDefault();
    const user = 'support';
    const domain = 'pdftools4u.in';
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 sm:p-10 text-gray-800 animate-in fade-in">
        <div className="border-b border-gray-100 pb-6 mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Cookie Policy</h1>
          <p className="text-sm font-medium text-gray-500 mt-2">
            PDFtools4u &bull; Last Updated: October 1, 2026
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-gray-600">
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              This Cookie Policy explains how PDFtools4u (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses cookies and similar technologies on <a href="https://www.pdftools4u.in" className="text-blue-600 hover:underline font-medium">pdftools4u.in</a>. It should be read together with our <a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">Privacy Policy</a> and <a href="/terms-of-service" className="text-blue-600 hover:underline font-medium">Terms of Service</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">2. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device by a website. Similar technologies include local storage, pixels, and scripts used to remember preferences or measure how a site is used. Cookies may be first-party (set by PDFtools4u) or third-party (set by analytics providers).
            </p>
          </section>

          <section className="bg-blue-50/60 border border-blue-100 rounded-xl p-5">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-950 mb-3">3. Document Files Are Never Stored in Cookies</h2>
            <p className="text-blue-900">
              Supported PDF and image operations are designed to process selected files in your browser; the tool does not intentionally upload those files to PDFtools4u servers. Cookies are not used to store document contents. This does not mean the site makes no network requests: it loads scripts and other assets, and analytics services may receive usage and technical information.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">4. Cookies We Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Site operation:</strong> Browser storage may be used by the site or its libraries for operation and preferences.</li>
              <li><strong>Analytics and performance:</strong> Google Analytics 4 and Microsoft Clarity are configured to load after a visitor interacts with the page. The site also integrates Vercel Analytics and Speed Insights. These services may send page-view, interaction, performance, browser, and device information; exact data and storage depend on provider and site configuration.</li>
              <li><strong>Advertising:</strong>               We do not currently serve advertisements or use Google AdSense, and do not currently set advertising cookies for those services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">5. Third-Party Cookies</h2>
            <p className="mb-3">
              Analytics and performance scripts may make requests to Google, Microsoft, and Vercel when used. Those providers process data under their own policies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google Analytics: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li>Microsoft Clarity: <a href="https://privacy.microsoft.com/privacystatement" className="text-blue-600 hover:underline" rel="noopener noreferrer">Microsoft Privacy Statement</a></li>
              <li>Vercel: <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">6. How to Control Cookies</h2>
            <p className="mb-3">
              The site does not currently offer a per-category analytics consent control. You can block or delete cookies and other site data through browser settings. Blocking cookies may not prevent all non-cookie requests made by analytics scripts. The core supported file-processing operations are designed to work locally and do not depend on analytics.
            </p>
            <p>
              You may also use industry opt-out tools such as the Google Analytics opt-out browser add-on where available.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">7. Updates</h2>
            <p>
              If we introduce advertising, additional tracking, or new cookie categories, we will update this Cookie Policy to describe the change and applicable choices.
            </p>
          </section>

          <section className="bg-gray-50 border border-gray-200/80 rounded-xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">8. Contact Us</h2>
            <p className="mb-3">Questions about this Cookie Policy can be sent to:</p>
            <ul className="space-y-2">
              <li><strong>Email:</strong> <button onClick={handleEmailClick} className="text-blue-600 hover:underline cursor-pointer">Email Support</button></li>
              <li>
                <strong>Website Contact Page:</strong>{' '}
                <a href="/contact" className="text-blue-600 hover:underline cursor-pointer">https://www.pdftools4u.in/contact</a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
