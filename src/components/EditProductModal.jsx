import React, { useState, useRef } from 'react'
import { supabaseClient } from '../supabase'
import { DEFAULT_PRODUCT_IMAGE } from '../helpers'

export default function EditProductModal({ product, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: product.name || '',
        description: product.description || '',
        price_amount: product.price_amount ? String(product.price_amount) : ''
    });
    const [previewImage, setPreviewImage] = useState(product.images?.[0] || DEFAULT_PRODUCT_IMAGE);
    const [newImage, setNewImage] = useState(null); // only set if seller changes photo
    const [priceError, setPriceError] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

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
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const validatePrice = (val) => {
        const cleaned = val.trim();
        if (!cleaned) return null;
        const numeric = parseFloat(cleaned.replace(/[₦,\s]/g, ''));
        if (isNaN(numeric) || numeric <= 0 || /[a-zA-Z]/.test(cleaned.replace(/[₦,\s]/g, ''))) return false;
        return numeric;
    };

    const handlePriceChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, price_amount: val });
        if (val.trim()) {
            setPriceError(validatePrice(val) === false ? 'Enter numbers only. Example: 5000 or 15000' : '');
        } else {
            setPriceError('');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
        try {
            setUploadingImage(true);
            const compressed = await compressImage(file, 800, 0.7);
            setPreviewImage(compressed);
            setNewImage(compressed);
        } catch (err) {
            alert('Failed to process image. Please try another.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { alert('Product name is required'); return; }
        if (formData.price_amount.trim() && validatePrice(formData.price_amount) === false) {
            setPriceError('Enter numbers only. Example: 5000 or 15000');
            return;
        }

        setSaving(true);
        try {
            const numericPrice = validatePrice(formData.price_amount);
            const updates = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                price_amount: numericPrice || null,
                keywords: formData.name.toLowerCase().split(' ').filter(w => w.length > 2),
            };
            if (newImage) {
                // Replace first image, keep any others
                const updatedImages = [...(product.images || [])];
                updatedImages[0] = newImage;
                updates.images = updatedImages;
            }

            const { error } = await supabaseClient
                .from('products')
                .update(updates)
                .eq('id', product.id);

            if (error) throw error;

            // Return updated product to parent
            onSave({
                ...product,
                ...updates,
                images: updates.images || product.images,
            });
            onClose();
        } catch (err) {
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Edit Product</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">✕</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Image */}
                        <div className="relative w-full">
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-lg border-2 border-purple-600"
                                onError={e => e.target.src = DEFAULT_PRODUCT_IMAGE}
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
                                disabled={uploadingImage}
                                className="absolute bottom-3 right-3 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-600"
                            >
                                {uploadingImage ? 'Uploading...' : '🔄 Change Photo'}
                            </button>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                placeholder="e.g., iPhone 15 Pro Max"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Product Description (Optional)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500"
                                rows="4"
                                placeholder="Describe your product: features, condition, specifications, etc."
                            />
                            <p className="text-xs text-gray-400 mt-1">This will be shown in "About Product" section</p>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Product Price <span className="text-gray-500">(Optional — hidden from buyers)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₦</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.price_amount}
                                    onChange={handlePriceChange}
                                    className={`w-full pl-8 pr-4 py-2 bg-[#2a2a2a] border ${priceError ? 'border-red-500' : 'border-gray-700'} text-white rounded-lg focus:outline-none focus:border-purple-500`}
                                    placeholder="e.g. 5000 or 15000"
                                />
                            </div>
                            {priceError ? (
                                <p className="text-xs text-red-400 mt-1">⚠️ {priceError}</p>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1">Only you can see this. Helps our AI negotiate better with buyers.</p>
                            )}
                        </div>

                        {/* Save button */}
                        <button
                            type="submit"
                            disabled={saving || uploadingImage}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving && (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                            )}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
