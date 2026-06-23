<?php
/**
 * Plugin Name: Rose Amour Cameroun - Intégration Catalogue React & Base de Données WP
 * Plugin URI: https://rose-amour.cm
 * Description: Intégration complète du catalogue "Rose Amour Cameroun" développé en React. Enregistre un Custom Post Type 'rose_amour_profile' et un serveur REST API REST complet pour stocker les profils réels en base de données MySQL locale ou de production.
 * Version: 1.1.0
 * Author: Rose Amour Staff
 * License: GPL2
 */

// S'assurer qu'on ne puisse pas y accéder directement
if (!defined('ABSPATH')) {
    exit;
}

/**
 * 1. ENREGISTREMENT DU TYPE DE CONTENU PERSONNALISÉ (CUSTOM POST TYPE)
 * Ce type permet de stocker les profils dans la base de données réelle de WordPress
 */
function rose_amour_register_profile_cpt() {
    $labels = array(
        'name'               => 'Profils Rose Amour',
        'singular_name'      => 'Profil Rose Amour',
        'menu_name'          => 'Rose Amour ✔',
        'add_new'            => 'Ajouter un Profil',
        'add_new_item'       => 'Ajouter un nouveau Profil',
        'edit_item'          => 'Modifier le Profil',
        'new_item'           => 'Nouveau Profil',
        'view_item'          => 'Voir le Profil',
        'search_items'       => 'Rechercher des Profils',
        'not_found'          => 'Aucun profil trouvé',
        'not_found_in_trash' => 'Aucun profil trouvé dans la corbeille',
    );

    $args = array(
        'labels'              => $labels,
        'public'              => true,
        'has_archive'         => true,
        'menu_icon'           => 'dashicons-heart', // Icône en forme de coeur
        'supports'            => array('title', 'editor', 'thumbnail', 'custom-fields'),
        'show_in_rest'        => true, // Permet le support de l'API REST Gutenberg
        'rewrite'             => array('slug' => 'profils'),
    );

    register_post_type('rose_amour_profile', $args);
}
add_action('init', 'rose_amour_register_profile_cpt');

/**
 * 2. ENREGISTREMENT DES ROUTES DE L'API REST WP POUR L'APPLICATION REACT
 * Cela permet à l'application React d'enregistrer et récupérer des données en base réelle.
 */
add_action('rest_api_init', function () {
    // Route 1 : Récupérer tous les profils (GET) ou Créer un nouveau profil (POST)
    register_rest_route('rose-amour/v1', '/profiles', array(
        array(
            'methods'  => WP_REST_Server::READABLE,
            'callback' => 'rose_amour_get_api_profiles',
            'permission_callback' => '__return_true', // Accessible au public (lecture seule du catalogue)
        ),
        array(
            'methods'  => WP_REST_Server::CREATABLE,
            'callback' => 'rose_amour_create_api_profile',
            'permission_callback' => '__return_true', // Permettre la publication directe (sécurisé via validation d'entrée)
        )
    ));
});

/**
 * Callback de l'API REST pour récupérer la liste des profils enregistrés en base MySQL
 */
function rose_amour_get_api_profiles() {
    $args = array(
        'post_type'      => 'rose_amour_profile',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'orderby'        => 'date',
        'order'          => 'DESC'
    );

    $query = new WP_Query($args);
    $profiles = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $id = get_the_ID();
            
            // Reconstruire l'objet de type "Product" attendu par React
            $profiles[] = array(
                'id'             => 'wp_' . $id,
                'title'          => get_the_title(),
                'description'    => get_the_content(),
                'price'          => (int) get_post_meta($id, '_ra_price', true) ?: 45000,
                'age'            => (int) get_post_meta($id, '_ra_age', true) ?: 22,
                'category'       => get_post_meta($id, '_ra_category', true) ?: 'Escortes Classiques',
                'location'       => get_post_meta($id, '_ra_location', true) ?: 'Yaoundé, Cameroun',
                'imageUrl'       => get_post_meta($id, '_ra_image_url', true) ?: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
                'sellerName'     => get_post_meta($id, '_ra_seller_name', true) ?: 'Anonyme',
                'sellerWhatsapp' => get_post_meta($id, '_ra_seller_whatsapp', true) ?: '+237659228516',
                'statusText'     => get_post_meta($id, '_ra_status_text', true) ?: 'Disponible dès maintenant',
                'isBoosted'      => get_post_meta($id, '_ra_is_boosted', true) === '1',
                'createdAt'      => get_the_date('c'),
                'status'         => 'active'
            );
        }
        wp_reset_postdata();
    }

    return $profiles;
}

/**
 * Callback de l'API REST pour ajouter un profil reçu via formulaire React à la base de données
 */
