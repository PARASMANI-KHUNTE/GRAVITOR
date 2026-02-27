/**
 * Centralized request manager to track active streams and 
 * kill them cleanly to prevent race conditions or resource leaks.
 */
class RequestManager {
    constructor() {
        this.activeRequests = new Map();
    }

    /**
     * Add a request and its controller. Aborts previous request for same ID.
     */
    register(requestId, controller) {
        if (this.activeRequests.has(requestId)) {
            this.activeRequests.get(requestId).abort();
            console.log(`[RequestManager] Aborted previous session for request: ${requestId}`);
        }
        this.activeRequests.set(requestId, controller);
    }

    /**
     * Remove request when finished.
     */
    unregister(requestId) {
        this.activeRequests.delete(requestId);
    }

    /**
     * Cleanup all (shutdown scenario)
     */
    cleanup() {
        for (const controller of this.activeRequests.values()) {
            controller.abort();
        }
        this.activeRequests.clear();
    }
}

export const requestManager = new RequestManager();
