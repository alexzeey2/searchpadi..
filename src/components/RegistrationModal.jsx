import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'
import { formatPhoneNumber } from '../helpers'

export default function RegistrationModal({ onClose, onRegister, onSwitchToLogin }) {
    const [formData, setFormData] = useState({
        profilePhoto: '',
        businessName: '',
        email: '',
        category: 'phones',
        gender: '',
        location: '',
        whatsappNumber: '',
        password: '',
        bio: '',
        selfiePhoto: '',
        verificationVideo: ''
    });
    const [previewPhoto, setPreviewPhoto] = useState(DEFAULT_PROFILE_IMAGE);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [videoName, setVideoName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFreeSlot, setIsFreeSlot] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [isFreeVerified, setIsFreeVerified] = useState(false);
    const fileInputRef = useRef(null);
    const selfieInputRef = useRef(null);
    const videoInputRef = useRef(null);

    useEffect(() => {
        // Check if free slots available
        const checkFreeSlots = async () => {
            const { data } = await supabaseClient
                .from('app_settings')
                .select('free_verified_count')
                .eq('id', 1)
                .single();
            setIsFreeSlot((data?.free_verified_count || 0) < 5);
        };
        checkFreeSlots();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.businessName || !formData.email || !formData.location || !formData.whatsappNumber || !formData.password) {
            setError('Please fill in all required fields');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        // Sellers list immediately — selfie/video no longer required at signup

        setIsLoading(true);
        try {
            await onRegister({ ...formData, profilePhoto: previewPhoto });
            setSubmitted(true);
            setIsFreeVerified(isFreeSlot);
        } catch (err) {
            setError('Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
            try {
                const compressed = await compressImage(file, 800, 0.7);
                setPreviewPhoto(compressed);
                setFormData({ ...formData, profilePhoto: compressed });
            } catch (error) { alert('Failed to process image.'); }
        }
    };

    const handleSelfieUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
            try {
                const compressed = await compressImage(file, 800, 0.8);
                setSelfiePreview(compressed);
                setFormData({ ...formData, selfiePhoto: compressed });
            } catch (error) { alert('Failed to process image.'); }
        }
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) { alert('Video must be less than 50MB'); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData({ ...formData, verificationVideo: ev.target.result });
                setVideoName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    // Show success screen after submission
    if (submitted) {
        return (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
                <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-8 border border-gray-800 text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h2 className="text-2xl font-bold text-white mb-3">You're Live on SearchPadi!</h2>
                    <p className="text-gray-300 mb-4">Your store is active. Buyers can find and contact you right now.</p>
                    <div className="bg-[#2a2a2a] rounded-xl p-4 mb-6 text-left space-y-3">
                        <p className="text-gray-400 text-sm flex items-start gap-2">
                            <span>📦</span>
                            <span>Add your products so buyers can see what you sell.</span>
                        </p>
                        <p className="text-gray-400 text-sm flex items-start gap-2">
                            <span>⭐</span>
                            <span>You'll show as <strong className="text-white">Unverified</strong> until our team reviews you — this is normal and won't stop buyers from contacting you.</span>
                        </p>
                        <p className="text-gray-400 text-sm flex items-start gap-2">
                            <span>📣</span>
                            <span>Use the <strong className="text-white">Get Customers</strong> button to run a campaign and reach more buyers.</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700">
                        Start Selling!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Become a Seller</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">
                            ✕
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center mb-4">
                            <img 
                                src={previewPhoto} 
                                alt="Preview"
                                className="w-24 h-24 rounded-full object-cover border-4 border-purple-600 mb-3"
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                            >
                                Upload Photo
                            </button>
                            <p className="text-xs text-gray-400 mt-2">Max 5MB (auto-compressed to ~200KB)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="e.g., TechZone Mobile Lagos"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp Number *</label>
                            <div className="flex gap-2">
                                <span className="bg-[#3a3a3a] border border-gray-700 text-white px-4 py-2 rounded-lg flex items-center font-medium">
                                    +234
                                </span>
                                <input
                                    type="tel"
                                    required
                                    value={formData.whatsappNumber}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').substring(0, 10);
                                        setFormData({ ...formData, whatsappNumber: value });
                                    }}
                                    className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                    placeholder="8012345678"
                                    maxLength="10"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">For buyer contacts (used in "Ask for Price" button)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="e.g., yourname@gmail.com"
                            />
                            <p className="text-xs text-gray-400 mt-1">For login and account verification</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                            <select
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                            >
                                <option value="phones">📱 Phones & Gadgets</option>
                                <option value="electronics">💻 Electronics</option>
                                <option value="shoes">👟 Shoes & Footwear</option>
                                <option value="fashion">👔 Clothes & Fashion</option>
                                <option value="furniture">🏠 Home & Furniture</option>
                                <option value="foods">🍕 Foods & Edibles</option>
                                <option value="beauty">💄 Beauty & Personal Care</option>
                                <option value="general">🛒 General Store</option>
                            </select>
                        </div>

                        {(formData.category === 'shoes' || formData.category === 'fashion') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Target Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="male">👨 Male</option>
                                    <option value="female">👩 Female</option>
                                    <option value="both">👥 Both</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Location *</label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="e.g., Lagos Island, Nigeria"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="Create a strong password"
                                minLength="6"
                            />
                            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Bio (optional)</label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                rows="3"
                                placeholder="Tell customers about your business..."
                            />
                        </div>

                        {/* All sellers list immediately - no verification wall */}
                        <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-center">
                            <p className="text-green-400 font-bold">🎉 Your store goes live instantly!</p>
                            <p className="text-gray-400 text-xs mt-1">You'll appear as "Unverified" until we review your account. Buyers can still find and contact you right away.</p>
                        </div>

                        {isFreeSlot === true && (
                            <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-center" style={{display:'none'}}>
                                <p className="text-green-400 font-bold">🎉 You're one of our first 5 sellers!</p>
                                <p className="text-gray-400 text-xs mt-1">No verification required. Your account activates instantly!</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isLoading ? 'Creating Account...' : 'Register as Seller'}
                        </button>
                        
                        {onSwitchToLogin && (
                            <p className="text-center text-gray-400 text-sm mt-4">
                                Already have an account?{' '}
                                <button 
                                    type="button"
                                    onClick={onSwitchToLogin}
                                    className="text-purple-500 hover:text-purple-400 font-medium"
                                >
                                    Login here
                                </button>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

// Login Modal Component
