// Retry the complete transfer, including the response body. Fetch resolving
// only means the headers arrived; the firmware can still stall or disconnect.
export async function downloadFirmware(url, {
    attempts = 2,
    timeoutMs = 60000,
    retryDelayMs = 1000,
} = {}) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let retryable = true;
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                retryable = response.status === 408 || response.status === 429 || response.status >= 500;
                throw new Error(`Firmware download failed: HTTP ${response.status}`);
            }
            const text = await response.text();
            if (!text.trim()) throw new Error("Firmware download returned an empty file");
            return text;
        } catch (error) {
            if (!retryable || attempt === attempts) throw error;
        } finally {
            clearTimeout(timer);
            controller.abort();
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
}
