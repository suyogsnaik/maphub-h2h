// server/config-manager.js
// Mapping configuration management with caching

const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
    constructor(configDir, logger) {
        this.configDir = configDir;
        this.logger = logger;
        this.cache = new Map();
        this.ttl = parseInt(process.env.CONFIG_CACHE_TTL) || 3600000; // 1 hour default
    }
    
    /**
     * Load all mapping configurations on startup
     */
    async loadAllConfigs() {
        try {
            const files = await fs.readdir(this.configDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            this.logger.info('Loading mapping configurations', { 
                directory: this.configDir,
                count: jsonFiles.length 
            });
            
            for (const file of jsonFiles) {
                const filePath = path.join(this.configDir, file);
                try {
                    await this.getConfig(filePath);
                } catch (error) {
                    this.logger.error('Failed to load config', { 
                        file, 
                        error: error.message 
                    });
                }
            }
            
            this.logger.info('Configuration loading complete', { 
                loaded: this.cache.size 
            });
            
        } catch (error) {
            this.logger.error('Failed to load configurations', { 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Get mapping configuration with caching
     */
    async getConfig(configPath) {
        const mapName = path.basename(configPath, '.json');
        
        // Check cache
        const cached = this.cache.get(mapName);
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            this.logger.debug('Config loaded from cache', { mapName });
            return cached.config;
        }
        
        // Load from file
        try {
            const content = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(content);
            
            // Validate config
            this.validateConfig(config, mapName);
            
            // Cache it
            this.cache.set(mapName, {
                config,
                timestamp: Date.now(),
                path: configPath
            });
            
            this.logger.info('Config loaded', { 
                mapName,
                version: config.version,
                mappings: config.fieldMappings?.length || 0
            });
            
            return config;
            
        } catch (error) {
            this.logger.error('Failed to load config', { 
                configPath, 
                error: error.message 
            });
            throw new Error(`Invalid mapping configuration: ${mapName} - ${error.message}`);
        }
    }
    
    /**
     * Validate mapping configuration
     */
    validateConfig(config, mapName) {
        // Check required fields
        if (!config.mappingName && !config.version) {
            throw new Error('Missing required fields: mappingName or version');
        }
        
        // Check field mappings
        if (!config.fieldMappings || !Array.isArray(config.fieldMappings)) {
            throw new Error('Invalid or missing fieldMappings array');
        }
        
        if (config.fieldMappings.length === 0) {
            throw new Error('fieldMappings array is empty');
        }
        
        // Validate each mapping
        config.fieldMappings.forEach((mapping, index) => {
            if (!mapping.targetField) {
                throw new Error(`Mapping ${index} missing targetField`);
            }
            
            // Check for dangerous code in transformations
            if (mapping.transformation?.functionCode) {
                const code = mapping.transformation.functionCode;
                
                // Security checks
                const dangerousPatterns = [
                    /eval\s*\(/i,
                    /Function\s*\(\s*['"`].*require/i,
                    /require\s*\(/i,
                    /import\s+/i,
                    /process\./i,
                    /child_process/i,
                    /__dirname/i,
                    /__filename/i,
                    /fs\./i
                ];
                
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(code)) {
                        throw new Error(`Unsafe code detected in transformation for ${mapping.targetField}`);
                    }
                }
            }
        });
        
        // Check target schema if present
        if (config.targetConfig?.schema?.columns) {
            if (!Array.isArray(config.targetConfig.schema.columns)) {
                throw new Error('Invalid targetSchema columns');
            }
        }
        
        this.logger.debug('Config validation passed', { mapName });
    }
    
    /**
     * Reload a specific configuration (cache invalidation)
     */
    async reloadConfig(mapName) {
        const configPath = path.join(this.configDir, `${mapName}.json`);
        this.cache.delete(mapName);
        
        this.logger.info('Reloading config', { mapName });
        return await this.getConfig(configPath);
    }
    
    /**
     * Reload all configurations
     */
    async reloadAll() {
        this.logger.info('Reloading all configurations');
        this.cache.clear();
        await this.loadAllConfigs();
    }
    
    /**
     * List all available mappings
     */
    async listMappings() {
        const files = await fs.readdir(this.configDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        const mappings = [];
        
        for (const file of jsonFiles) {
            const mapName = path.basename(file, '.json');
            const cached = this.cache.get(mapName);
            
            if (cached) {
                mappings.push({
                    mapName,
                    displayName: cached.config.mappingName,
                    version: cached.config.version,
                    description: cached.config.description,
                    fieldCount: cached.config.fieldMappings?.length || 0,
                    lastLoaded: new Date(cached.timestamp).toISOString()
                });
            } else {
                mappings.push({
                    mapName,
                    status: 'not-loaded'
                });
            }
        }
        
        return mappings;
    }
    
    /**
     * Get configuration count
     */
    getConfigCount() {
        return this.cache.size;
    }
    
    /**
     * Get configuration by mapname
     */
    async getConfigByMapName(mapName) {
        const configPath = path.join(this.configDir, `${mapName}.json`);
        return await this.getConfig(configPath);
    }
    
    /**
     * Check if mapping exists
     */
    async mappingExists(mapName) {
        const configPath = path.join(this.configDir, `${mapName}.json`);
        try {
            await fs.access(configPath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Save new mapping configuration
     */
    async saveConfig(mapName, config) {
        // Validate first
        this.validateConfig(config, mapName);
        
        const configPath = path.join(this.configDir, `${mapName}.json`);
        
        // Check if file already exists
        const exists = await this.mappingExists(mapName);
        if (exists) {
            this.logger.warn('Overwriting existing config', { mapName });
        }
        
        // Write to file
        await fs.writeFile(
            configPath, 
            JSON.stringify(config, null, 2),
            'utf8'
        );
        
        // Update cache
        this.cache.set(mapName, {
            config,
            timestamp: Date.now(),
            path: configPath
        });
        
        this.logger.info('Config saved', { mapName, path: configPath });
        
        return configPath;
    }
    
    /**
     * Delete mapping configuration
     */
    async deleteConfig(mapName) {
        const configPath = path.join(this.configDir, `${mapName}.json`);
        
        // Remove from cache
        this.cache.delete(mapName);
        
        // Delete file
        await fs.unlink(configPath);
        
        this.logger.info('Config deleted', { mapName });
    }
}

module.exports = ConfigManager;
