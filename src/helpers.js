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
    // Call our own Vercel API route — no CORS issues since it's same origin
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('/api/shorten?url=' + encodeURIComponent(url), {
            signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
            const data = await res.json();
            if (data.short) return data.short;
        }
    } catch (e) {}

    // Final fallback — return original URL so copy still works
    return url;
}
