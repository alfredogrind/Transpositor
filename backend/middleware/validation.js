const validarCancion = (req, res, next) => {
    const { cantautor, nombre } = req.body;

    if (!cantautor || typeof cantautor !== 'string' || cantautor.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'El cantautor es requerido'
        });
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'El nombre de la canción es requerido'
        });
    }

    if (cantautor.length > 100 || nombre.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Cantautor o nombre demasiado largo (máx 100 caracteres)'
        });
    }

    next();
};

module.exports = { validarCancion };
