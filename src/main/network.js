// Network utility — detects LAN IP address
const os = require('os');

/**
 * Get the first suitable LAN IPv4 address.
 * Prefers 192.168.x.x and 10.x.x.x ranges.
 * @returns {string} LAN IP address or 'localhost' as fallback
 */
function getLanIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4
            if (iface.internal || iface.family !== 'IPv4') continue;

            candidates.push({
                address: iface.address,
                name: name,
            });
        }
    }

    // Prefer 192.168.x.x
    const preferred = candidates.find((c) => c.address.startsWith('192.168.'));
    if (preferred) return preferred.address;

    // Then try 10.x.x.x
    const tenRange = candidates.find((c) => c.address.startsWith('10.'));
    if (tenRange) return tenRange.address;

    // Then try 172.16-31.x.x
    const privateRange = candidates.find((c) => {
        const parts = c.address.split('.');
        return parts[0] === '172' && parseInt(parts[1]) >= 16 && parseInt(parts[1]) <= 31;
    });
    if (privateRange) return privateRange.address;

    // Any non-internal IPv4
    if (candidates.length > 0) return candidates[0].address;

    return 'localhost';
}

module.exports = { getLanIP };
