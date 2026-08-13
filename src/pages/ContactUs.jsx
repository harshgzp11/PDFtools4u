import React from 'react';
import { Mail } from 'lucide-react';

export default function ContactUs() {
  const handleEmailClick = (e) => {
    e.preventDefault();
    const user = "support";
    const domain = "pdftools4u.in";
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">Contact Us</h1>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-xl">
          Have a question, feedback, or need support with one of our tools? We'd love to hear from you.
        </p>

        <div className="w-full bg-white border border-gray-200 rounded-3xl p-10 text-center shadow-lg hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
          <p className="text-gray-600 mb-8">
            Send us an email and our support team will get back to you within 24-48 hours.
          </p>
          
          <button 
            onClick={handleEmailClick}
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors gap-3"
          >
            <Mail className="w-5 h-5" />
            Email Us
          </button>
        </div>
      </div>
    </div>
  );
}
