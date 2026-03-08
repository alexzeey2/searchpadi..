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
    // Try TinyURL's CORS-friendly v1 API with a 4s timeout
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url), {
            signal: controller.signal,
            mode: 'cors',
        });
        clearTimeout(timer);

        if (res.ok) {
            const short = (await res.text()).trim();
            if (short.startsWith('https://tinyurl.com/')) return short;
        }
    } catch (e) {
        // CORS blocked or timeout — try is.gd as backup
    }

    // Fallback: is.gd (supports CORS natively)
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
            { signal: controller.signal }
        );
        clearTimeout(timer);

        if (res.ok) {
            const short = (await res.text()).trim();
            if (short.startsWith('https://is.gd/')) return short;
        }
    } catch (e) {}

    // Both failed — return original URL so copy still works
    return url;
}
