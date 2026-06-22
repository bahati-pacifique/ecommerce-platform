module.exports = (
    err,
    req,
    res,
    next
) => {

    console.error(err);

    if (err.message === 'Not allowed by CORS') {

        return res.status(403).json({
            success: false,
            status: 'forbidden',
            code: 'POLICY_VIOLATION',
            message: 'Failed — Unknown source',
            details: 'Access blocked: Unknown source!'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
};