# MapHUB MapName-Based Routing Guide

## Overview

This guide explains the **mapname-based routing** implementation where each input CSV file's mapping is determined by the mapname embedded in the filename, which corresponds to a JSON configuration file.

This is the **recommended approach** for H2H file processing as it provides:
- ✅ Clear, explicit mapping selection
- ✅ Scalability (unlimited customers/formats)
- ✅ Easy management (one file = one mapping)
- ✅ Self-documenting filenames
- ✅ No database dependency

---

## How It Works

### Concept

```
Customer sends file with mapname in filename:
  UK_PAYMENTS_20260308.csv
  
Server extracts mapname:
  UK_PAYMENTS
  
Server loads corresponding mapping:
  /configs/UK_PAYMENTS.json
  
Server processes file using that mapping
```

---

## Filename Conventions

### Option 1: Mapname Prefix (Recommended)

**Format:** `{MAPNAME}_{data}_{date}.csv`

**Examples:**
```
UK_PAYMENTS_20260308.csv        → UK_PAYMENTS.json
US_TRANSFERS_20260308_143022.csv → US_TRANSFERS.json
EU_PAYROLL_data_20260308.csv    → EU_PAYROLL.json
SEPA_INSTANT_file_001.csv       → SEPA_INSTANT.json
```

**Benefits:**
- Mapname is immediately visible
- Easy to identify at a glance
- Simple extraction logic

### Option 2: Customer + Mapname

**Format:** `{CUSTOMER}_{MAPNAME}_{date}.csv`

**Examples:**
```
CUST001_UK_PAYMENTS_20260308.csv    → UK_PAYMENTS.json
ACME_SEPA_TRANSFERS_20260308.csv    → SEPA_TRANSFERS.json
XYZ_LTD_PAYROLL_20260308.csv        → PAYROLL.json
```

**Benefits:**
- Customer identification preserved
- Audit trail clear
- Multiple customers can use same mapping

### Option 3: Mapname in Middle

**Format:** `{data}_{MAPNAME}_{date}.csv`

**Examples:**
```
payments_UK_PAYMENTS_20260308.csv   → UK_PAYMENTS.json
transfers_SEPA_INSTANT_20260308.csv → SEPA_INSTANT.json
```

**Benefits:**
- Descriptive prefix
- Mapname still clear

---

## Mapname Naming Conventions

### Best Practices

**✓ Good Mapnames:**
```
UK_PAYMENTS              # Clear, descriptive
US_ACH_TRANSFERS         # Specific to format
SEPA_INSTANT_PAYMENTS    # ISO format included
PAYROLL_MONTHLY          # Frequency indicated
VENDOR_PAYMENTS_URGENT   # Priority indicated
```

**✗ Bad Mapnames:**
```
map1                # Not descriptive
customer_file       # Too generic
test                # Not production-appropriate
FINAL_v2            # Version in name (use config version instead)
```

### Naming Guidelines

1. **Use UPPERCASE with underscores**
   - `UK_PAYMENTS` not `uk-payments` or `UkPayments`

2. **Be specific and descriptive**
   - Include country, format, or payment type
   - Example: `UK_FASTER_PAYMENTS` vs just `PAYMENTS`

3. **Keep it concise but clear**
   - 2-4 words maximum
   - `SEPA_CREDIT_TRANSFER` not `SEPA_CREDIT_TRANSFER_ISO20022_PAIN001`

4. **Group related mappings**
   ```
   UK_PAYMENTS_DOMESTIC
   UK_PAYMENTS_INTERNATIONAL
   UK_PAYMENTS_URGENT
   ```

5. **Avoid dates and versions**
   - Use version field in JSON instead
   - `UK_PAYMENTS` not `UK_PAYMENTS_2024`

---

## Configuration Files

### Directory Structure

```
/opt/maphub-server/configs/
├── UK_PAYMENTS.json
├── US_ACH_TRANSFERS.json
├── SEPA_INSTANT.json
├── PAYROLL_MONTHLY.json
├── VENDOR_PAYMENTS.json
├── CUSTOMER_REFUNDS.json
└── DEFAULT.json              # Fallback mapping
```

### Mapping File Format

Each `.json` file contains a complete MapHUB mapping configuration:

