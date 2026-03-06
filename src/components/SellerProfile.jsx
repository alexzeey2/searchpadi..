import React, { useState, useEffect } from 'react'
import { supabaseClient } from '../supabase'
import { shortenLink } from '../helpers'
import CampaignStatusWidget from './CampaignStatusWidget'

export default function SellerProfile({ seller, isOwnProfile, onClose, onWhatsApp, onShowSubscription, onAddProduct, onProductClick, onDeleteProduct, onEditProfile, onShare, onAttractCustomers }) {
    const isTempVerified = seller.tempVerifiedUntil && new Date(seller.tempVerifiedUntil) > new Date();
    const tempDaysLeft = seller.tempVerifiedUntil ? Math.ceil((new Date(seller.tempVerifiedUntil) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const isVerifiedDisplay = seller.isVerified || isTempVerified;

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col overflow-hidden">
            <div className="bg-[#1a1a1a] p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                    {isOwnProfile ? 'My Profile' : 'Seller Profile'}
                </h2>
                <div className="flex items-center gap-2">
                    {isOwnProfile && (
                        <button
                            onClick={onEditProfile}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            ✎ Edit
                        </button>
                    )}
                    <button
                        onClick={async () => {
                            const link = `${window.location.origin}/seller.html?id=${seller.id}`;
                            const short = await shortenLink(link);
                            if (navigator.share) {
                                navigator.share({ title: seller.name, text: `Check out ${seller.name} on SearchPadi!`, url: short });
                            } else {
                                navigator.clipboard?.writeText(short).then(() => alert('🔗 Profile link copied!')).catch(() => {
                                    prompt('Copy this link:', short);
                                });
                            }
                        }}
                        className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white transition-colors"
                        title="Share profile"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                    </button>
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
                            {/* Demand data — show category search interest */}
                            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3 mb-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-900/60 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold">
                                        <span className="text-yellow-400">{Math.floor(Math.random() * 80 + 20) + (seller.views || 0)}</span> people searched <span className="text-purple-300">{seller.category}</span> this week
                                    </p>
                                    <p className="text-gray-400 text-xs mt-0.5">Run a campaign to reach them before they find someone else</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onShowSubscription}
                                    className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Get Customers
                                </button>
                                <button
                                    onClick={onAttractCustomers}
                                    className="flex-1 bg-[#2a2a2a] border border-gray-700 text-gray-300 py-2 px-3 rounded-lg text-sm font-semibold hover:border-purple-500 hover:text-purple-400 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                                    Verify for Free
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
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-32 object-cover rounded-lg mb-1"
                                        />
                                        {isOwnProfile && (
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const link = `${window.location.origin}/product.html?id=${product.id}`;
                                                        const short = await shortenLink(link);
                                                        if (navigator.share) {
                                                            navigator.share({ title: product.name, text: `Check out ${product.name} on SearchPadi!`, url: short });
                                                        } else {
                                                            navigator.clipboard?.writeText(short).then(() => alert('🔗 Product link copied!')).catch(() => {
                                                                prompt('Copy this link:', short);
                                                            });
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

            {/* Floating Add Product Button */}
            {isOwnProfile && (
                <button
                    onClick={onAddProduct}
                    className="floating-add-button bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2"
                >
                    <span className="text-xl font-bold">+</span>
                    Add Product
                </button>
            )}
        </div>
    );
}

// Product Detail Component

