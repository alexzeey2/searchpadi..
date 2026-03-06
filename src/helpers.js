export const formatPhoneNumber = (phone) => {
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (phone.startsWith('234')) phone = phone.substring(3);
    return '+234' + phone;
};

export const WHATSAPP_NUMBER = "+2349058150220";

export const DEFAULT_PROFILE_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Profile";
export const DEFAULT_PRODUCT_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Product";

export async function shortenLink(url) {
    try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        if (res.ok) {
            const short = await res.text();
            if (short.startsWith('https://')) return short;
        }
    } catch(e) {}
    return url;
}