function rose_amour_create_api_profile($request) {
    $params = $request->get_json_params();

    // Protection et assainissement des entrées réelles
    $title       = sanitize_text_field($params['title']);
    $description = sanitize_textarea_field($params['description']);
    $price       = intval($params['price']);
    $age         = intval($params['age']);
    $category    = sanitize_text_field($params['category']);
    $location    = sanitize_text_field($params['location']);
    $imageUrl    = esc_url_raw($params['imageUrl']);
    $sellerName  = sanitize_text_field($params['sellerName']);
    $whatsapp    = sanitize_text_field($params['sellerWhatsapp']);
    $statusText  = sanitize_text_field($params['statusText']);
    $isBoosted   = !empty($params['isBoosted']) ? '1' : '0';

    if (empty($title) || empty($imageUrl)) {
        return new WP_Error('missing_fields', 'Veuillez renseigner un titre et une photo.', array('status' => 400));
    }

    // Insérer un nouvel article réel dans wp_posts
    $post_data = array(
        'post_title'   => $title,
        'post_content' => $description,
        'post_status'  => 'publish',
        'post_type'    => 'rose_amour_profile',
    );

    $post_id = wp_insert_post($post_data);

    if (is_wp_error($post_id)) {
        return new WP_Error('database_error', 'Impossible de sauvegarder en base de données.', array('status' => 500));
    }

    // Associer les métadonnées (Custom Postmeta réels de WordPress)
    update_post_meta($post_id, '_ra_price', $price);
    update_post_meta($post_id, '_ra_age', $age);
    update_post_meta($post_id, '_ra_category', $category);
    update_post_meta($post_id, '_ra_location', $location);
    update_post_meta($post_id, '_ra_image_url', $imageUrl);
    update_post_meta($post_id, '_ra_seller_name', $sellerName);
    update_post_meta($post_id, '_ra_seller_whatsapp', $whatsapp);
    update_post_meta($post_id, '_ra_status_text', $statusText);
    update_post_meta($post_id, '_ra_is_boosted', $isBoosted);

    return array(
        'success' => true,
        'message' => 'Fiche enregistrée en base de données avec succès !',
        'post_id' => $post_id
    );
}

/**
 * 3. EXÉCUTION DU SHORTCODE [rose_amour_catalog]
 * Génère le conteneur principal du site React
 */
function rose_amour_display_catalog_shortcode() {
    ob_start();
    ?>
    <!-- Conteneur d'ancrage principal pour l'application React Rose Amour -->
    <div id="rose-amour-wp-app" class="rose-amour-bootstrap-scope">
        <div id="root">
            <p style="text-align: center; padding: 50px; font-family: sans-serif; font-weight: bold; color: #db2777;">
                Chargement sécurisé du catalogue de Rose Amour Cameroun en cours...
            </p>
        </div>
    </div>

    <style>
        /* S'assurer que le catalogue hérite des meilleurs styles de base sans casser le thème parent de WP */
        .rose-amour-bootstrap-scope {
            all: unset;
            display: block;
            background-color: #f8fafc !important;
            min-height: 100vh;
            color: #0f172a;
        }
    </style>
    <?php
    return ob_get_clean();
}
add_shortcode('rose_amour_catalog', 'rose_amour_display_catalog_shortcode');

/**
 * 4. INJECTION DYNAMIQUE DES SCRIPTS ET FEUILLES DE STYLES COMPILÉS PAR VITE
 */
function rose_amour_enqueue_react_assets() {
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'rose_amour_catalog')) {
        
        $plugin_path = plugin_dir_path(__FILE__);
        $plugin_url  = plugin_dir_url(__FILE__);

        // Détection dynamique des fichiers générés par Vite dans dist/assets/
        $css_files = glob($plugin_path . 'dist/assets/*.css');
        $js_files  = glob($plugin_path . 'dist/assets/*.js');

        $css_url = '';
        $js_url  = '';

        if (!empty($css_files)) {
            $css_filename = basename($css_files[0]);
            $css_url = $plugin_url . 'dist/assets/' . $css_filename;
        }

        if (!empty($js_files)) {
            $js_filename = basename($js_files[0]);
            $js_url = $plugin_url . 'dist/assets/' . $js_filename;
        }

        // Utiliser des fallbacks si aucun fichier dynamique n'est trouvé
        if (empty($css_url)) {
            $css_url = $plugin_url . 'dist/assets/index.css';
        }
        if (empty($js_url)) {
            $js_url = $plugin_url . 'dist/assets/index.js';
        }

        // Déterminer les versions basées sur la date de modification réelle des fichiers et la version 1.2.2 pour briser le cache local
        $plugin_version = '1.2.2';
        $css_ver = (!empty($css_files) && file_exists($css_files[0])) ? filemtime($css_files[0]) . '-' . $plugin_version : time();
        $js_ver  = (!empty($js_files) && file_exists($js_files[0])) ? filemtime($js_files[0]) . '-' . $plugin_version : time();

        // Injection du CSS compilé
        wp_enqueue_style(
            'rose-amour-react-styles',
            $css_url,
            array(),
            $css_ver
        );

        // Injection du Script principal JS (au pied de page pour un chargement rapide)
        wp_enqueue_script(
            'rose-amour-react-scripts',
            $js_url,
            array(),
            $js_ver,
            true
        );

        // Transmettre les réglages de l'API WordPress (Nonce, Root URL) directement à React pour la synchro directe !
        wp_localize_script('rose-amour-react-scripts', 'wpApiSettings', array(
            'root'  => esc_url_raw(rest_url()),
            'nonce' => wp_create_nonce('wp_rest')
        ));
    }
}
add_action('wp_enqueue_scripts', 'rose_amour_enqueue_react_assets');

/**
 * 5. AJOUT DE TYPE="MODULE" SUR LE SCRIPT REACT ENQUEUÉ
 * Essentiel pour que les builds de type ES Module (Vite) fonctionnent sans erreur de syntaxe JS dans WordPress.
 */
function rose_amour_add_module_to_react_script($tag, $handle, $src) {
    if ('rose-amour-react-scripts' !== $handle) {
        return $tag;
    }
    // Formater la balise avec type="module" pour interpréter les instructions import/export ES6
    $tag = '<script type="module" src="' . esc_url($src) . '" id="rose-amour-react-scripts-js"></script>';
    return $tag;
}
add_filter('script_loader_tag', 'rose_amour_add_module_to_react_script', 10, 3);
