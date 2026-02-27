export const logPerformance = (metrics) => {
    const { ttft, totalDuration, aborted, requestId } = metrics;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Request: ${requestId} | TTFT: ${ttft}ms | Total: ${totalDuration}ms | Aborted: ${aborted}`);
};
