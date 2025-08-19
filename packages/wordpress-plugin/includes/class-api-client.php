<?php
/**
 * API Client for Nyuchi Platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class Nyuchi_API_Client {
    
    private $api_endpoint;
    private $api_key;
    
    public function __construct($api_endpoint) {
        $this->api_endpoint = $api_endpoint;
        $this->api_key = get_option('nyuchi_api_key');
    }
    
    /**
     * Make API request to Nyuchi Platform
     */
    public function make_request($endpoint, $method = 'GET', $data = null) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'API key not configured');
        }
        
        $url = trailingslashit($this->api_endpoint) . ltrim($endpoint, '/');
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json',
                'X-WordPress-Site' => home_url(),
            ),
            'timeout' => 30,
        );
        
        if ($data && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = wp_json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = wp_remote_retrieve_body($response);
        $code = wp_remote_retrieve_response_code($response);
        
        if ($code >= 400) {
            return new WP_Error('api_error', 'API request failed with code: ' . $code);
        }
        
        return json_decode($body, true);
    }
    
    /**
     * Sync site data with platform
     */
    public function sync_site_data() {
        $site_data = array(
            'domain' => parse_url(home_url(), PHP_URL_HOST),
            'site_name' => get_bloginfo('name'),
            'wordpress_version' => get_bloginfo('version'),
            'plugin_version' => NYUCHI_PLATFORM_VERSION,
            'active_plugins' => get_option('active_plugins'),
            'theme' => get_template(),
        );
        
        return $this->make_request('sites/sync', 'POST', $site_data);
    }
}