```json
{
  "mappingName": "UK Faster Payments",
  "description": "UK domestic faster payments processing",
  "version": "1.2",
  "createdAt": "2026-03-08T10:00:00Z",
  
  "sourceConfig": {
    "fileStructure": "option3",
    "delimiter": ",",
    "quoteChar": "\""
  },
  
  "targetConfig": {
    "delimiter": ",",
    "quoteChar": "\"",
    "schema": {
      "columns": [
        {"name": "creditorName", "type": "string"},
        {"name": "creditorAccountNumber", "type": "string"},
        {"name": "creditorSortCode", "type": "string"},
        {"name": "instructedAmount", "type": "number"},
        {"name": "instructedCurrency", "type": "string"},
        {"name": "remittanceUnstructured", "type": "string"}
      ]
    }
  },
  
  "fieldMappings": [
    {
      "targetField": "creditorName",
      "sourceField": "BeneficiaryName",
      "transformation": null
    },
    {
      "targetField": "creditorAccountNumber",
      "sourceField": "AccountNumber",
      "transformation": null
    },
    {
      "targetField": "creditorSortCode",
      "sourceField": "SortCode",
      "transformation": null
    },
    {
      "targetField": "instructedAmount",
      "sourceField": "Amount",
      "transformation": {
        "functionName": "round",
        "functionCode": "function round(input, decimals = 2) { return parseFloat(input).toFixed(decimals); }"
      }
    },
    {
      "targetField": "instructedCurrency",
      "constantValue": "GBP"
    },
    {
      "targetField": "remittanceUnstructured",
      "sourceField": "Reference",
      "transformation": {
        "functionName": "uppercase",
        "functionCode": "function uppercase(input) { return String(input).toUpperCase(); }"
      }
    }
  ]
}
```

---

## Customer Onboarding Process

### Step 1: Design Mapping

Use MapHUB web interface to create and test mapping:

1. Customer provides sample input CSV
2. Open MapHUB in browser
3. Load sample CSV
4. Add target fields
5. Create mappings
6. Test transformations (addressParser, etc.)
7. Verify output

### Step 2: Export Mapping

```
MapHUB Interface:
  Click: 💾 Save Mapping
  
  Mapping Name: UK Faster Payments
  Description: UK domestic faster payments processing
  Version: 1.0
  
  Downloads: UK_FASTER_PAYMENTS_v1_0.json
```

### Step 3: Deploy to Server

```bash
# Rename file (remove version from filename)
mv UK_FASTER_PAYMENTS_v1_0.json UK_PAYMENTS.json

# Copy to server configs directory
scp UK_PAYMENTS.json server:/opt/maphub-server/configs/

# Verify
ssh server "ls -l /opt/maphub-server/configs/UK_PAYMENTS.json"
```

### Step 4: Test

```bash
# Create test file with mapname
echo "UK_PAYMENTS_test_20260308.csv" > test.csv
# ... add test data ...

# Copy to input directory
scp test.csv server:/opt/maphub-server/input/

# Check logs
ssh server "tail -f /opt/maphub-server/logs/processing.log"

# Expected output:
# [info] Processing started { file: 'UK_PAYMENTS_test_20260308.csv' }
# [info] Mapname extracted { mapName: 'UK_PAYMENTS' }
# [info] Mapping loaded { mapName: 'UK_PAYMENTS', version: '1.0' }
# [info] Processing completed { outputFile: '...' }
```

### Step 5: Communicate to Customer

**Email Template:**

```
Subject: MapHUB Configuration Complete - UK_PAYMENTS

Dear Customer,

Your payment file mapping is now configured and ready.

Mapname: UK_PAYMENTS

Filename Format:
Please send files with this format:
  UK_PAYMENTS_{your_ref}_{date}.csv

Examples:
  ✓ UK_PAYMENTS_daily_20260308.csv
  ✓ UK_PAYMENTS_batch001_20260308.csv
  ✓ UK_PAYMENTS_20260308_143000.csv

Delivery Method:
- SFTP: upload to /inbound/
- Email: send to files@bank.com
- API: POST to https://api.bank.com/upload

Processing:
Files are processed automatically within 5 minutes of receipt.
Processed files will be available in your outbound directory.

Support:
For questions, contact: h2h-support@bank.com

Best regards,
Bank Operations Team
```

---

## File Processing Flow

### Complete Flow Diagram

```
1. Customer sends file
   UK_PAYMENTS_20260308.csv
   ↓
2. File arrives on server
   /opt/maphub-server/input/UK_PAYMENTS_20260308.csv
   ↓
3. File watcher detects new file
   ↓
4. FileProcessor.extractMapName()
   Filename: UK_PAYMENTS_20260308.csv
   Extracted: UK_PAYMENTS
   ↓
5. ConfigManager.getConfig()
   Loads: /configs/UK_PAYMENTS.json
   ↓
6. MapperEngine.processFile()
   - Parses CSV
   - Applies mappings
   - Executes transformations
   - Generates output
   ↓
7. Output written
   /output/UK_PAYMENTS_20260308_processed.csv
   ↓
8. Original archived
   /archive/UK_PAYMENTS/2026-03-08/UK_PAYMENTS_20260308.csv
   ↓
9. Log entry created
   [info] Processing completed
```

