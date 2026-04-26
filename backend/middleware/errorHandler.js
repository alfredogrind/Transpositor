const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.message);

    if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
            success: false,
            error: 'Ya existe una canción con ese nombre'
        });
    }

    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Error interno del servidor'
            : err.message
    });
};

module.exports = errorHandler;
