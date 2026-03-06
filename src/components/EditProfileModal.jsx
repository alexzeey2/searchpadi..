import React, { useState, useEffect, useRef } from 'react'
import { supabaseClient } from '../supabase'

export default function EditProfileModal({ seller, onClose, onSave }) {
    const [form, setForm] = useState({
        businessName: seller.name || '',
        bio: seller.bio || '',
        location: seller.location || '',
        whatsappNumber: seller.whatsappNumber || '',
        category: seller.category || 'phones',
        gender: seller.gender || '',
        profilePhoto: seller.profilePhoto || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [photoPreview, setPhotoPreview] = useState(seller.profilePhoto || '');

    const categories = [
        { value: 'phones', label: '📱 Phones & Gadgets' },
        { value: 'electronics', label: '💻 Electronics' },
        { value: 'shoes', label: '👟 Shoes & Footwear' },
        { value: 'fashion', label: '👔 Clothes & Fashion' },
        { value: 'furniture', label: '🏠 Home & Furniture' },
        { value: 'foods', label: '🍕 Foods & Edibles' },
        { value: 'beauty', label: '💄 Beauty & Personal Care' },
        { value: 'general', label: '🛒 General Store' },
    ];

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result);
            setForm(f => ({ ...f, profilePhoto: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!form.businessName.trim()) { setError('Business name is required'); return; }
        if (!form.whatsappNumber.trim()) { setError('WhatsApp number is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save. Try again.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-[200] flex flex-col overflow-hidden">
            <div className="bg-[#1a1a1a] p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Profile Photo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <img
                            src={photoPreview || 'https://via.placeholder.com/80'}
                            className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
                            alt="Profile"
                        />
                        <label className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                            <span className="text-white text-sm">✎</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                    </div>
                    <p className="text-gray-400 text-xs">Tap pencil to change photo</p>
                </div>

                {/* Business Name */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Business Name *</label>
                    <input
                        type="text"
                        value={form.businessName}
                        onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="Your business name"
                    />
                </div>

                {/* Bio */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Bio</label>
                    <textarea
                        value={form.bio}
                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                        rows={3}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                        placeholder="Tell buyers about your business..."
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Location</label>
                    <input
                        type="text"
                        value={form.location}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="e.g. Lagos, Abuja..."
                    />
                </div>

                {/* WhatsApp */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">WhatsApp Number *</label>
                    <input
                        type="tel"
                        value={form.whatsappNumber}
                        onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="+234..."
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1">Category</label>
                    <select
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                        {categories.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Gender (only for fashion/shoes) */}
                {(form.category === 'fashion' || form.category === 'shoes') && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-1">Target Gender</label>
                        <select
                            value={form.gender}
                            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                            <option value="">Not specified</option>
                            <option value="male">👨 Male</option>
                            <option value="female">👩 Female</option>
                            <option value="both">👥 Both</option>
                        </select>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">{error}</div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
            </div>
        </div>
    );
}

