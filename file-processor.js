// server/file-processor.js
// File processing with mapname-based routing

const path = require('path');
const fs = require('fs').promises;
const MapperEngine = require('./mapper-engine');

class FileProcessor {
    constructor(configManager, logger) {
        this.configManager = configManager;
        this.logger = logger;
        this.processingQueue = [];
        this.activeJobs = 0;
        this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 10;
        this.stats = {
            filesProcessed: 0,
            filesError: 0,
            totalRecords: 0,
            processingTimes: [],
            startTime: Date.now()
        };
    }
    
    /**
     * Extract mapname from filename
     * 
     * Expected filename formats:
     * 1. mapname_data_YYYYMMDD.csv          → mapname
     * 2. mapname_YYYYMMDD_HHMMSS.csv        → mapname
     * 3. CUSTOMER_mapname_data.csv          → mapname
     * 4. data_mapname_20260308.csv          → mapname
     * 
     * The mapname should be consistent with the JSON config filename
     * e.g., "UK_PAYMENTS" → UK_PAYMENTS.json
     */
    extractMapName(filename) {
        // Remove extension
        const nameWithoutExt = filename.replace(/\.csv$/i, '');
        
        // Strategy 1: mapname is first part before underscore
        // Example: UK_PAYMENTS_20260308.csv → UK_PAYMENTS
        const parts = nameWithoutExt.split('_');
        
        // Check if first part looks like a mapname (not a date/number)
        if (parts.length >= 1 && !/^\d+$/.test(parts[0])) {
            const potentialMapName = parts[0];
            
            // If first part + second part doesn't look like date, combine them
            if (parts.length >= 2 && !/^\d{8}$/.test(parts[1]) && !/^(data|file|input|output)$/i.test(parts[1])) {
                return `${parts[0]}_${parts[1]}`;
            }
            
            return potentialMapName;
        }
        
        // Strategy 2: mapname is in the middle (after customer ID)
        // Example: CUST001_UK_PAYMENTS_20260308.csv → UK_PAYMENTS
        if (parts.length >= 2) {
            for (let i = 1; i < parts.length - 1; i++) {
                if (!/^\d+$/.test(parts[i]) && !/^\d{8}$/.test(parts[i])) {
                    // Found a non-numeric, non-date part - likely the mapname
                    if (parts.length > i + 1 && !/^\d{8}$/.test(parts[i + 1]) && !/^(data|file)$/i.test(parts[i + 1])) {
                        return `${parts[i]}_${parts[i + 1]}`;
                    }
                    return parts[i];
                }
            }
        }
        
        // Strategy 3: Extract from directory structure
        // If file is in a subdirectory named after the mapname
        // Example: /input/UK_PAYMENTS/file.csv → UK_PAYMENTS
        
        // Fallback: use default mapping
        this.logger.warn('Could not extract mapname from filename', { filename });
        return process.env.DEFAULT_MAPPING?.replace('.json', '') || 'DEFAULT';
    }
    
    /**
     * Validate mapname and get mapping config path
     */
    async validateAndGetMapping(mapName) {
        const mappingFileName = `${mapName}.json`;
        const mappingPath = path.join(
            process.env.CONFIG_DIR || './configs',
            mappingFileName
        );
        
        try {
            await fs.access(mappingPath);
            return mappingPath;
        } catch (error) {
            throw new Error(`Mapping configuration not found: ${mappingFileName}`);
        }
    }
    
    /**
     * Process a single file
     */
    async processFile(inputPath) {
        const startTime = Date.now();
        const filename = path.basename(inputPath);
        
        this.logger.info('Processing started', { file: filename, path: inputPath });
        
        try {
            // Extract mapname from filename
            const mapName = this.extractMapName(filename);
            this.logger.info('Mapname extracted', { filename, mapName });
            
            // Validate and get mapping config
            const mappingPath = await this.validateAndGetMapping(mapName);
            const mappingConfig = await this.configManager.getConfig(mappingPath);
            
            this.logger.info('Mapping loaded', { 
                mapName, 
                mappingVersion: mappingConfig.version,
                fieldCount: mappingConfig.fieldMappings?.length || 0
            });
            
            // Determine output path
            const outputDir = process.env.OUTPUT_DIR || './output';
            const outputFilename = this.generateOutputFilename(filename, mapName);
            const outputPath = path.join(outputDir, outputFilename);
            
            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });
            
            // Create mapper engine and process
            const engine = new MapperEngine(mappingConfig, this.logger);
            const result = await engine.processFile(inputPath, outputPath);
            
            const duration = Date.now() - startTime;
            
