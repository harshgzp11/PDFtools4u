import React from 'react';
import { Shield, Zap, Users } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-800 animate-in fade-in">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">About PDFTools4U</h1>
        <p className="text-xl text-gray-600 text-center mb-16 max-w-2xl mx-auto">
          We build simple, fast, and secure tools to help you manage your digital documents without the hassle.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-sm text-gray-600">All processing happens directly in your browser, eliminating upload wait times entirely.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">100% Private</h3>
            <p className="text-sm text-gray-600">We don't store your files. Everything is processed locally, ensuring your sensitive data remains yours.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Made for Everyone</h3>
            <p className="text-sm text-gray-600">Designed to be intuitive for students, professionals, and everyday users across the globe.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 text-center border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto mb-6">
            PDFTools4U was created with a single goal: to democratize document manipulation. We noticed that most online PDF tools are either overloaded with ads, require expensive subscriptions, or upload your private documents to foreign servers. 
          </p>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            By leveraging modern WebAssembly and browser APIs, we built a suite of tools that runs completely on your device. Whether you are compressing a file for a government exam portal or merging invoices for work, PDFTools4U is here to help you get it done quickly, safely, and for free.
          </p>
        </div>
      </div>
    </div>
  );
}
