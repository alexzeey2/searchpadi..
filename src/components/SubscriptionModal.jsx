import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'
import { WHATSAPP_NUMBER } from '../helpers'

export default function SubscriptionModal({ onClose, currentUser }) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [step, setStep] = useState(1); // 1: choose product, 2: payment
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const screenshotInputRef = useRef(null);

    const BANK = { bank: 'Opay', account: '9058150220', name: 'AlexanderBede Somtochukwu Ugwu' };
    const PRICE = 4000;
    const CLICKS = 5;
    const sellerProducts = currentUser?.data?.products || [];

    const handleScreenshotUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image must be less than 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setScreenshot(ev.target.result); setScreenshotPreview(ev.target.result); };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) { alert('Please select a product'); return; }
        if (!screenshot) { alert('Please upload your payment screenshot'); return; }
        setSubmitting(true);
        try {
            const { error } = await supabaseClient.from('pending_payments').insert([{
                seller_id: currentUser.data.id,
                seller_name: currentUser.data.name,
                seller_email: currentUser.data.email,
                seller_whatsapp: currentUser.data.whatsappNumber || currentUser.data.whatsapp || '',
                plan_type: 'campaign',
                amount: PRICE * 100,
                target_count: CLICKS,
                click_quota: CLICKS,
                ad_clicks: 0,
                category: currentUser.data.category,
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                product_image: selectedProduct.images?.[0] || null,
                payment_timestamp: new Date().toISOString(),
                payment_screenshot: screenshot,
                status: 'pending'
            }]);
            if (error) throw error;
            alert('✅ Payment submitted! We\'ll review and activate your campaign within 5-10 minutes.');
            onClose();
        } catch (err) {
            alert('Failed to submit. Please try again.');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button onClick={() => setStep(1)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                            </button>
                        )}
                        <h2 className="text-white font-bold text-lg">Run a Campaign</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex items-center gap-2 px-5 pt-4">
                    {[1,2].map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-purple-500' : 'bg-gray-700'}`}/>
                    ))}
                </div>

                <div className="p-5">
                    {/* Campaign Info Banner */}
                    <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4 mb-5 flex items-center gap-3">
                        <div className="text-2xl">🚀</div>
                        <div>
                            <p className="text-white font-bold text-sm">₦4,000 = 5 buyer clicks</p>
                            <p className="text-gray-400 text-xs mt-0.5">Real buyers will see your product and message you on WhatsApp.</p>
                        </div>
                    </div>

                    {step === 1 && (
                        <div>
                            <p className="text-gray-400 text-sm mb-4">Which product do you want to promote?</p>
                            {sellerProducts.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 mb-2">No products yet</p>
                                    <p className="text-gray-500 text-sm">Add products first to run a campaign.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sellerProducts.map((product, idx) => (
                                        <div key={idx}
                                            onClick={() => { setSelectedProduct(product); setStep(2); }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedProduct?.id === product.id ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 hover:border-gray-500'}`}>
                                            <img src={product.images?.[0]} className="w-12 h-12 rounded-lg object-cover" alt={product.name}/>
                                            <div className="flex-1">
                                                <p className="text-white text-sm font-semibold">{product.name}</p>
                                                <p className="text-gray-400 text-xs">{product.price || 'Ask for Price'}</p>
                                            </div>
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && selectedProduct && (
                        <div>
                            <div className="bg-[#2a2a2a] rounded-xl p-3 mb-4 flex items-center gap-3">
                                <img src={selectedProduct.images?.[0]} className="w-12 h-12 rounded-lg object-cover" alt={selectedProduct.name}/>
                                <div>
                                    <p className="text-white text-sm font-bold">{selectedProduct.name}</p>
                                    <p className="text-purple-400 text-xs font-semibold">₦4,000 • 5 clicks</p>
                                </div>
                            </div>

                            <div className="bg-[#2a2a2a] rounded-xl p-4 mb-4">
                                <p className="text-gray-400 text-xs mb-1">Transfer exactly</p>
                                <p className="text-white text-2xl font-extrabold mb-3">₦4,000</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Bank</span><span className="text-white font-semibold">{BANK.bank}</span></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Account</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold">{BANK.account}</span>
                                            <button onClick={() => { navigator.clipboard?.writeText(BANK.account); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                                className="text-purple-400 text-xs hover:text-purple-300">{copied ? '✓ Copied' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="text-white text-xs">{BANK.name}</span></div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-gray-300 text-sm font-semibold mb-2">Upload payment screenshot</p>
                                <input type="file" ref={screenshotInputRef} onChange={handleScreenshotUpload} accept="image/*" className="hidden"/>
                                {screenshotPreview ? (
                                    <div className="relative">
                                        <img src={screenshotPreview} className="w-full h-40 object-cover rounded-xl" alt="screenshot"/>
                                        <button onClick={() => screenshotInputRef.current?.click()} className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-lg text-xs">Change</button>
                                    </div>
                                ) : (
                                    <button onClick={() => screenshotInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-gray-600 rounded-xl py-8 text-center hover:border-purple-500 transition-colors">
                                        <p className="text-gray-400 text-sm">📸 Tap to upload screenshot</p>
                                    </button>
                                )}
                            </div>

                            <button onClick={handleSubmit} disabled={submitting || !screenshot}
                                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {submitting ? 'Submitting...' : 'Submit Payment ✓'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── SOMTO PROMOTE CHAT ──
// Pricing: every 6 people = ₦4,000 | min 6 people
