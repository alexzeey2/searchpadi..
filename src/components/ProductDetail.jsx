import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'

export default function ProductDetail({ product, onClose, onSellerClick, onWhatsApp, onToggleLike }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [liked, setLiked] = useState(product.liked || false);
    const [likesCount, setLikesCount] = useState(product.likes || 0);

    const trackAdClick = async () => {
        try {
            const { data: campaigns } = await supabaseClient
                .from('pending_payments').select('id, ad_clicks, click_quota')
                .eq('product_id', product.id).eq('status', 'running').limit(1);
            if (campaigns && campaigns.length > 0) {
                const camp = campaigns[0];
                const newClicks = (camp.ad_clicks || 0) + 1;
                const quota = camp.click_quota || 5;
                await supabaseClient.from('pending_payments').update({
                    ad_clicks: newClicks,
                    status: newClicks >= quota ? 'completed' : 'running'
                }).eq('id', camp.id);
            }
        } catch(e) { console.error('Ad click track error:', e); }
    };

    const handleLike = () => {
        const newLiked = !liked;
        const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
        setLiked(newLiked);
        setLikesCount(newCount);
        // Call parent toggle to update global state + Supabase
        if (onToggleLike && product.seller?.id) {
            onToggleLike(product.seller.id, product.id);
        } else {
            // Fallback direct save
            supabaseClient
                .from('products')
                .update({ likes: newCount })
                .eq('id', product.id)
                .then(({ error }) => { if (error) console.error('Likes error:', error); });
        }
    };

    const minSwipeDistance = 50;

    const handleTouchStart = (e) => {
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < product.images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleLeftClick = (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleRightClick = (e) => {
        e.stopPropagation();
        if (currentIndex < product.images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[60]" onClick={onClose}>
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* Image Display */}
                <div 
                    className="w-full h-full flex items-center justify-center" 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <img 
                        src={product.images[currentIndex]}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Left Click Area */}
                <div 
                    className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
                    onClick={handleLeftClick}
                />

                {/* Right Click Area */}
                <div 
                    className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
                    onClick={handleRightClick}
                />
                
                {/* Top Bar with Lines and Info */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                    {/* WhatsApp-style Lines Indicator */}
                    <div className="flex gap-1 mb-3">
                        {product.images.map((_, idx) => (
                            <div 
                                key={idx}
                                className="flex-1 h-0.5 rounded-full transition-all"
                                style={{
                                    backgroundColor: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.3)'
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onSellerClick(product.seller);
                            }}
                        >
                            <img 
                                src={product.seller.profilePhoto} 
                                alt={product.seller.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-1">
                                    <p className="font-semibold text-white text-sm">{product.seller.name}</p>
                                    {product.seller.isVerified && (
                                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                        </svg>
                                    )}
                                </div>
                                <p className="text-xs text-white/80">{product.seller.location}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-9 h-9 rounded-full flex items-center justify-center"
                        >
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Bottom Bar with About Product, Product Name and Buttons */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-5 pb-6" onClick={(e) => e.stopPropagation()}>
                    
                    {/* About Product Button - ON TOP */}
                    {product.description && (
                        <button
                            onClick={() => setShowDescriptionModal(true)}
                            className="w-full mb-3 bg-white/10 backdrop-blur-sm text-white py-3 rounded-lg font-medium text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            About Product
                        </button>
                    )}
                    
                    {/* Product Name */}
                    <div className="mb-3">
                        <h3 className="text-xl font-bold text-white">{product.name}</h3>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { trackAdClick(); onWhatsApp(product.seller, product); }}
                            className="flex-1 bg-green-500 text-black py-3 rounded-lg font-semibold text-sm hover:bg-green-600 active:scale-98 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Ask for Price
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike();
                            }}
                            className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all"
                        >
                            <svg className="w-6 h-6 transition-all" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : 'white'} strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Description Modal - Slides up from bottom */}
                {showDescriptionModal && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-[70] flex items-end"
                        onClick={() => setShowDescriptionModal(false)}
                    >
                        <div 
                            className="bg-[#1a1a1a] w-full rounded-t-3xl max-h-[70vh] overflow-y-auto animate-slide-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
                            </div>
                            
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Product Description</h3>
                                <button 
                                    onClick={() => setShowDescriptionModal(false)}
                                    className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Description Content */}
                            <div className="px-6 py-6">
                                <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">
                                    {product.description || 'No description available.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Registration Modal