### Error Handling

```
If mapname extraction fails:
  ↓
Use DEFAULT.json mapping
  ↓
Log warning: "Could not extract mapname"

If mapping file not found:
  ↓
Move file to /error/
  ↓
Create error log with details
  ↓
Send alert email

If processing fails:
  ↓
Retry 3 times with backoff
  ↓
If still fails, move to /error/
  ↓
Log detailed error
```

---

## Management & Operations

### List Available Mappings

```bash
# Via API
curl http://localhost:3000/api/mappings

# Response:
{
  "mappings": [
    {
      "mapName": "UK_PAYMENTS",
      "displayName": "UK Faster Payments",
      "version": "1.2",
      "fieldCount": 15,
      "lastLoaded": "2026-03-08T10:00:00Z"
    },
    {
      "mapName": "SEPA_INSTANT",
      "displayName": "SEPA Instant Payments",
      "version": "2.0",
      "fieldCount": 20,
      "lastLoaded": "2026-03-08T10:00:00Z"
    }
  ]
}
```

### Reload Mapping (After Update)

```bash
# Via API
curl -X POST http://localhost:3000/api/mappings/UK_PAYMENTS/reload

# Via server command
ssh server "cd /opt/maphub-server && node -e \"
const ConfigManager = require('./server/config-manager');
const cm = new ConfigManager('./configs', console);
cm.reloadConfig('UK_PAYMENTS').then(() => console.log('Reloaded'));
\""
```

### Update Mapping

```bash
# 1. Export new version from MapHUB
# Downloads: UK_PAYMENTS_v1_1.json

# 2. Rename
mv UK_PAYMENTS_v1_1.json UK_PAYMENTS.json

# 3. Backup old version
ssh server "cp /opt/maphub-server/configs/UK_PAYMENTS.json \
  /opt/maphub-server/configs/backups/UK_PAYMENTS_v1.0_$(date +%Y%m%d).json"

# 4. Deploy new version
scp UK_PAYMENTS.json server:/opt/maphub-server/configs/

# 5. Reload (cache invalidation)
curl -X POST http://localhost:3000/api/mappings/UK_PAYMENTS/reload

# 6. Test
cp test.csv /opt/maphub-server/input/UK_PAYMENTS_test.csv
```

---

## Scaling to Many Customers

### Scenario: 100+ Customers

**Directory Structure:**
```
/opt/maphub-server/configs/
├── UK_PAYMENTS.json              # Used by 20 customers
├── US_ACH.json                   # Used by 30 customers
├── SEPA_INSTANT.json             # Used by 25 customers
├── CUSTOM_ACME_CORP.json         # Acme Corp specific
├── CUSTOM_XYZ_LTD.json           # XYZ Ltd specific
├── PAYROLL_STANDARD.json         # Standard payroll
├── VENDOR_PAYMENTS.json          # Vendor payments
└── ... 50+ more mappings
```

**Benefits:**
- One mapping can serve multiple customers
- Custom mappings for special cases
- Easy to maintain (update one file, affects all users)
- Self-service capable (customers quote mapname)

### Customer Database (Optional)

Track which customers use which mappings:

```sql
CREATE TABLE customer_maps (
    customer_id VARCHAR(50),
    customer_name VARCHAR(200),
    mapname VARCHAR(100),
    active BOOLEAN,
    created_at TIMESTAMP
);

INSERT INTO customer_maps VALUES
('CUST001', 'Acme Corporation', 'UK_PAYMENTS', TRUE, NOW()),
('CUST002', 'XYZ Limited', 'US_ACH', TRUE, NOW()),
('CUST003', 'Global Inc', 'SEPA_INSTANT', TRUE, NOW());
```

**Query for reporting:**
```sql
-- Which customers use each mapping?
SELECT mapname, COUNT(*) as customer_count 
FROM customer_maps 
WHERE active = TRUE 
GROUP BY mapname;

-- Which mappings does customer use?
SELECT mapname 
FROM customer_maps 
WHERE customer_id = 'CUST001' AND active = TRUE;
```

---

## Troubleshooting

### Issue 1: File not processing

**Check mapname extraction:**
```bash
# Test mapname extraction
node -e "
const fp = require('./server/file-processor');
console.log(fp.extractMapName('UK_PAYMENTS_20260308.csv'));
// Should output: UK_PAYMENTS
"
```

