import React, { useState } from 'react';
import {
  Download,
  X,
  Laptop,
  Smartphone,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FolderArchive,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallClick: () => void;
}

export const DownloadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallClick,
}) => {
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;

  if (!isOpen) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">অ্যাপটি ডাউনলোড ও ব্যবহারের নিয়ম</h3>
              <p className="text-xs text-indigo-100">কম্পিউটার বা মোবাইলে ইনস্টল করে সরাসরি ব্যবহারের নির্দেশিকা</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Install Action Banner if PWA is supported */}
          {deferredPrompt && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-emerald-900">এক ক্লিকে ইনস্টল করুন</div>
                  <div className="text-xs text-emerald-700">
                    আপনার ব্রাউজার এই অ্যাপটিকে সরাসরি সফটওয়্যার হিসেবে ইনস্টল করতে সমর্থন করে।
                  </div>
                </div>
              </div>
              <button
                onClick={onInstallClick}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>এখনই ইনস্টল করুন</span>
              </button>
            </div>
          )}

          {/* Permanent Link Share Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>আপনার অ্যাপের স্থায়ী অনলাইন লিংক (যেকোনো ডিভাইসে খুলুন)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
              />
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
            </div>
          </div>

          {/* Full Source Code ZIP Download Card */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">
                  সম্পূর্ণ অ্যাপের ফাইল জিপ (.zip) ডাউনলোড
                </div>
                <div className="text-xs text-slate-600">
                  সকল সোর্স কোড, কম্পোনেন্ট, রুটিন, অ্যালগরিদম ও কনফিগ ফাইল একসাথে জিপ আকারে ডাউনলোড করুন।
                </div>
              </div>
            </div>
            <a
              href="/manha-exam-management-system.zip"
              download="manha-exam-management-system.zip"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>জিপ ডাউনলোড (ZIP)</span>
            </a>
          </div>

          {/* Device by Device Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PC / Laptop */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Laptop className="w-5 h-5 text-indigo-600" />
                <span>কম্পিউটার বা ল্যাপটপে (Desktop App)</span>
              </div>
              <p className="text-xs text-slate-500">
                Google Chrome বা Microsoft Edge ব্যবহার করে এটিকে ডেস্কটপ সফটওয়্যার বানিয়ে নিন:
              </p>
              <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside pl-1">
                <li>
                  ব্রাউজারের অ্যাড্রেস বারের একদম ডান পাশে থাকা <strong>"Install" (ডাউনলোড/⊕)</strong> আইকনে ক্লিক করুন।
                </li>
                <li>
                  অথবা ব্রাউজারের ৩টি ডট মেনু (⋮) &gt; <strong>"Cast, save, and share"</strong> বা <strong>"Install as app"</strong> নির্বাচন করুন।
                </li>
                <li>
                  এরপর এটি আপনার কম্পিউটারের ডেস্কটপে একটি স্বতন্ত্র সফটওয়্যার আইকন হিসেবে যুক্ত হবে এবং যেকোনো সময় ডাবল ক্লিকে চলবে!
                </li>
              </ol>
            </div>

            {/* Mobile / Android / iPhone */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <span>মোবাইলে (Mobile Phone App)</span>
              </div>
              <p className="text-xs text-slate-500">
                অ্যান্ড্রয়েড বা আইফোনে হোমস্ক্রিন অ্যাপ হিসেবে যুক্ত করুন:
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside pl-1">
                <li>
                  <strong>Android (Chrome):</strong> ব্রাউজারের উপরে ডানে থাকা <strong>৩টি ডট (⋮)</strong> মেনুতে চাপুন &gt; <strong>"Install app"</strong> বা <strong>"Add to Home screen"</strong> চাপুন।
                </li>
                <li>
                  <strong>iPhone / iPad (Safari):</strong> নিচে থাকা <strong>Share (শেয়ার)</strong> আইকনে চাপুন &gt; <strong>"Add to Home Screen"</strong> বেছে নিন।
                </li>
                <li>আপনার মোবাইলের স্ক্রিনে অ্যাপটির আইকন তৈরি হয়ে যাবে!</li>
              </ul>
            </div>
          </div>

          {/* Print/Save Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
            💡 <strong>টিপস:</strong> আপনি তৈরি করা যেকোনো সিট প্ল্যান ও নোটিশ সরাসরি <strong>"প্রিন্ট ও রিপোর্ট"</strong> ট্যাবে গিয়ে <strong>"প্রিন্ট করুন"</strong> বাটনে ক্লিক করে <strong>Save as PDF</strong> হিসেবে ডাউনলোড করে প্রিন্ট বা সংরক্ষণ করতে পারেন।
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            বুঝেছি, ধন্যবাদ
          </button>
        </div>
      </div>
    </div>
  );
};
