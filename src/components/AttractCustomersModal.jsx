import React, { useState, useEffect, useRef } from 'react'


export default function AttractCustomersModal({ seller, onClose, onShare }) {
    const isTempVerified = seller.tempVerifiedUntil && new Date(seller.tempVerifiedUntil) > new Date();
    const tempDaysLeft = seller.tempVerifiedUntil
        ? Math.ceil((new Date(seller.tempVerifiedUntil) - new Date()) / (1000 * 60 * 60 * 24))
        : 0;
    const shareCount = seller.shareCount || 0;
    const appUrl = 'https://searchpadi-phi.vercel.app';
    const shareMsg = 'Hi! 👋 Visit ' + appUrl + ' to find my products on SearchPadi!\n\nSearchPadi\'s AI assistant Somto will help you find exactly what you need from my store. Just tell Somto what you\'re looking for! 🛍️';

    const handleWhatsAppShare = () => {
        onShare();
        onClose();
    };

    const [copied, setCopied] = useState(false);
    const handleCopyLink = () => {
        const fallback = (str) => {
            const el = document.createElement('textarea');
            el.value = str;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.focus();
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareMsg).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                fallback(shareMsg);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            fallback(shareMsg);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    const handleSMSShare = () => {
        window.location.href = 'sms:?body=' + encodeURIComponent(shareMsg);
    };

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60"></div>

            {/* Slide-up panel */}
            <div
                className="relative bg-[#1a1a1a] rounded-t-3xl p-6 pb-10 border-t border-gray-800"
                style={{ animation: 'slideUp 0.3s ease-out' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle bar */}
                <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5"></div>

                <h3 className="text-white font-bold text-lg mb-1">Share Your Store</h3>
                <p className="text-gray-400 text-sm mb-5">Send this to your customers — they can find your products on SearchPadi anytime.</p>

                {/* Message preview */}
                <div className="bg-[#2a2a2a] rounded-2xl p-4 mb-5 border border-gray-700">
                    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Ready to send</p>
                    <p className="text-gray-200 text-sm leading-relaxed">
                        👋 Hi! You can find my products on SearchPadi.{'\n\n'}
                        🔗 Visit: <span className="text-purple-400 font-medium">{appUrl}</span>{'\n'}
                        🔍 Then search for: <span className="text-yellow-400 font-medium">{seller.name}</span>{'\n\n'}
                        Somto (the AI) will help you find exactly what you need from my store!
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleWhatsAppShare}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                    </button>
                    <button
                        onClick={handleSMSShare}
                        className="flex-1 bg-[#2a2a2a] border border-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-semibold hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        SMS
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="flex-1 bg-[#2a2a2a] border border-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-semibold hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-1.5"
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
        </div>
    );
}

