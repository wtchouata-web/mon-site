<?php
/**
 * Index principal du thème La Cave / Rose Amour Catalog.
 * Il sert d'ancrage pour charger l'intégralité du catalogue React.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php wp_title('|', true, 'right'); ?></title>
    <?php wp_head(); ?>
    <style>
        /* Styles de réinitialisation sécurisés pour intégrer proprement l'application Rose Amour */
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #0f172a;
        }
        .rose-amour-bootstrap-scope {
            display: block;
            min-height: 100vh;
        }
    </style>
</head>
<body <?php body_class(); ?>>

    <!-- Point d'ancrage de notre application React -->
    <div id="rose-amour-wp-app" class="rose-amour-bootstrap-scope">
        <div id="root">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #fff5f7, #fdf2f8);">
                <div style="font-size: 48px; margin-bottom: 20px;">🌹</div>
                <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; color: #db2715; margin-bottom: 10px; font-weight: 800;">
                    Rose Amour Cameroun
                </h1>
                <p style="font-size: 16px; color: #64748b; max-width: 400px; line-height: 1.6; margin-bottom: 24px;">
                    Chargement sécurisé du catalogue dynamique de fiches réelles... Récupération des profils de la base de données locale.
                </p>
                <!-- Spinner élégant animé via CSS standard inline pour un affichage instantané -->
                <div class="ra-spinner"></div>
            </div>
        </div>
    </div>

    <style>
        .ra-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #fbcfe8;
            border-top: 4px solid #db2777;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>

    <?php wp_footer(); ?>
</body>
</html>