            // Update stats
            this.stats.filesProcessed++;
            this.stats.totalRecords += result.inputRecords;
            this.stats.processingTimes.push(duration);
            
            // Archive original file
            await this.archiveFile(inputPath, mapName);
            
            this.logger.info('Processing completed', {
                file: filename,
                mapName,
                inputRecords: result.inputRecords,
                outputRecords: result.outputRecords,
                duration: `${duration}ms`,
                outputFile: outputFilename
            });
            
            return {
                success: true,
                inputFile: filename,
                outputFile: outputFilename,
                mapName,
                inputRecords: result.inputRecords,
                outputRecords: result.outputRecords,
                duration
            };
            
        } catch (error) {
            this.stats.filesError++;
            
            this.logger.error('Processing failed', {
                file: filename,
                error: error.message,
                stack: error.stack
            });
            
            // Move to error directory
            await this.moveToError(inputPath, error);
            
            throw error;
        }
    }
    
    /**
     * Generate output filename
     * Preserves original filename with optional prefix
     */
    generateOutputFilename(inputFilename, mapName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const nameWithoutExt = inputFilename.replace(/\.csv$/i, '');
        
        // Option 1: Keep original filename
        // return inputFilename;
        
        // Option 2: Add processed prefix
        // return `processed_${inputFilename}`;
        
        // Option 3: Add timestamp
        return `${nameWithoutExt}_processed_${timestamp}.csv`;
        
        // Option 4: Use mapname prefix
        // return `${mapName}_${inputFilename}`;
    }
    
    /**
     * Archive processed file
     */
    async archiveFile(filePath, mapName) {
        const archiveDir = path.join(
            process.env.ARCHIVE_DIR || './archive',
            mapName,
            new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        );
        
        await fs.mkdir(archiveDir, { recursive: true });
        
        const filename = path.basename(filePath);
        const archivePath = path.join(archiveDir, filename);
        
        await fs.rename(filePath, archivePath);
        
        this.logger.info('File archived', { 
            originalPath: filePath, 
            archivePath 
        });
    }
    
    /**
     * Move failed file to error directory
     */
    async moveToError(filePath, error) {
        const errorDir = path.join(
            process.env.ERROR_DIR || './error',
            new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        );
        
        await fs.mkdir(errorDir, { recursive: true });
        
        const filename = path.basename(filePath);
        const errorPath = path.join(errorDir, filename);
        
        // Create error log file
        const errorLogPath = errorPath.replace('.csv', '_error.txt');
        const errorLog = `
File: ${filename}
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
`;
        
        await fs.writeFile(errorLogPath, errorLog);
        await fs.rename(filePath, errorPath);
        
        this.logger.info('File moved to error directory', { 
            originalPath: filePath, 
            errorPath 
        });
    }
    
    /**
     * Process with retry logic
     */
    async processWithRetry(filePath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.processFile(filePath);
            } catch (error) {
                if (attempt === maxRetries) {
                    this.logger.error('Processing failed after retries', {
                        file: filePath,
                        attempts: maxRetries,
                        error: error.message
                    });
                    throw error;
                }
                
                const backoff = 1000 * Math.pow(2, attempt);
                this.logger.warn('Processing failed, retrying', {
                    file: filePath,
                    attempt,
                    retryIn: `${backoff}ms`
                });
                
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
    }
    
    /**
     * Get processing statistics
     */
    getStats() {
        const avgProcessingTime = this.stats.processingTimes.length > 0
            ? this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length
            : 0;
        
        const uptime = Date.now() - this.stats.startTime;
        const successRate = this.stats.filesProcessed + this.stats.filesError > 0
            ? (this.stats.filesProcessed / (this.stats.filesProcessed + this.stats.filesError) * 100).toFixed(2)
            : 100;
        
        return {
            filesProcessed: this.stats.filesProcessed,
            filesError: this.stats.filesError,
            totalRecords: this.stats.totalRecords,
            avgProcessingTime: `${avgProcessingTime.toFixed(2)}ms`,
            successRate: `${successRate}%`,
            uptime: `${(uptime / 1000 / 60).toFixed(2)} minutes`,
            activeJobs: this.activeJobs,
            queueSize: this.processingQueue.length
        };
    }
    
    /**
     * Wait for all active jobs to complete
     */
    async waitForCompletion(timeout = 30000) {
        const startTime = Date.now();
        
        while (this.activeJobs > 0) {
            if (Date.now() - startTime > timeout) {
                this.logger.warn('Timeout waiting for jobs to complete', {
                    activeJobs: this.activeJobs
                });
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

module.exports = FileProcessor;
