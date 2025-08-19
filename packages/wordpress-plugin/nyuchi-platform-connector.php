<?php
/**
 * Plugin Name: Nyuchi Platform Connector
 * Plugin URI: https://github.com/nyuchitech/nyuchi-platform
 * Description: Connect your WordPress site to Nyuchi Platform for centralized SEO management.
 * Version: 1.0.0
 * Author: Nyuchi Web Services
 * Author URI: https://nyuchi.com
 * Developer: Bryan Fawcett (@bryanfawcett)
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: nyuchi-platform-connector
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 * 
 * @package NyuchiPlatformConnector
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('NYUCHI_PLATFORM_VERSION', '1.0.0');
define('NYUCHI_PLATFORM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('NYUCHI_PLATFORM_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class NyuchiPlatformConnector {
    
    private $api_endpoint = 'https://api.nyuchi.com/v1';
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        
        // Load required files
        $this->load_dependencies();
        
        // Initialize API client if configured
        if ($this->is_configured()) {
            $this->init_api_client();
        }
    }
    
    public function init() {
        // Load plugin textdomain
        load_plugin_textdomain('nyuchi-platform-connector', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    private function load_dependencies() {
        require_once NYUCHI_PLATFORM_PLUGIN_DIR . 'includes/class-api-client.php';
        require_once NYUCHI_PLATFORM_PLUGIN_DIR . 'includes/class-auth.php';
        require_once NYUCHI_PLATFORM_PLUGIN_DIR . 'includes/class-sync.php';
        require_once NYUCHI_PLATFORM_PLUGIN_DIR . 'includes/class-admin.php';
    }
    
    private function is_configured() {
        return !empty(get_option('nyuchi_api_key'));
    }
    
    private function init_api_client() {
        new Nyuchi_API_Client($this->api_endpoint);
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Nyuchi Platform', 'nyuchi-platform-connector'),
            __('Nyuchi', 'nyuchi-platform-connector'),
            'manage_options',
            'nyuchi-platform',
            array($this, 'admin_page'),
            'dashicons-cloud',
            30
        );
    }
    
    public function admin_init() {
        register_setting('nyuchi_settings', 'nyuchi_api_key');
        register_setting('nyuchi_settings', 'nyuchi_auto_sync');
    }
    
    public function admin_page() {
        include NYUCHI_PLATFORM_PLUGIN_DIR . 'admin/views/settings.php';
    }
}

// Initialize the plugin
new NyuchiPlatformConnector();
