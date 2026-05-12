/**
 * Middleware de verificación de rol de vendedor
 * Verifica que req.usuario.rol === 'vendedor'
 */
function verificarRol(rolRequerido) {
    return (req, res, next) => {
        const usuario = req.usuario;

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado.' });
        }

        if (rolRequerido === 'vendedor' && usuario.rol !== 'vendedor') {
            return res.status(403).json({
                error: 'Acceso denegado. Se requiere rol de vendedor.'
            });
        }

        next();
    };
}

module.exports = verificarRol;
