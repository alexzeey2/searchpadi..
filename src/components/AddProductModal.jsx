import React, { useState, useRef } from 'react'
import { DEFAULT_PRODUCT_IMAGE } from '../helpers'

const MAX_IMAGES = 4;

export default function AddProductModal({ onClose, onAdd, isUploading }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_amount: ''
    });
    const [priceError, setPriceError] = useState('');
    const [previewImages, setPreviewImages] = useState([null]); // null = empty slot
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const fileInputRefs = useRef([]);

    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
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

    const handleImageUpload = async (index, e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
        try {
            setUploadingIndex(index);
            const compressed = await compressImage(file, 800, 0.7);
            const updated = [...previewImages];
            updated[index] = compressed;
            // If this was the last slot and we're under max, add a new empty slot
            if (index === updated.length - 1 && updated.length < MAX_IMAGES) {
                updated.push(null);
            }
            setPreviewImages(updated);
        } catch {
            alert('Failed to process image. Please try another.');
        } finally {
            setUploadingIndex(null);
        }
    };

    const removeImage = (index) => {
        const updated = previewImages.filter((_, i) => i !== index);
        if (updated.length === 0) updated.push(null);
        // If all remaining slots are filled and under max, add empty slot
        if (updated[updated.length - 1] !== null && updated.length < MAX_IMAGES) {
            updated.push(null);
        }
        setPreviewImages(updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { alert('Please enter a product name'); return; }
        if (formData.price_amount.trim() && validatePrice(formData.price_amount) === false) {
            setPriceError('Enter numbers only. Example: 5000 or 15000');
            return;
        }
        const numeric = validatePrice(formData.price_amount);
        const finalImages = previewImages.filter(img => img !== null);
        onAdd({
            ...formData,
            price: 'Ask for Price',
            price_amount: numeric || null,
            images: finalImages.length > 0 ? finalImages : [DEFAULT_PRODUCT_IMAGE],
            description: formData.description
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Add Product</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white">✕</button>
                    </div>

                    <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4 mb-5">
                        <p className="text-white text-sm font-semibold">📸 Add up to 4 photos — more photos attract more buyers!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Image Grid */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Product Photos <span className="text-gray-500">({previewImages.filter(i => i !== null).length}/{MAX_IMAGES})</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {previewImages.map((img, index) => (
                                    <div key={index} className="relative" style={{ aspectRatio: '1' }}>
                                        {img ? (
                                            <>
                                                <img
                                                    src={img}
                                                    alt={`Product ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-xl border-2 border-purple-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                >✕</button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRefs.current[index]?.click()}
                                                    disabled={uploadingIndex === index}
                                                    className="absolute bottom-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-xs font-semibold"
                                                >
                                                    {uploadingIndex === index ? '...' : '🔄'}
                                                </button>
                                                {index === 0 && (
                                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Cover</div>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[index]?.click()}
                                                disabled={uploadingIndex !== null}
                                                className="w-full h-full border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
                                            >
                                                {uploadingIndex === index ? (
                                                    <span className="text-sm">Uploading...</span>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl">📷</span>
                                                        <span className="text-xs font-medium">Add Photo</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <input
                                            type="file"
                                            ref={el => fileInputRefs.current[index] = el}
                                            onChange={(e) => handleImageUpload(index, e)}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                ))}
                            </div>
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

                        <button
                            type="submit"
                            disabled={isUploading}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isUploading && (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                            )}
                            {isUploading ? 'Uploading...' : 'Add Product'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
