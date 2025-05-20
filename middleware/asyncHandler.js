/**
 * Async handler wrapper for express route handlers
 * @param {Function} fn Express route handler function
 * @returns {Function} Wrapped route handler with error catching
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    });
};