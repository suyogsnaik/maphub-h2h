# maphub-h2h
MapHUB H2H Server - Automated CSV file transformation for banking with mapname-based routing
# MapHUB H2H Server

<p align="center">
  <strong>Automated CSV file transformation for banking Host-to-Host (H2H) file processing</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/badge/license-ISC-blue" alt="License">
  <img src="https://img.shields.io/badge/status-production--ready-success" alt="Status">
</p>

---

## 🎯 Overview

MapHUB H2H Server processes customer CSV files automatically using **mapname-based routing**. Each input file contains a mapname in the filename which determines which mapping configuration to apply.

### Key Features

- ✅ **MapName-Based Routing** - Automatic mapping selection from filename
- ✅ **Address Parser** - ISO20022 address format parsing (2/ and 3/ prefixes)
- ✅ **Multi-Customer Support** - One mapping serves many customers
- ✅ **Real-time Processing** - File watcher for instant processing
- ✅ **Web Interface** - MapHUB web app for designing mappings
- ✅ **Production Ready** - Error handling, logging, monitoring, retry logic
- ✅ **Scalable** - Handle thousands of files per day

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit configuration
```

### 3. Create Directories
```bash
mkdir -p input output configs logs archive error
```

### 4. Start Server
```bash
npm start
```

### 5. Add Mapping Configuration
```bash
# Export from MapHUB web interface (a2a-mapper.html)
# Save as: UK_PAYMENTS.json
cp your-mapping.json ./configs/UK_PAYMENTS.json
```

### 6. Process Files
```bash
# Drop file with mapname in filename
cp customer-file.csv ./input/UK_PAYMENTS_20260308.csv

# Check output
ls -l ./output/
```

---

## 📁 Project Structure
```
maphub-h2h-server/
├── server/
│   ├── index.js              # Main server with file watcher & API
│   ├── mapper-engine.js      # CSV transformation engine
│   ├── file-processor.js     # Mapname extraction & routing
│   └── config-manager.js     # Configuration management
├── docs/                      # Complete documentation
├── examples/                  # Sample files
├── configs/                   # Mapping configurations (add yours here)
├── package.json              # Node.js dependencies
├── .env.example              # Configuration template
└── a2a-mapper.html           # Web interface for designing mappings
```

---

## 📝 Filename Format

The mapname in the filename determines which mapping configuration to use:
```
{MAPNAME}_{reference}_{date}.csv

