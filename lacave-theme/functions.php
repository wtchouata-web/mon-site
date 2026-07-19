<?php
/**
 * Logique backend du thème La Cave / Rose Amour Catalog
 * Déclare les types de profils, fournit l'API REST MySQL réelle, et injecte le build React.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 1. ENREGISTREMENT DU TYPE DE CONTENU PERSONNALISÉ (CUSTOM POST TYPE)
 * Ce type permet de stocker les profils dans la base de données réelle de WordPress.
 * Ils apparaîtront directement dans le panneau d'administration de WP.
 */
function rose_amour_theme_register_profile_cpt() {
    $labels = array(
        'name'               => 'La Cave - Profils',
        'singular_name'      => 'Profil La Cave',
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
        'menu_icon'           => 'dashicons-heart', // Icône cœur élégante
        'supports'            => array('title', 'editor', 'thumbnail', 'custom-fields'),
        'show_in_rest'        => true, // Supporte Gutenberg
        'rewrite'             => array('slug' => 'profils'),
    );

    register_post_type('rose_amour_profile', $args);
}
add_action('init', 'rose_amour_theme_register_profile_cpt');

/**
 * 2. CONFIGURATION DE L'API REST WP DE LA CAVE
 * Permet au catalogue React de synchroniser et de persister les données réelles.
 */
add_action('rest_api_init', function () {
    // GET /wp-json/rose-amour/v1/profiles
    // POST /wp-json/rose-amour/v1/profiles
    register_rest_route('rose-amour/v1', '/profiles', array(
        array(
            'methods'  => WP_REST_Server::READABLE,
            'callback' => 'rose_amour_theme_get_api_profiles',
            'permission_callback' => '__return_true', // Récupération publique du catalogue
        ),
        array(
            'methods'  => WP_REST_Server::CREATABLE,
            'callback' => 'rose_amour_theme_create_api_profile',
            'permission_callback' => '__return_true', // Publication sécurisée via assainissement
        )
    ));
});

/**
 * API REST Callback : Récupérer tous les profils de la base de données MySQL
 */
function rose_amour_theme_get_api_profiles() {
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
            
            // Reconstitution du format natif de fiche attendu par React
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
 * API REST Callback : Ajouter un profil dans la base MySQL (reçu par formulaire React)
 */
function rose_amour_theme_create_api_profile($request) {
    $params = $request->get_json_params();

    // Assainissement des données réelles reçues
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
        return new WP_Error('missing_fields', 'Veuillez au moins spécifier un titre et une image.', array('status' => 400));
    }

    // Création de l'enregistrement en base
    $post_data = array(
        'post_title'   => $title,
        'post_content' => $description,
        'post_status'  => 'publish',
        'post_type'    => 'rose_amour_profile',
    );

    $post_id = wp_insert_post($post_data);

    if (is_wp_error($post_id)) {
        return new WP_Error('database_error', 'Échec de la sauvegarde en base.', array('status' => 500));
    }

    // Métadonnées personnalisées
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
        'message' => 'Profil enregistré avec succès !',
        'post_id' => $post_id
    );
}

/**
 * 3. INJECTION DIRECTE DU CATALOGUE REACT COMPILÉ
 * Charge les fichiers CSS/JS à chemins fixes générés par Vite dans assets/
 */
function rose_amour_theme_enqueue_assets() {
    $theme_url  = get_template_directory_uri();
    $theme_path = get_template_directory();

    $css_url = $theme_url . '/assets/index.css';
    $js_url  = $theme_url . '/assets/index.js';

    $css_file = $theme_path . '/assets/index.css';
    $js_file  = $theme_path . '/assets/index.js';

    // Cache buster robuste : combine le filemtime du fichier et la version dynamique du style.css (1.2.2)
    $theme_version = wp_get_theme()->get('Version') ?: '1.2.2';
    $css_ver = file_exists($css_file) ? filemtime($css_file) . '-' . $theme_version : time();
    $js_ver  = file_exists($js_file) ? filemtime($js_file) . '-' . $theme_version : time();

    // Charger les styles
    wp_enqueue_style(
        'rose-amour-react-styles',
        $css_url,
        array(),
        $css_ver
    );

    // Charger l'application principale (au pied de page)
    wp_enqueue_script(
        'rose-amour-react-scripts',
        $js_url,
        array(),
        $js_ver,
        true
    );

    // Injection des paramètres de l'API WP dans l'environnement global de React
    wp_localize_script('rose-amour-react-scripts', 'wpApiSettings', array(
        'root'  => esc_url_raw(rest_url()),
        'nonce' => wp_create_nonce('wp_rest')
    ));
}
add_action('wp_enqueue_scripts', 'rose_amour_theme_enqueue_assets');

/**
 * 4. CONFIGURATION SCRIPT TYPE="MODULE"
 * Nécessaire pour faire tourner un build d'application moderne (ES6/Vite) dans WordPress sans erreurs.
 */
function rose_amour_theme_script_as_module($tag, $handle, $src) {
    if ('rose-amour-react-scripts' !== $handle) {
        return $tag;
    }
    $tag = '<script type="module" src="' . esc_url($src) . '" id="rose-amour-react-scripts-js"></script>';
    return $tag;
}
add_filter('script_loader_tag', 'rose_amour_theme_script_as_module', 10, 3);
