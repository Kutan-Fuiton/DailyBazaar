# Scan & Manual Entry Feature Module (`features/scan`)

## Overview
Handles grocery haul ingestion via Gemini multimodal OCR scanning, natural text shopping lists, multi-row bulk entry, quick-add grocery chips, and browser-native voice logging.

## Components

### 1. `ScanPage.tsx`
- **Purpose**: Unified logging hub allowing users to switch between Camera/Receipt OCR, Shopping Lists, and Manual Entry modes.
- **Key Functions**:
  - `handleFileSelect(e)`: Uploads physical receipt images to `/scan/receipt` for multimodal OCR analysis.
  - `handleBulkCommit(rows)`: Transforms rows from `BulkEntryTable` into `ScannedItem` models and populates the confirmation drawer.
  - `handleVoiceCommit(items)`: Formats transcribed voice grocery items into line items for transaction logging.
  - `handleQuickChipAdd(chip)`: Appends rapid grocery chips into the active items list.
  - `handleSaveHaul()`: Commits items to `/transactions` with venue location, payment method, and notes.

### 2. `components/BulkEntryTable.tsx`
- **Purpose**: Spreadsheet-like multi-row manual entry interface for rapid data entry without repeated form clicks.
- **Key Features**:
  - In-place row addition, keyboard tab navigation, dynamic price calculation, unit dropdowns, and batch validation.

### 3. `components/QuickAddChips.tsx`
- **Purpose**: High-frequency grocery presets (e.g. Milk 1L, Eggs 12pk, Onions 1kg) enabling one-tap line item addition.

### 4. `components/VoiceLogger.tsx`
- **Purpose**: Hands-free voice logger utilizing Web Speech API (`webkitSpeechRecognition`).
- **Key Features**:
  - Real-time speech-to-text transcript processing.
  - Regex-based quantity, unit, and price extraction (e.g., "Two kilos potatoes for sixty rupees").

### 5. `components/ShoppingListView.tsx`
- **Purpose**: Natural-language checklist builder with bazaar check-off mode and one-click haul finalization.
