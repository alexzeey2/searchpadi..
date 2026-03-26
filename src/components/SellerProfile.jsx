import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'
import { shortenLink } from '../helpers'
import CampaignStatusWidget from './CampaignStatusWidget'

export default function SellerProfile({ seller, isOwnProfile, onClose, onWhatsApp, onShowSubscription, onAddProduct, onProductClick, onDeleteProduct, onEditProfile, onShare, onCopyProfileLink, onCopyProductLink, onAttractCustomers, onOpenLeads, onEditProduct, buyerLeads = [] }) {
    const isTempVerified = seller.tempVerifiedUntil && new Date(seller.tempVerifiedUntil) > new Date();
    const tempDaysLeft = seller.tempVerifiedUntil ? Math.ceil((new Date(seller.tempVerifiedUntil) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const isVerifiedDisplay = seller.isVerified || isTempVerified;

    const [showVerifySheet, setShowVerifySheet] = useState(false);
    const [showLeadsChat, setShowLeadsChat] = useState(false);
    const [activeLead, setActiveLead] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [showWaChoice, setShowWaChoice] = useState(false);
    const [pendingWaMsg, setPendingWaMsg] = useState({ phone: '', msg: '' });
    const [verifyPhoto, setVerifyPhoto] = useState(null);
    const [verifyPreview, setVerifyPreview] = useState(null);
    const [verifySubmitting, setVerifySubmitting] = useState(false);
    const [verifyDone, setVerifyDone] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const verifyFileRef = useRef(null);

    const handleVerifyPhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setVerifyError('Photo must be less than 10MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { setVerifyPhoto(ev.target.result); setVerifyPreview(ev.target.result); setVerifyError(''); };
        reader.readAsDataURL(file);
    };

    const handleVerifySubmit = async () => {
        if (!verifyPhoto) { setVerifyError('Please upload a photo first'); return; }
        setVerifySubmitting(true);
        try {
            const { error } = await supabaseClient.from('profiles')
                .update({ selfie_photo: verifyPhoto, account_status: 'pending' })
                .eq('id', seller.id);
            if (error) throw error;
            setVerifyDone(true);
        } catch (err) {
            setVerifyError('Failed to submit. Please try again.');
        } finally {
            setVerifySubmitting(false);
        }
    };

    const sendSellerReply = () => {
        if (!replyText.trim() || !activeLead) return;
        const phone = (activeLead.buyer_whatsapp || '').replace(/\D/g, '');
        if (!phone) { alert('No buyer number available for this lead.'); return; }
        const msg = encodeURIComponent(replyText.trim());
        setPendingWaMsg({ phone, msg });
        setShowWaChoice(true);
    };

    const openWhatsApp = (type) => {
        const { phone, msg } = pendingWaMsg;
        if (type === 'business') {
            window.location.href = `whatsapp://send?phone=${phone}&text=${msg}`;
            setTimeout(() => {
                window.location.href = `https://wa.me/${phone}?text=${msg}`;
            }, 1500);
        } else {
            window.location.href = `https://wa.me/${phone}?text=${msg}`;
        }
        setShowWaChoice(false);
        setReplyText('');
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col overflow-hidden">
            <div className="bg-[#1a1a1a] p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                    {isOwnProfile ? 'My Profile' : 'Seller Profile'}
                </h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4">
                    <div className="flex items-center gap-6 mb-4">
                        <img 
                            src={seller.profilePhoto} 
                            alt={seller.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
                        />
                        <div className="flex-1 flex justify-around text-center">
                            <div>
                                <div className="font-bold text-lg text-white">{seller.products.length}</div>
                                <div className="text-sm text-gray-400">Products</div>
                            </div>
                            <div>
                                <div className="font-bold text-lg text-white">{seller.views.toLocaleString()}</div>
                                <div className="text-sm text-gray-400">Views</div>
                            </div>
                            <div>
                                <div className="font-bold text-lg text-white">{seller.products.reduce((sum, p) => sum + p.likes, 0).toLocaleString()}</div>
                                <div className="text-sm text-gray-400">Likes</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base text-white">{seller.name}</h3>
                        {isVerifiedDisplay && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                        )}
                        {!isVerifiedDisplay && (
                            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full border border-gray-600">Unverified</span>
                        )}
                        {isTempVerified && isOwnProfile && (
                            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700">{tempDaysLeft}d left</span>
                        )}
                    </div>

                    <p className="text-sm text-gray-300 mb-2">{seller.bio}</p>

                    <div className="flex items-center gap-1 mb-3">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        <p className="text-sm text-gray-400">{seller.location}</p>
                    </div>

                    <div className="mb-4">
                        {isOwnProfile ? (
                            <>
                            {/* Campaign Status Widget */}
                            <CampaignStatusWidget sellerId={seller.id} />

                            {/* Get Customers + icon buttons row */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onShowSubscription}
                                    className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Get Customers
                                </button>
                                <button
                                    onClick={onEditProfile}
                                    className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white transition-colors flex-shrink-0"
                                    title="Edit profile"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button
                                    onClick={() => { setShowLeadsChat(true); setActiveLead(null); if (onOpenLeads) onOpenLeads(); }}
                                    className="relative w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white transition-colors flex-shrink-0"
                                    title="Buyer messages"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/></svg>
                                    {buyerLeads.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                            {buyerLeads.length > 9 ? '9+' : buyerLeads.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (onCopyProfileLink) { onCopyProfileLink(seller.id); return; }
                                        const link = `${window.location.origin}/seller.html?id=${seller.id}`;
                                        try {
                                            const short = await shortenLink(link);
                                            if (navigator.share) {
                                                await navigator.share({ title: seller.name, text: `Check out ${seller.name} on SearchPadi!`, url: short });
                                            } else {
                                                try { await navigator.clipboard.writeText(short); alert('🔗 Profile link copied!'); }
                                                catch(e) { prompt('Copy this link:', short); }
                                            }
                                        } catch(e) {
                                            prompt('Copy this link:', link);
                                        }
                                    }}
                                    className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white transition-colors flex-shrink-0"
                                    title="Share profile"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                                </button>
                            </div>
                            </>
                        ) : (
                            <button
                                onClick={() => onWhatsApp(seller)}
                                className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Contact Seller
                            </button>
                        )}
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-3 text-white">Products</h4>
                        {seller.products.length === 0 ? (
                            isOwnProfile ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 mb-4">No products yet</p>
                                    <button
                                        onClick={onAddProduct}
                                        className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                                    >
                                        + Add Your First Product
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No products yet</p>
                            )
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {seller.products.map((product, idx) => (
                                    <div 
                                        key={idx} 
                                        className="cursor-pointer product-card relative"
                                        onClick={() => onProductClick(product)}
                                    >
                                        <img 
                                            src={product.images?.[0] || 'https://via.placeholder.com/300/6366f1/fff?text=Product'}
                                            alt={product.name}
                                            className="w-full h-32 object-cover rounded-lg mb-1"
                                            onError={e => e.target.src='https://via.placeholder.com/300/6366f1/fff?text=Product'}
                                        />
                                        {isOwnProfile && (
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onEditProduct) onEditProduct(product);
                                                    }}
                                                    className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white"
                                                    title="Edit product"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (onCopyProductLink) { onCopyProductLink(product.id); return; }
                                                        const link = `${window.location.origin}/product.html?id=${product.id}`;
                                                        try {
                                                            const short = await shortenLink(link);
                                                            if (navigator.share) {
                                                                await navigator.share({ title: product.name, text: `Check out ${product.name} on SearchPadi!`, url: short });
                                                            } else {
                                                                try { await navigator.clipboard.writeText(short); alert('🔗 Product link copied!'); }
                                                                catch(e) { prompt('Copy this link:', short); }
                                                            }
                                                        } catch(err) {
                                                            prompt('Copy this link:', link);
                                                        }
                                                    }}
                                                    className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white"
                                                    title="Share product"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteProduct(product.id);
                                                    }}
                                                    className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {product.isTrusted && (
                                            <div className="mb-1">
                                                <div className="inline-flex bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg items-center gap-0.5">
                                                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                    </svg>
                                                    Trusted
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-sm font-semibold truncate text-white">{product.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Add Product Button — hide when leads chat is open */}
            {isOwnProfile && !showLeadsChat && (
                <button
                    onClick={onAddProduct}
                    className="floating-add-button bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2"
                >
                    <span className="text-xl font-bold">+</span>
                    Add Product
                </button>
            )}

            {/* BUYER LEADS CHAT */}
            {showLeadsChat && (
                <div className="fixed inset-0 z-[150] flex flex-col" style={{background:'#0b141a'}}>
                    {/* Header */}
                    <div style={{background:'#1f2c34'}} className="p-3 flex items-center gap-3">
                        <button onClick={() => { if (activeLead) { setActiveLead(null); } else { setShowLeadsChat(false); } }} className="text-gray-400 p-1">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        {activeLead ? (
                            <>
                                <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                                    {(activeLead.buyer_whatsapp || 'B')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-semibold text-sm">{activeLead.buyer_whatsapp || 'Buyer'}</div>
                                    <div className="text-xs text-gray-400 truncate">{activeLead.product_name}</div>
                                </div>
                                {/* Phone call icon */}
                                <button
                                    onClick={() => {
                                        const phone = (activeLead.buyer_whatsapp || '').replace(/\D/g, '');
                                        if (phone) window.location.href = `tel:+${phone}`;
                                    }}
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{background:'#2a3942'}}
                                    title="Call buyer"
                                >
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="#4ade80" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <>
                                <img src={seller.profilePhoto} alt={seller.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white font-semibold text-sm">{seller.name}</span>
                                        {isVerifiedDisplay && (
                                            <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">Buyer Messages ({buyerLeads.length})</div>
                                </div>
                            </>
                        )}
                    </div>

                    {!activeLead ? (
                        /* Lead list */
                        <div className="flex-1 overflow-y-auto">
                            {buyerLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z"/>
                                    </svg>
                                    <p className="text-sm">No buyer messages yet</p>
                                </div>
                            ) : (
                                buyerLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        onClick={() => { 
                                        setActiveLead(lead); 
                                        setReplyText(`Hi, thanks for your interest in "${lead.product_name}"! It's available. When would you like to get it?`);
                                    }}
                                        className="flex items-center gap-3 p-4 border-b border-gray-800 cursor-pointer hover:bg-white/5"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {(lead.buyer_whatsapp || 'B')[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white text-sm font-semibold">{lead.buyer_whatsapp || 'Buyer'}</div>
                                            <div className="text-gray-400 text-xs truncate">{lead.message || 'Interested in your product'}</div>
                                        </div>
                                        <div className="text-gray-500 text-xs flex-shrink-0">
                                            {new Date(lead.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* Single lead chat view */
                        <>
                            <div className="flex-1 overflow-y-auto p-4" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}>
                                {/* Product quote card — always first */}
                                <div className="flex justify-start mb-2">
                                    <div className="rounded-lg rounded-tl-none text-sm text-gray-100 overflow-hidden" style={{background:'#1f2c34', maxWidth:'80%'}}>
                                        <div style={{borderLeft:'3px solid #00a884', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'rgba(0,0,0,0.15)'}}>
                                            {activeLead.product_image && (
                                                <img src={activeLead.product_image} alt="product" style={{width:'36px', height:'36px', borderRadius:'4px', objectFit:'cover', flexShrink:0}}/>
                                            )}
                                            <div>
                                                <div style={{fontSize:'12px', fontWeight:'700', color:'#00a884'}}>{activeLead.product_name}</div>
                                                <div style={{fontSize:'11px', color:'#8696a0', marginTop:'1px'}}>SearchPadi</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Real transcript or fallback */}
                                {activeLead.chat_transcript && activeLead.chat_transcript.length > 0 ? (
                                    activeLead.chat_transcript.map((msg, i) => (
                                        <div key={i} className={`flex mb-2 ${msg.role === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                                            <div className="rounded-lg text-sm text-gray-100 px-3 py-2" style={{
                                                background: msg.role === 'buyer' ? '#1f2c34' : '#005c4b',
                                                maxWidth: '80%',
                                                wordBreak: 'break-word',
                                                borderRadius: msg.role === 'buyer' ? '0 8px 8px 8px' : '8px 0 8px 8px'
                                            }}>
                                                {msg.text}
                                                <div className="text-[10px] text-gray-400 mt-1 text-right">
                                                    {msg.time}{msg.role === 'ai' ? ' ✓✓' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    /* Fallback for old leads with no transcript */
                                    <>
                                        <div className="flex justify-start mb-2">
                                            <div className="rounded-lg rounded-tl-none p-3 text-sm text-gray-100" style={{background:'#1f2c34', maxWidth:'80%'}}>
                                                {activeLead.message || `Hi, I'm interested in "${activeLead.product_name}". Is it still available?`}
                                                <div className="text-[10px] text-gray-500 mt-1">
                                                    {new Date(activeLead.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                        {activeLead.buyer_whatsapp && (
                                            <div className="flex justify-end mb-2">
                                                <div className="rounded-lg rounded-tr-none p-3 text-sm text-gray-100" style={{background:'#005c4b', maxWidth:'80%', wordBreak:'break-word'}}>
                                                    {activeLead.buyer_whatsapp}
                                                    <div className="text-[10px] text-gray-400 mt-1 text-right">✓✓</div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="text-center text-xs text-gray-600 my-3">
                                    Tap Send to reply on WhatsApp
                                </div>
                            </div>
                            {/* Reply bar */}
                            <div className="flex items-end gap-2 p-3" style={{background:'#1f2c34'}}>
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSellerReply(); }}}
                                    placeholder={`Reply to ${activeLead.buyer_whatsapp || 'buyer'}...`}
                                    rows={3}
                                    className="flex-1 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                                    style={{background:'#2a3942', border:'none', minHeight:'80px', maxHeight:'160px', lineHeight:'1.5', fontFamily:'inherit', resize:'none', overflowY:'auto'}}
                                />
                                <button
                                    onClick={sendSellerReply}
                                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{background:'#00a884'}}
                                >
                                    <svg className="w-5 h-5 text-white" fill="white" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* WHATSAPP CHOICE SHEET */}
            {showWaChoice && (
                <div className="fixed inset-0 bg-black/70 z-[300] flex items-end" onClick={() => setShowWaChoice(false)}>
                    <div className="bg-[#1f2c34] rounded-t-2xl w-full p-5 pb-8" onClick={e => e.stopPropagation()}>
                        <div className="w-9 h-1 bg-gray-600 rounded-full mx-auto mb-5"/>
                        <p className="text-white font-semibold text-base mb-4 text-center">Open with</p>
                        <button
                            onClick={() => openWhatsApp('normal')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl mb-3"
                            style={{background:'#2a3942'}}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#25d366'}}>
                                <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                            </div>
                            <div className="text-left">
                                <div className="text-white font-semibold text-sm">WhatsApp</div>
                                <div className="text-gray-400 text-xs">Personal WhatsApp</div>
                            </div>
                        </button>
                        <button
                            onClick={() => openWhatsApp('business')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl"
                            style={{background:'#2a3942'}}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#25d366'}}>
                                <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                                </svg>
                            </div>
                            <div className="text-left">
                                <div className="text-white font-semibold text-sm">WhatsApp Business</div>
                                <div className="text-gray-400 text-xs">Business WhatsApp</div>
                            </div>
                        </button>
                        <button onClick={() => setShowWaChoice(false)} className="w-full text-gray-500 text-sm mt-4">Cancel</button>
                    </div>
                </div>
            )}

            {/* VERIFICATION SHEET */}
            {showVerifySheet && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-end" onClick={e => e.target === e.currentTarget && setShowVerifySheet(false)}>
                    <div className="bg-[#1a1a1a] rounded-t-2xl w-full p-6 pb-10 border-t border-gray-800" onClick={e => e.stopPropagation()}>
                        <div className="w-9 h-1 bg-gray-700 rounded-full mx-auto mb-5"/>

                        {verifyDone ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                                <h3 className="text-white text-xl font-bold mb-2">Submitted!</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">We'll review your ID and get back to you on WhatsApp within 24 hours.</p>
                                <button onClick={() => setShowVerifySheet(false)} className="mt-6 w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Done</button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-white text-xl font-bold mb-1">Get Verified ✓</h3>
                                <p className="text-gray-400 text-sm mb-5">Upload a clear photo of yourself holding your ID card. We'll review and verify your account within 24 hours.</p>

                                <input ref={verifyFileRef} type="file" accept="image/*" className="hidden" onChange={handleVerifyPhotoChange} />

                                {verifyPreview ? (
                                    <div className="relative mb-4">
                                        <img src={verifyPreview} className="w-full h-48 object-cover rounded-xl border-2 border-purple-600" alt="ID preview"/>
                                        <button onClick={() => verifyFileRef.current?.click()} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1 rounded-lg">Change</button>
                                    </div>
                                ) : (
                                    <button onClick={() => verifyFileRef.current?.click()} className="w-full border-2 border-dashed border-gray-700 rounded-xl p-8 mb-4 text-center bg-transparent cursor-pointer hover:border-purple-600 transition-colors">
                                        <p className="text-3xl mb-2">🤳</p>
                                        <p className="text-white font-semibold text-sm">Tap to upload photo</p>
                                        <p className="text-gray-500 text-xs mt-1">Hold your ID clearly visible in the photo</p>
                                    </button>
                                )}

                                {verifyError && <p className="text-red-400 text-sm mb-3">{verifyError}</p>}

                                <button
                                    onClick={handleVerifySubmit}
                                    disabled={!verifyPhoto || verifySubmitting}
                                    className="w-full bg-purple-600 disabled:opacity-40 text-white py-3 rounded-xl font-bold text-sm"
                                >
                                    {verifySubmitting ? 'Submitting...' : 'Submit for Verification'}
                                </button>
                                <button onClick={() => setShowVerifySheet(false)} className="w-full text-gray-500 text-sm mt-3">Cancel</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Product Detail Component

