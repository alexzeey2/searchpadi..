import React, { useState, useEffect, useRef } from 'react'


export default function WhatsAppModal({ seller, product, onClose }) {
    const [agreed, setAgreed] = useState(false);

    // Get contact count (simulated from views as proxy)
    const contactCount = Math.max(1, Math.floor((seller.views || 0) * 0.3));

    const message = `Hi ${seller.name || seller.business_name}, I saw your ${product ? product.name : 'products'} on SearchPadi. Is it still available? I'd like to discuss the price.`;

    const handleContinue = () => {
        const phone = (seller.whatsappNumber || seller.whatsapp || '').replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xl font-bold text-white">Contact Seller</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm">✕</button>
                    </div>

                    {/* Message Preview */}
                    <div className="mb-5">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-medium">Message Preview</p>
                        <div className="bg-[#2a2a2a] rounded-xl p-4 border-l-4 border-green-500">
                            <p className="text-gray-300 text-sm leading-relaxed italic">"{message}"</p>
                        </div>
                    </div>

                    {/* Safety Checklist */}
                    <div className="mb-5">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">Safety Checklist</p>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 bg-[#2a2a2a] rounded-xl p-3">
                                <span className="text-lg flex-shrink-0">🚫</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">No Upfront Payment</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Never pay for delivery or an item until you have seen it or used a trusted escrow service.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-[#2a2a2a] rounded-xl p-3">
                                <span className="text-lg flex-shrink-0">📍</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">Public Meetup Only</p>
                                    <p className="text-gray-400 text-xs mt-0.5">If meeting physically, choose a well-lit, busy public place like a mall or bank entrance.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-[#2a2a2a] rounded-xl p-3">
                                <span className="text-lg flex-shrink-0">🎥</span>
                                <div>
                                    <p className="text-white text-sm font-semibold">Demand a Live Video</p>
                                    <p className="text-gray-400 text-xs mt-0.5">On WhatsApp, ask the seller to send a live video of the product to prove they have it in hand.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Count */}
                    <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-3 mb-5 text-center">
                        <p className="text-purple-300 text-sm">
                            <strong className="text-white">{contactCount} buyer{contactCount !== 1 ? 's' : ''}</strong> {contactCount !== 1 ? 'have' : 'has'} already reached out to this seller on SearchPadi.
                        </p>
                    </div>

                    {/* Agree + Continue */}
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => setAgreed(!agreed)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${agreed ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}
                        >
                            {agreed && <span className="text-white text-xs font-bold">✓</span>}
                        </button>
                        <p className="text-gray-400 text-sm">I have read and understood the safety guidelines above.</p>
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={!agreed}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <span>💬</span> Continue to WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}