**Check mapping file exists:**
```bash
ls -l /opt/maphub-server/configs/UK_PAYMENTS.json
```

### Issue 2: Wrong mapping used

**Check logs:**
```bash
tail -f /opt/maphub-server/logs/processing.log | grep "Mapname extracted"

# Should show:
# [info] Mapname extracted { filename: '...', mapName: 'UK_PAYMENTS' }
```

**Verify filename format:**
```
✓ UK_PAYMENTS_20260308.csv        → Extracts: UK_PAYMENTS
✗ ukpayments_20260308.csv         → Extracts: ukpayments (wrong case!)
✗ payments_uk_20260308.csv        → Extracts: payments (wrong!)
```

### Issue 3: Mapping not found

**Check configs directory:**
```bash
ls -la /opt/maphub-server/configs/

# Should list:
# UK_PAYMENTS.json
# US_ACH.json
# etc.
```

**Check case sensitivity:**
```bash
# Linux is case-sensitive!
# These are DIFFERENT files:
UK_PAYMENTS.json
uk_payments.json
Uk_Payments.json
```

---

## Best Practices

### 1. Naming Consistency

**Standardize across organization:**
```
{COUNTRY}_{PAYMENT_TYPE}
Examples:
- UK_PAYMENTS
- US_ACH
- EU_SEPA
- SG_FAST
```

### 2. Version Control

**Keep mapping versions:**
```
/opt/maphub-server/configs/
├── UK_PAYMENTS.json                    # Current (v1.2)
└── backups/
    ├── UK_PAYMENTS_v1.0_20260101.json
    ├── UK_PAYMENTS_v1.1_20260201.json
    └── UK_PAYMENTS_v1.2_20260308.json
```

### 3. Documentation

**Maintain mapping registry:**
```
# mappings-registry.md

| Mapname | Description | Version | Customers | Updated |
|---------|-------------|---------|-----------|---------|
| UK_PAYMENTS | UK Faster Payments | 1.2 | 20 | 2026-03-08 |
| US_ACH | US ACH Transfers | 2.0 | 30 | 2026-03-07 |
| SEPA_INSTANT | SEPA Instant Payments | 1.5 | 25 | 2026-03-05 |
```

### 4. Testing

**Test before deployment:**
```bash
# 1. Create test file
echo "UK_PAYMENTS_test.csv" > test.csv

# 2. Copy to test environment
scp test.csv test-server:/opt/maphub-server/input/

# 3. Verify output
ssh test-server "cat /opt/maphub-server/output/UK_PAYMENTS_test_processed*.csv"

# 4. If OK, deploy to production
scp UK_PAYMENTS.json prod-server:/opt/maphub-server/configs/
```

### 5. Monitoring

**Track mapping usage:**
```bash
# Daily report
grep "Mapname extracted" /opt/maphub-server/logs/processing.log | \
  awk '{print $NF}' | \
  sort | uniq -c

# Output:
#  245 UK_PAYMENTS
#  189 US_ACH
#   67 SEPA_INSTANT
#   12 CUSTOM_ACME
```

---

## API Endpoints (Optional)

Add these to server/index.js for mapping management:

```javascript
// List all mappings
app.get('/api/mappings', async (req, res) => {
    const mappings = await configManager.listMappings();
    res.json({ mappings });
});

// Get specific mapping details
app.get('/api/mappings/:mapname', async (req, res) => {
    const config = await configManager.getConfigByMapName(req.params.mapname);
    res.json(config);
});

// Reload mapping (cache invalidation)
app.post('/api/mappings/:mapname/reload', async (req, res) => {
    await configManager.reloadConfig(req.params.mapname);
    res.json({ success: true, message: 'Mapping reloaded' });
});

// Upload new mapping
app.post('/api/mappings/:mapname', async (req, res) => {
    await configManager.saveConfig(req.params.mapname, req.body);
    res.json({ success: true, message: 'Mapping saved' });
});
```

---

## Summary

**MapName-Based Routing provides:**

✅ **Simplicity** - Mapname in filename, mapping in file
✅ **Scalability** - Unlimited mappings, unlimited customers
✅ **Flexibility** - One mapping → many customers, or custom mappings
✅ **Auditability** - Clear which mapping processed each file
✅ **Maintainability** - Update mapping file, reload, done
✅ **Self-Service** - Customers quote mapname, no configuration needed
✅ **No Database** - File-based, simple deployment

**This is the recommended approach for H2H file processing!** 🎉