Examples:
✓ UK_PAYMENTS_batch001_20260308.csv     → Uses configs/UK_PAYMENTS.json
✓ US_ACH_daily_20260308.csv             → Uses configs/US_ACH.json
✓ SEPA_INSTANT_transfer_20260308.csv    → Uses configs/SEPA_INSTANT.json
```

---

## 🔄 Processing Flow
```
Customer File → File Watcher → Extract Mapname → Load Config → Transform → Output
```

1. Customer drops file: `UK_PAYMENTS_20260308.csv`
2. Server extracts mapname: `UK_PAYMENTS`
3. Server loads config: `configs/UK_PAYMENTS.json`
4. MapperEngine processes file using addressParser, transformations, etc.
5. Output generated: `output/UK_PAYMENTS_20260308_processed.csv`
6. Original archived: `archive/UK_PAYMENTS/2026-03-08/UK_PAYMENTS_20260308.csv`

---

## 📚 Documentation

- **[Quick Start](./docs/H2H-README.md)** - Get started in 5 minutes
- **[H2H Deployment Guide](./docs/H2H-Deployment-Guide.md)** - Complete deployment documentation
- **[MapName Routing Guide](./docs/MapName-Routing-Guide.md)** - Filename conventions & routing
- **[Address Parser Troubleshooting](./docs/Address-Parser-Troubleshooting.md)** - Debug address parsing

---

## 🛠️ Requirements

- **Node.js** 18+ 
- **npm** 8+
- **Linux/Unix** server (Ubuntu/RHEL recommended)

---

## 🎨 Web Interface

Open `a2a-mapper.html` in your browser to design and test mappings:

1. Load sample CSV file
2. Add target fields (39 standard banking fields available)
3. Create field mappings
4. Test transformations (addressParser, uppercase, formatDate, etc.)
5. Export mapping as JSON
6. Deploy to server's `configs/` directory

---

## 🔧 Configuration

### Environment Variables (.env)
```env
NODE_ENV=production
PORT=3000
INPUT_DIR=/opt/maphub-server/input
OUTPUT_DIR=/opt/maphub-server/output
CONFIG_DIR=/opt/maphub-server/configs
LOG_DIR=/opt/maphub-server/logs
```

### Mapping Configuration (JSON)

Each mapping is a JSON file in `configs/` directory:
```json
{
  "mappingName": "UK Faster Payments",
  "version": "1.0",
  "sourceConfig": {
    "delimiter": ",",
    "fileStructure": "option3"
  },
  "targetConfig": {
    "delimiter": ",",
    "schema": { "columns": [...] }
  },
  "fieldMappings": [
    {
      "sourceField": "CustomerName",
      "targetField": "creditorName",
      "transformation": null
    },
    {
      "sourceField": "CustomerAddress",
      "targetField": "creditorCountry",
      "transformation": {
        "functionName": "addressParser",
        "functionCode": "function addressParser(input, outputField) { ... }"
      }
    }
  ]
}
```

---

## 🚀 Deployment

### Production Deployment (Linux Server)
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/maphub-h2h-server.git
cd maphub-h2h-server

# 2. Install dependencies
npm install

# 3. Configure
cp .env.example .env
nano .env

# 4. Create systemd service
sudo cp systemd/maphub.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable maphub
sudo systemctl start maphub

# 5. Check status
sudo systemctl status maphub
```

See [H2H Deployment Guide](./docs/H2H-Deployment-Guide.md) for complete instructions.

---

## 📊 API Endpoints
```
GET  /health                    # Health check
GET  /stats                     # Processing statistics
GET  /api/mappings              # List all mappings
POST /process/:customerId       # Trigger manual processing
POST /api/mappings/:mapname/reload  # Reload mapping config
```

---

## 🧪 Example

### Input File: `UK_PAYMENTS_20260308.csv`
```csv
CustomerName,CustomerAddress,Amount,Reference
John Doe,2/Building 5/3/GB/London,1000.50,Payment123
Jane Smith,3/US/Boston,2500.00,Invoice456
```

### Mapping: `configs/UK_PAYMENTS.json`
```json
{
  "fieldMappings": [
    { "sourceField": "CustomerName", "targetField": "creditorName" },
    { "sourceField": "CustomerAddress", "targetField": "creditorCountry", 
      "transformation": { "functionName": "addressParser" } },
    { "sourceField": "CustomerAddress", "targetField": "creditorTownName", 
      "transformation": { "functionName": "addressParser" } },
    { "sourceField": "Amount", "targetField": "instructedAmount" }
  ]
}
```

### Output: `output/UK_PAYMENTS_20260308_processed.csv`
```csv
creditorName,creditorCountry,creditorTownName,instructedAmount
John Doe,GB,London,1000.50
Jane Smith,US,Boston,2500.00
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC License - see LICENSE file for details

---

## 🆘 Support

- **Documentation**: See `docs/` directory
- **Issues**: Open an issue on GitHub
- **Questions**: Check existing issues or documentation

---

## 🎯 Use Cases

- **Banking H2H Processing** - Process customer payment files
- **Payment Gateway Integration** - Transform payment formats
- **CSV Data Migration** - Convert between different CSV schemas
- **Financial Data Processing** - Handle ISO20022 formats

---

**Built with ❤️ for modern banking infrastructure**
```

5. **Scroll down and commit:**
```
   Commit message: Update README with comprehensive project documentation
