# Attachment Manager – Change Log

---

## v0.3  –  Real Upload API + File List Per Tile + SweetAlert  (2026-06-10)

17. **CONFIG expanded** with four new centralized keys:
    - `ENTITY_ID` – `9d4eed72bbae44e5af7ca824a95b4423`
    - `REF_REC_ID` – `45396` (static; TODO: read from `?refRecId=` query string)
    - `UPLOAD_BASE` – `https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/upload`
    - `FILES_BASE`  – `https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/LGE0000001/files`

18. **`buildUploadUrl(att, file)`** helper – constructs the upload URL dynamically:
    `?refRecId=&documentType=&documentVersion=1&title=&entityId=&fileName=`

19. **`buildFilesUrl(att)`** helper – constructs the files-list URL:
    `?doctypeId=&refRecId=&entityId=`

20. **`buildFormHeaders()`** helper – sends `Authorization` + `companyid` without `Content-Type`
    so the browser correctly sets the `multipart/form-data` boundary for `FormData` uploads.

21. **Real upload** replaces dummy endpoint – sends `FormData` with the selected file to the
    real upload API; progress bar still runs during the in-flight request.

22. **`loadTileFiles(att, tileEl)`** – called on initial render AND after every upload:
    - Fetches the files list for the tile's `doctypeId` + `refRecId` + `entityId`.
    - Renders each file as a small chip (filename + size) inside the tile.
    - Marks the tile green / uploaded if ≥ 1 file is returned.

23. **SweetAlert2** (CDN added to `index.html`) – shown after upload success with dark theme
    matching the app palette; error dialog shown on upload failure.

24. **Spinner SVG** added to tiles while files are loading/refreshing.

25. **CSS additions** in `styles.css`:
    - `.tile-files`, `.tile-file-list`, `.tile-file-item`, `.tile-file-name`, `.tile-file-size`
    - `.spin-icon` with `@keyframes spin`
    - `.swal-mawarid` / `.swal-mawarid-btn` dark-theme overrides for SweetAlert2.

---



16. **Tile display name** now reads `att.TypeName` as the **primary** source.
    - Fallback chain: `TypeName → Name → Description → Label → "Attachment N"`
    - Applies to both the tile card and the modal title / subtitle.


---

## v0.1  –  Initial Build  (2026-06-10)

### Files Created
- `index.html`
- `styles.css`
- `app.js`
- `CHANGELOG.md` ← this file

---

### Changes Made

1. **Created project structure** with three files: `index.html`, `styles.css`, `app.js`.

2. **Centralized configuration** in `app.js` → `CONFIG` object at the top of the file:
   - `CONFIG.ENDPOINT`   – full API URL to fetch attachment types
   - `CONFIG.TOKEN`      – Bearer JWT token for `Authorization` header
   - `CONFIG.COMPANY_ID` – value `LGE0000001` sent as `companyid` header
   - `CONFIG.UPLOAD_ENDPOINT` – dummy upload target (JSONPlaceholder)

3. **Added `buildHeaders()` helper** that constructs the shared request headers from `CONFIG`:
   - `Authorization: Bearer <TOKEN>`
   - `companyid: <COMPANY_ID>`
   - `Content-Type: application/json`

4. **API integration** (`loadAttachments`):
   - Calls `CONFIG.ENDPOINT` with `buildHeaders()`.
   - Parses `response.json().Data` (stringified) → extracts `Attachments[]` array.

5. **Live-tile grid** rendered from `Attachments[]`:
   - Each tile shows: document icon, name, code, required/optional badge.
   - Hover effect reveals "Attach" action with animated arrow.
   - Staggered entrance animation (55 ms delay per tile).

6. **Skeleton loading state** shown while API is in flight (6 placeholder cards).

7. **Error state** with message and "Try Again" button; triggers `loadAttachments()`.

8. **Status badge** (header area) reflects: Loading / Ready (N types) / Error.

9. **Upload modal** opens on tile click:
   - Shows attachment name and icon.
   - Drag-and-drop zone + hidden `<input type="file">`.
   - File preview panel (name + size) with remove button.

10. **Simulated upload progress bar** (0 → 90 % animated, then 100 % on success).

11. **Dummy upload API call** via `CONFIG.UPLOAD_ENDPOINT` using `FormData`; sends:
    - `file` – the selected file blob
    - `attachmentId` – from the attachment object
    - `companyId` – from `CONFIG.COMPANY_ID`
    - Headers: `Authorization` + `companyid` (no `Content-Type` to allow browser boundary).

12. **Tile state update** after successful upload: tile turns green with a checkmark icon.

13. **Toast notification** shown on upload success or failure.

14. **Keyboard accessibility**: tiles respond to Enter/Space; Escape closes modal.

15. **Dark-mode glassmorphism design** with ambient background blobs, gradient accents, and smooth micro-animations.

---

## Pending / Next Steps

- [ ] Replace `CONFIG.UPLOAD_ENDPOINT` with the real attachment upload API once provided.
- [ ] Map actual field names from API response (currently using fallbacks: `Name`, `Description`, `Code`, `Type`, `Id`, `IsMandatory`).
- [ ] Add file-type/size validation per attachment type if the API provides constraints.
- [ ] Integrate real success/error handling from the upload API response body.
