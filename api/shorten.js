export default async function handler(req, res) {
    // Allow CORS from your own domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    // Try TinyURL first (no CORS issues server-side)
    try {
        const response = await fetch(
            'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url)
        );
        if (response.ok) {
            const short = (await response.text()).trim();
            if (short.startsWith('https://tinyurl.com/')) {
                return res.status(200).json({ short });
            }
        }
    } catch (e) {}

    // Fallback: is.gd
    try {
        const response = await fetch(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
        );
        if (response.ok) {
            const short = (await response.text()).trim();
            if (short.startsWith('https://is.gd/')) {
                return res.status(200).json({ short });
            }
        }
    } catch (e) {}

    // Both failed — return original
    return res.status(200).json({ short: url });
}
