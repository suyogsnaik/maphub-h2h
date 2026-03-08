# Server Code
   
   This directory contains the Node.js server implementation:
   
   - `index.js` - Main server application
   - `mapper-engine.js` - CSV transformation engine
   - `file-processor.js` - Mapname extraction and file routing
   - `config-manager.js` - Configuration management with caching
```

4. **Scroll down and commit:**
```
   Commit message: Create server directory
```

5. **Click "Commit new file"** (green button)

#### Create `docs/` folder:

1. **Click "Add file"** → **"Create new file"**

2. **Type:**
```
   docs/README.md

# Examples
   
   Example files for testing:
   
   - Sample mapping configurations
   - Sample input CSV files
   - Sample output CSV files
```

4. **Commit:**
```
   Commit message: Create examples directory
```

5. **Click "Commit new file"**

✅ **Folder structure created!**

---

### Step 3: Upload Files to Root Directory

Now let's upload the main files to the root of the repository.

1. **Navigate back to root** (click "maphub-h2h-server" at the top breadcrumb)

2. **Click "Add file"** → **"Upload files"**

3. **Drag and drop these files from your Downloads folder:**
```
   ✓ package.json
   ✓ .env.example
   ✓ a2a-mapper.html
```

4. **Scroll down to commit:**
```
   Commit message: Add core project files (package.json, .env.example, web interface)
   
   Extended description (optional):
   - package.json: Node.js dependencies
   - .env.example: Configuration template
   - a2a-mapper.html: Web interface for designing mappings
```

5. **Click "Commit changes"** (green button)

✅ **Root files uploaded!**

---

### Step 4: Upload Server Files

1. **Click on `server/` folder** (to enter it)

2. **Click "Add file"** → **"Upload files"**

3. **Drag and drop these files:**
```
   ✓ server-index.js
   ✓ mapper-engine.js
   ✓ file-processor.js
   ✓ config-manager.js
```

4. **Scroll down to commit:**
```
   Commit message: Add server implementation files
   
   Extended description:
   - server-index.js: Main server with file watcher and API
   - mapper-engine.js: CSV transformation engine with addressParser
   - file-processor.js: Mapname extraction and routing logic
   - config-manager.js: Configuration loading and caching
```

5. **Click "Commit changes"**

6. **Rename files for proper structure:**
   
   For each file:
   - Click on the file (e.g., `server-index.js`)
   - Click the **pencil icon** (Edit file)
   - Change filename in the box to just `index.js` (remove "server-" prefix)
   - Scroll down and commit: `Rename server-index.js to index.js`
   - Repeat for:
     - `mapper-engine.js` → Keep as is (no rename needed)
     - `file-processor.js` → Keep as is
     - `config-manager.js` → Keep as is

✅ **Server files uploaded!**

---

### Step 5: Upload Documentation Files

1. **Navigate back to root** (click "maphub-h2h-server" at top)

2. **Click on `docs/` folder**

3. **Click "Add file"** → **"Upload files"**

4. **Drag and drop these files:**
```
   ✓ H2H-Deployment-Guide.md
   ✓ H2H-README.md
   ✓ MapName-Routing-Guide.md
   ✓ Address-Parser-Troubleshooting.md
```

   *Plus any other documentation files you have:*
```
   ✓ Banking-Fields-Guide.md
   ✓ Quick-Start-Guide.md
   ✓ Enhanced-Mapping-Guide.md
   ✓ Address-Parser-Guide.md
```

5. **Commit:**
```
   Commit message: Add comprehensive documentation
   
   Extended description:
   - Complete deployment guide for H2H server
   - MapName-based routing documentation
   - Address parser troubleshooting guide
   - Banking fields reference


   
