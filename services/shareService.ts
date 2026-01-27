/**
 * Share Service - Handles sharing functionality using Web Share API
 * with fallback to clipboard for unsupported browsers
 */

export interface ShareData {
    title: string;
    text?: string;
    url?: string;
}

export const shareService = {
    /**
     * Check if Web Share API is supported
     */
    isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'share' in navigator;
    },

    /**
     * Share content using Web Share API or fallback to clipboard
     */
    async share(data: ShareData): Promise<{ success: boolean; method: 'native' | 'clipboard'; error?: string }> {
        // Try native share first
        if (this.isSupported()) {
            try {
                await navigator.share({
                    title: data.title,
                    text: data.text,
                    url: data.url,
                });
                return { success: true, method: 'native' };
            } catch (error: any) {
                // User cancelled share - not an error
                if (error.name === 'AbortError') {
                    return { success: false, method: 'native', error: 'Compartilhamento cancelado' };
                }
                console.error('Native share failed:', error);
                // Fall through to clipboard fallback
            }
        }

        // Fallback to clipboard
        const textToShare = data.url
            ? `${data.title}\n${data.text || ''}\n${data.url}`.trim()
            : `${data.title}\n${data.text || ''}`.trim();

        try {
            await navigator.clipboard.writeText(textToShare);
            return { success: true, method: 'clipboard' };
        } catch (error: any) {
            console.error('Clipboard write failed:', error);
            return {
                success: false,
                method: 'clipboard',
                error: 'Não foi possível copiar para a área de transferência'
            };
        }
    },

    /**
     * Generate a shareable link for a trip
     */
    generateTripLink(tripId: string): string {
        const baseUrl = window.location.origin;
        return `${baseUrl}/#/trip/${tripId}`;
    },

    /**
     * Share a trip with predefined message
     */
    async shareTrip(tripId: string, tripTitle: string, tripDates: string): Promise<{ success: boolean; method: 'native' | 'clipboard'; error?: string }> {
        const url = this.generateTripLink(tripId);
        return this.share({
            title: `🌴 ${tripTitle}`,
            text: `Confira essa viagem: ${tripTitle} (${tripDates})`,
            url,
        });
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    },
};
