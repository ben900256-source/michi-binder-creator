const STORAGE_KEY = "michiBinderCreator.project.v1";
const CURRENT_PAGE_KEY = "michiBinderCreator.currentPageId.v1";
const TCGDEX_CARDS_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const INDEXED_DB_NAME = "michiBinderCreator";
const INDEXED_DB_STORE = "projects";
const INDEXED_DB_CURRENT_PROJECT_ID = "current";
const SIDEBAR_WIDTH_KEY = "michiBinderCreator.sidebarWidth.v1";
const CARD_ASPECT = 63 / 88;
const BINDER_ZOOM_MIN = 0.05;
const BINDER_ZOOM_MAX = 2;
const SIDEBAR_WIDTH_MIN = 240;
const SIDEBAR_WIDTH_MAX = 560;

const SPAN_PRESETS = {
  "1x1": { colSpan: 1, rowSpan: 1 },
  "1x2": { colSpan: 1, rowSpan: 2 },
  "2x1": { colSpan: 2, rowSpan: 1 },
  "2x2": { colSpan: 2, rowSpan: 2 },
  "3x1": { colSpan: 3, rowSpan: 1 },
  "1x3": { colSpan: 1, rowSpan: 3 },
};

const DEFAULT_CROP = {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
};

// One project object drives the whole app and is serialized directly to localStorage/JSON.
const state = {
  project: loadProject(),
  currentPageId: localStorage.getItem(CURRENT_PAGE_KEY),
  selectedImageId: null,
  selectedCardId: null,
  selectedPlacementId: null,
  setupInitialized: false,
  cardSearchResults: [],
  cardSearchLoading: false,
  cardInsertSearchResults: [],
  cardInsertSearchLoading: false,
  imageImportItems: [],
  imageImportIndex: 0,
  pendingCardSlot: null,
  placementClipboard: null,
  imagePlacementDraft: null,
  pendingImagePlacement: null,
  hoveredSlot: null,
  binderZoom: 1,
  fitToDisplay: true,
  centerBinder: true,
  sidebarWidth: clampInteger(localStorage.getItem(SIDEBAR_WIDTH_KEY), SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX, 320),
  sidebarResizeGesture: null,
  binderPanX: 0,
  binderPanY: 0,
  binderPointers: new Map(),
  binderGesture: null,
  suppressNextBinderClick: false,
  indexedDbSavedAt: null,
  indexedDbSavePending: false,
  indexedDbAutoSaveTimer: null,
};

const els = {
  projectNameInput: document.querySelector("#projectNameInput"),
  projectSetup: document.querySelector("#projectSetup"),
  projectSetupForm: document.querySelector("#projectSetupForm"),
  setupProjectNameInput: document.querySelector("#setupProjectNameInput"),
  setupRowsInput: document.querySelector("#setupRowsInput"),
  setupColsInput: document.querySelector("#setupColsInput"),
  setupAutoSaveInput: document.querySelector("#setupAutoSaveInput"),
  projectBinderSummary: document.querySelector("#projectBinderSummary"),
  localSaveSummary: document.querySelector("#localSaveSummary"),
  imageImportWizard: document.querySelector("#imageImportWizard"),
  imageImportForm: document.querySelector("#imageImportForm"),
  imageImportCount: document.querySelector("#imageImportCount"),
  imageImportPreview: document.querySelector("#imageImportPreview"),
  imageImportNameInput: document.querySelector("#imageImportNameInput"),
  imageImportSaveButton: document.querySelector("#imageImportSaveButton"),
  imageImportSkipButton: document.querySelector("#imageImportSkipButton"),
  imageImportCancelButton: document.querySelector("#imageImportCancelButton"),
  cardSearchForm: document.querySelector("#cardSearchForm"),
  cardSearchInput: document.querySelector("#cardSearchInput"),
  cardSearchButton: document.querySelector("#cardSearchButton"),
  cardSearchStatus: document.querySelector("#cardSearchStatus"),
  cardSearchResults: document.querySelector("#cardSearchResults"),
  cardLibrary: document.querySelector("#cardLibrary"),
  cardInsertPrompt: document.querySelector("#cardInsertPrompt"),
  cardInsertSlotText: document.querySelector("#cardInsertSlotText"),
  cardInsertSearchForm: document.querySelector("#cardInsertSearchForm"),
  cardInsertSearchInput: document.querySelector("#cardInsertSearchInput"),
  cardInsertSearchButton: document.querySelector("#cardInsertSearchButton"),
  cardInsertSearchStatus: document.querySelector("#cardInsertSearchStatus"),
  cardInsertSearchResults: document.querySelector("#cardInsertSearchResults"),
  cardInsertCancelButton: document.querySelector("#cardInsertCancelButton"),
  imagePlacementModal: document.querySelector("#imagePlacementModal"),
  imagePlacementTitle: document.querySelector("#imagePlacementTitle"),
  imagePlacementName: document.querySelector("#imagePlacementName"),
  imagePlacementPreview: document.querySelector("#imagePlacementPreview"),
  placementCropScaleInput: document.querySelector("#placementCropScaleInput"),
  placementCropXInput: document.querySelector("#placementCropXInput"),
  placementCropYInput: document.querySelector("#placementCropYInput"),
  placementCropRotateInput: document.querySelector("#placementCropRotateInput"),
  imagePlacementCancelButton: document.querySelector("#imagePlacementCancelButton"),
  imagePlacementStartButton: document.querySelector("#imagePlacementStartButton"),
  projectMenuButton: document.querySelector("#projectMenuButton"),
  projectMenuModal: document.querySelector("#projectMenuModal"),
  projectMenuCloseButton: document.querySelector("#projectMenuCloseButton"),
  menuAutoSaveInput: document.querySelector("#menuAutoSaveInput"),
  newProjectButton: document.querySelector("#newProjectButton"),
  newPageButton: document.querySelector("#newPageButton"),
  deleteProjectButton: document.querySelector("#deleteProjectButton"),
  saveLocalButton: document.querySelector("#saveLocalButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  importJsonButton: document.querySelector("#importJsonButton"),
  importJsonInput: document.querySelector("#importJsonInput"),
  exportPngButton: document.querySelector("#exportPngButton"),
  statusText: document.querySelector("#statusText"),
  pageList: document.querySelector("#pageList"),
  binderZoomInput: document.querySelector("#binderZoomInput"),
  binderZoomLabel: document.querySelector("#binderZoomLabel"),
  fitToDisplayInput: document.querySelector("#fitToDisplayInput"),
  centerBinderInput: document.querySelector("#centerBinderInput"),
  spanSelect: document.querySelector("#spanSelect"),
  customSpanColsInput: document.querySelector("#customSpanColsInput"),
  customSpanRowsInput: document.querySelector("#customSpanRowsInput"),
  imageFileInput: document.querySelector("#imageFileInput"),
  dropZone: document.querySelector("#dropZone"),
  imageLibrary: document.querySelector("#imageLibrary"),
  selectedPlacementName: document.querySelector("#selectedPlacementName"),
  cropScaleInput: document.querySelector("#cropScaleInput"),
  cropXInput: document.querySelector("#cropXInput"),
  cropYInput: document.querySelector("#cropYInput"),
  cropRotateInput: document.querySelector("#cropRotateInput"),
  resetCropButton: document.querySelector("#resetCropButton"),
  deletePlacementButton: document.querySelector("#deletePlacementButton"),
  appShell: document.querySelector(".app-shell"),
  sidebarResizer: document.querySelector("#sidebarResizer"),
  workspace: document.querySelector(".workspace"),
  floatingViewControl: document.querySelector(".floating-view-control"),
  spreadCanvas: document.querySelector("#spreadCanvas"),
};

ensureCurrentPage();
bindEvents();
renderAll();
hydrateProjectFromIndexedDbIfNeeded();

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createPage(title = "Page 1") {
  return {
    id: createId(),
    title,
    placements: [],
  };
}

function createDefaultProject({ setupComplete = false } = {}) {
  const firstPage = createPage("Page 1");
  return {
    name: "",
    rows: 3,
    cols: 3,
    setupComplete,
    localAutoSave: false,
    pages: [firstPage],
    cards: [],
    images: [],
  };
}

function loadProject() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return createDefaultProject();
  }

  try {
    return normalizeProject(JSON.parse(saved));
  } catch (error) {
    console.warn("Could not load saved binder project.", error);
    return createDefaultProject();
  }
}

function normalizeProject(input) {
  const fallback = createDefaultProject({ setupComplete: true });
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const legacyFirstPage = Array.isArray(input.pages) ? input.pages[0] : null;
  const rows = clampInteger(input.rows, 1, 8, clampInteger(legacyFirstPage?.rows, 1, 8, 3));
  const cols = clampInteger(input.cols, 1, 8, clampInteger(legacyFirstPage?.cols, 1, 8, 3));

  const normalizedImages = Array.isArray(input.images)
    ? input.images
        .filter((image) => image && typeof image.dataUrl === "string")
        .map(normalizeAsset)
    : [];
  const migratedCards = normalizedImages.filter((image) => image.source === "tcgdex");
  const images = normalizedImages.filter((image) => image.source !== "tcgdex");
  const cards = dedupeAssetsById([
    ...(Array.isArray(input.cards)
      ? input.cards.filter((card) => card && typeof card.dataUrl === "string").map(normalizeCardAsset)
      : []),
    ...migratedCards.map(normalizeCardAsset),
  ]);

  const assetIds = new Set([...images, ...cards].map((asset) => asset.id));
  const pages = Array.isArray(input.pages)
    ? input.pages.map((page, index) => normalizePage(page, assetIds, index, rows, cols))
    : [];

  return {
    name: typeof input.name === "string" ? input.name : "",
    rows,
    cols,
    setupComplete: input.setupComplete === true,
    localAutoSave: input.localAutoSave === true,
    pages: pages.length ? pages : fallback.pages,
    cards,
    images,
  };
}

function normalizeAsset(asset) {
  return {
    id: typeof asset.id === "string" ? asset.id : createId(),
    name: typeof asset.name === "string" ? asset.name : "image",
    dataUrl: asset.dataUrl,
    source: typeof asset.source === "string" ? asset.source : "upload",
    cardId: typeof asset.cardId === "string" ? asset.cardId : undefined,
    cardName: typeof asset.cardName === "string" ? asset.cardName : undefined,
    setName: typeof asset.setName === "string" ? asset.setName : undefined,
    number: typeof asset.number === "string" ? asset.number : undefined,
    rarity: typeof asset.rarity === "string" ? asset.rarity : undefined,
  };
}

function dedupeAssetsById(assets) {
  const seen = new Set();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) {
      return false;
    }
    seen.add(asset.id);
    return true;
  });
}

function normalizeCardAsset(card) {
  return {
    ...normalizeAsset(card),
    source: "tcgdex",
  };
}

function normalizePage(page, assetIds, index, rows, cols) {
  const placements = Array.isArray(page?.placements)
    ? page.placements
        .map((placement) => normalizePlacement(placement, assetIds))
        .filter((placement) => placement && placementFits(placement, rows, cols))
    : [];

  return {
    id: typeof page?.id === "string" ? page.id : createId(),
    title:
      typeof page?.title === "string" && page.title.trim()
        ? page.title
        : `Page ${index + 1}`,
    placements,
  };
}

function normalizePlacement(placement, assetIds) {
  if (!placement || typeof placement !== "object" || !assetIds.has(placement.imageId)) {
    return null;
  }

  return {
    id: typeof placement.id === "string" ? placement.id : createId(),
    imageId: placement.imageId,
    row: clampInteger(placement.row, 0, 7, 0),
    col: clampInteger(placement.col, 0, 7, 0),
    rowSpan: clampInteger(placement.rowSpan, 1, 8, 1),
    colSpan: clampInteger(placement.colSpan, 1, 8, 1),
    crop: normalizeCrop(placement.crop),
  };
}

function normalizeCrop(crop) {
  return {
    scale: clampNumber(crop?.scale, 0.5, 4, DEFAULT_CROP.scale),
    x: clampNumber(crop?.x, -100, 100, DEFAULT_CROP.x),
    y: clampNumber(crop?.y, -100, 100, DEFAULT_CROP.y),
    rotate: [0, 90, 180, 270].includes(Number(crop?.rotate)) ? Number(crop.rotate) : 0,
  };
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function ensureCurrentPage() {
  if (!state.project.pages.length) {
    state.project.pages.push(createPage());
  }

  if (!state.project.pages.some((page) => page.id === state.currentPageId)) {
    state.currentPageId = state.project.pages[0].id;
  }

  localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
}

function getProjectGrid() {
  return {
    rows: clampInteger(state.project.rows, 1, 8, 3),
    cols: clampInteger(state.project.cols, 1, 8, 3),
  };
}

function getCurrentPageIndex() {
  const index = state.project.pages.findIndex((page) => page.id === state.currentPageId);
  return index >= 0 ? index : 0;
}

function getSpreadStartIndex(index = getCurrentPageIndex()) {
  if (index <= 0) {
    return 0;
  }
  return index % 2 === 1 ? index : index - 1;
}

function getCurrentSpreadPages() {
  const startIndex = getSpreadStartIndex();
  const count = startIndex === 0 ? 1 : 2;
  return state.project.pages.slice(startIndex, startIndex + count);
}

function getPageNumber(page) {
  return state.project.pages.findIndex((candidate) => candidate.id === page.id) + 1;
}

function getSpreadLabelForIndex(index) {
  if (index <= 0) {
    return "Single page";
  }
  const startIndex = getSpreadStartIndex(index);
  const endIndex = Math.min(startIndex + 1, state.project.pages.length - 1);
  return endIndex > startIndex
    ? `Spread ${startIndex + 1}+${endIndex + 1}`
    : `Spread ${startIndex + 1}`;
}

function getCurrentPage() {
  return state.project.pages.find((page) => page.id === state.currentPageId);
}

function addPage() {
  const page = createPage(`Page ${state.project.pages.length + 1}`);
  state.project.pages.push(page);
  state.currentPageId = page.id;
  state.selectedPlacementId = null;
  saveProject("Page created");
  renderAll();
}

function deletePage(pageId) {
  const pageIndex = state.project.pages.findIndex((page) => page.id === pageId);
  const page = state.project.pages[pageIndex];
  if (!page) return;

  if (!window.confirm(`Delete "${page.title || `Page ${pageIndex + 1}`}"?`)) {
    return;
  }

  state.project.pages = state.project.pages.filter((candidate) => candidate.id !== page.id);
  if (!state.project.pages.length) {
    state.project.pages.push(createPage("Page 1"));
  }

  if (state.currentPageId === page.id) {
    const nextIndex = Math.min(pageIndex, state.project.pages.length - 1);
    state.currentPageId = state.project.pages[nextIndex].id;
    state.selectedPlacementId = null;
  }

  saveProject("Page deleted");
  renderAll();
}

function renamePage(pageId) {
  const pageIndex = state.project.pages.findIndex((page) => page.id === pageId);
  const page = state.project.pages[pageIndex];
  if (!page) return;

  const nextTitle = window.prompt("Page title", page.title || `Page ${pageIndex + 1}`);
  if (nextTitle === null) {
    return;
  }

  page.title = nextTitle.trim() || `Page ${pageIndex + 1}`;
  saveProject("Page renamed");
  renderAll();
}

function resetTransientProjectState() {
  if (state.indexedDbAutoSaveTimer) {
    window.clearTimeout(state.indexedDbAutoSaveTimer);
    state.indexedDbAutoSaveTimer = null;
  }

  state.selectedImageId = null;
  state.selectedCardId = null;
  state.selectedPlacementId = null;
  state.setupInitialized = false;
  state.cardSearchResults = [];
  state.cardSearchLoading = false;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  state.imageImportItems = [];
  state.imageImportIndex = 0;
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  state.imagePlacementDraft = null;
  state.pendingImagePlacement = null;
  state.hoveredSlot = null;
  state.binderZoom = 1;
  state.fitToDisplay = true;
  state.centerBinder = true;
  state.sidebarResizeGesture = null;
  state.binderPanX = 0;
  state.binderPanY = 0;
  state.binderPointers.clear();
  state.binderGesture = null;
  state.suppressNextBinderClick = false;
  state.indexedDbSavedAt = null;
  state.indexedDbSavePending = false;
}

function startNewProject() {
  if (!window.confirm("Create a new project? Export or Save Local first if you need the current one.")) {
    return;
  }

  state.project = createDefaultProject();
  state.currentPageId = state.project.pages[0].id;
  resetTransientProjectState();
  saveProject("New project ready");
  renderAll();
}

async function deleteProject() {
  if (!window.confirm("Delete the whole project? This clears the current project and saved local copy.")) {
    return;
  }

  let localDeleteFailed = false;
  try {
    const db = await openProjectDatabase();
    await deleteIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
    db.close();
  } catch (error) {
    localDeleteFailed = true;
    console.warn("Could not delete IndexedDB project.", error);
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_PAGE_KEY);
  state.project = createDefaultProject();
  state.currentPageId = state.project.pages[0].id;
  resetTransientProjectState();
  saveProject(localDeleteFailed ? "Project deleted; local save delete failed" : "Project deleted");
  renderAll();
}

function getImage(imageId) {
  return (
    state.project.images.find((image) => image.id === imageId) ||
    state.project.cards.find((card) => card.id === imageId)
  );
}

function getCard(cardId) {
  return state.project.cards.find((card) => card.id === cardId);
}

function getSelectedPlacement() {
  const page = getCurrentPage();
  return page?.placements.find((placement) => placement.id === state.selectedPlacementId) || null;
}

function saveProject(message = "Saved") {
  saveProjectToLocalStorageBestEffort();
  setStatus(message);
  queueIndexedDbAutoSave();
}

function saveProjectToLocalStorageBestEffort() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
    localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
  } catch (error) {
    console.warn("Could not save project to localStorage.", error);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
  }
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function closeParentDetails(element) {
  const details = element.closest("details");
  if (details) {
    details.open = false;
  }
}

function openProjectMenuModal() {
  els.projectMenuModal.hidden = false;
  window.setTimeout(() => {
    els.newProjectButton.focus();
  }, 0);
}

function closeProjectMenuModal() {
  els.projectMenuModal.hidden = true;
}

function openProjectDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser"));
      return;
    }

    const request = indexedDB.open(INDEXED_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function saveProjectToIndexedDb(message = "Saved local", { quiet = false } = {}) {
  if (state.indexedDbAutoSaveTimer) {
    window.clearTimeout(state.indexedDbAutoSaveTimer);
    state.indexedDbAutoSaveTimer = null;
  }

  state.indexedDbSavePending = true;
  renderProjectControls();

  try {
    const db = await openProjectDatabase();
    const savedAt = new Date().toISOString();
    await putIndexedDbRecord(db, {
      id: INDEXED_DB_CURRENT_PROJECT_ID,
      savedAt,
      project: JSON.parse(JSON.stringify(state.project)),
    });
    db.close();
    state.indexedDbSavedAt = savedAt;
    if (!quiet) {
      setStatus(message);
    }
  } catch (error) {
    console.warn("Could not save project to IndexedDB.", error);
    setStatus("Save Local failed");
  } finally {
    state.indexedDbSavePending = false;
    renderProjectControls();
  }
}

function queueIndexedDbAutoSave() {
  if (state.indexedDbAutoSaveTimer) {
    window.clearTimeout(state.indexedDbAutoSaveTimer);
  }
  state.indexedDbAutoSaveTimer = window.setTimeout(() => {
    state.indexedDbAutoSaveTimer = null;
    saveProjectToIndexedDb("Auto saved local", { quiet: true });
  }, 350);
}

function putIndexedDbRecord(db, record) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
    transaction.objectStore(INDEXED_DB_STORE).put(record);
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

async function hydrateProjectFromIndexedDbIfNeeded() {
  try {
    const db = await openProjectDatabase();
    const record = await getIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
    db.close();
    if (!record?.project) {
      return;
    }

    state.project = normalizeProject(record.project);
    state.currentPageId = state.project.pages[0]?.id || null;
    state.selectedImageId = state.project.images[0]?.id || null;
    state.selectedCardId = state.project.cards[0]?.id || null;
    state.selectedPlacementId = null;
    state.indexedDbSavedAt = record.savedAt || null;
    setStatus("Loaded local project");
    renderAll();
  } catch (error) {
    console.warn("Could not load IndexedDB project.", error);
  }
}

function getIndexedDbRecord(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).get(id);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function deleteIndexedDbRecord(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
    transaction.objectStore(INDEXED_DB_STORE).delete(id);
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

function bindEvents() {
  els.projectSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const rows = clampInteger(els.setupRowsInput.value, 1, 8, 3);
    const cols = clampInteger(els.setupColsInput.value, 1, 8, 3);
    const invalidPlacements = state.project.pages.flatMap((page) =>
      page.placements.filter((placement) => !placementFits(placement, rows, cols)),
    );

    if (
      invalidPlacements.length &&
      !window.confirm("This binder size will remove placements outside the new bounds. Continue?")
    ) {
      return;
    }

    state.project.name = els.setupProjectNameInput.value.trim() || "My Binder";
    state.project.rows = rows;
    state.project.cols = cols;
    state.project.localAutoSave = els.setupAutoSaveInput.checked;
    state.project.pages.forEach((page) => {
      page.placements = page.placements.filter((placement) => placementFits(placement, rows, cols));
    });
    state.project.setupComplete = true;
    state.setupInitialized = false;
    saveProject("Project created");
    renderAll();
  });

  els.projectNameInput.addEventListener("input", () => {
    state.project.name = els.projectNameInput.value;
    saveProject();
  });

  els.projectMenuButton.addEventListener("click", openProjectMenuModal);
  els.projectMenuCloseButton.addEventListener("click", closeProjectMenuModal);
  els.projectMenuModal.addEventListener("click", (event) => {
    if (event.target === els.projectMenuModal) {
      closeProjectMenuModal();
    }
  });
  els.menuAutoSaveInput.addEventListener("change", () => {
    state.project.localAutoSave = els.menuAutoSaveInput.checked;
    saveProject(state.project.localAutoSave ? "Autosave enabled" : "Autosave disabled");
    if (state.project.localAutoSave) {
      saveProjectToIndexedDb("Autosave enabled");
    }
    renderProjectControls();
  });

  els.newProjectButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    startNewProject();
  });

  els.saveLocalButton.addEventListener("click", async (event) => {
    closeProjectMenuModal();
    await saveProjectToIndexedDb("Saved local");
  });

  els.deleteProjectButton.addEventListener("click", async (event) => {
    closeProjectMenuModal();
    await deleteProject();
  });

  els.imageImportNameInput.addEventListener("input", () => {
    const item = getCurrentImageImportItem();
    if (item) {
      item.name = els.imageImportNameInput.value;
    }
  });

  els.imageImportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    importCurrentWizardImage();
  });

  els.imageImportSkipButton.addEventListener("click", () => {
    setStatus("Image skipped");
    advanceImageImportWizard();
  });

  els.imageImportCancelButton.addEventListener("click", () => {
    cancelImageImportWizard();
  });

  els.cardSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchTcgdexCards();
  });

  els.cardSearchInput.addEventListener("input", () => {
    if (!els.cardSearchInput.value.trim()) {
      clearCardSearch();
    }
  });

  els.cardInsertSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await searchCardInsertTcgdexCards();
  });

  els.cardInsertSearchInput.addEventListener("input", () => {
    if (!els.cardInsertSearchInput.value.trim()) {
      clearCardInsertSearch();
    }
  });

  els.cardInsertCancelButton.addEventListener("click", () => {
    closeCardInsertPrompt();
  });

  els.imagePlacementCancelButton.addEventListener("click", () => {
    closeImagePlacementModal();
  });

  els.imagePlacementModal.addEventListener("click", (event) => {
    if (event.target === els.imagePlacementModal) {
      closeImagePlacementModal();
    }
  });

  els.imagePlacementStartButton.addEventListener("click", () => {
    startPendingImagePlacement();
  });

  els.newPageButton.addEventListener("click", (event) => {
    closeParentDetails(event.currentTarget);
    addPage();
  });

  els.exportJsonButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    exportProjectJson();
  });
  els.importJsonButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    els.importJsonInput.click();
  });
  els.importJsonInput.addEventListener("change", importProjectJson);
  els.exportPngButton.addEventListener("click", exportCurrentPagePng);

  els.fitToDisplayInput.addEventListener("change", () => {
    state.fitToDisplay = els.fitToDisplayInput.checked;
    if (state.fitToDisplay) {
      state.centerBinder = true;
    }
    renderBinderViewControls();
    applyBinderZoom();
  });

  els.centerBinderInput.addEventListener("change", () => {
    state.centerBinder = els.centerBinderInput.checked;
    if (state.centerBinder) {
      state.binderPanX = 0;
      state.binderPanY = 0;
    }
    applyBinderZoom();
  });

  els.binderZoomInput.addEventListener("input", () => {
    state.fitToDisplay = false;
    state.binderZoom = Number(els.binderZoomInput.value) / 100;
    renderBinderViewControls();
    applyBinderZoom();
  });

  window.addEventListener("resize", () => {
    if (state.fitToDisplay) {
      applyBinderZoom();
    }
  });

  bindBinderPanZoom();
  bindSidebarResize();

  els.spanSelect.addEventListener("change", () => {
    updateImagePlacementDraftSpan();
  });
  els.customSpanColsInput.addEventListener("change", () => {
    updateImagePlacementDraftSpan();
  });
  els.customSpanRowsInput.addEventListener("change", () => {
    updateImagePlacementDraftSpan();
  });

  els.placementCropScaleInput.addEventListener("input", () =>
    updateImagePlacementDraftCrop("scale", els.placementCropScaleInput.value),
  );
  els.placementCropXInput.addEventListener("input", () =>
    updateImagePlacementDraftCrop("x", els.placementCropXInput.value),
  );
  els.placementCropYInput.addEventListener("input", () =>
    updateImagePlacementDraftCrop("y", els.placementCropYInput.value),
  );
  els.placementCropRotateInput.addEventListener("change", () =>
    updateImagePlacementDraftCrop("rotate", els.placementCropRotateInput.value),
  );

  els.imageFileInput.addEventListener("change", async () => {
    await importImageFiles(Array.from(els.imageFileInput.files || []));
    els.imageFileInput.value = "";
  });

  els.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropZone.classList.add("dragover");
  });
  els.dropZone.addEventListener("dragleave", () => {
    els.dropZone.classList.remove("dragover");
  });
  els.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("dragover");
    await importImageFiles(Array.from(event.dataTransfer?.files || []));
  });

  document.addEventListener("paste", async (event) => {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (!files.length) return;
    event.preventDefault();
    await importImageFiles(files, "pasted-image");
  });

  els.cropScaleInput.addEventListener("input", () => updateSelectedCrop("scale", els.cropScaleInput.value));
  els.cropXInput.addEventListener("input", () => updateSelectedCrop("x", els.cropXInput.value));
  els.cropYInput.addEventListener("input", () => updateSelectedCrop("y", els.cropYInput.value));
  els.cropRotateInput.addEventListener("change", () => updateSelectedCrop("rotate", els.cropRotateInput.value));

  els.resetCropButton.addEventListener("click", () => {
    const placement = getSelectedPlacement();
    if (!placement) return;
    placement.crop = { ...DEFAULT_CROP };
    saveProject("Crop reset");
    renderAll();
  });

  els.deletePlacementButton.addEventListener("click", deleteSelectedPlacement);

  document.addEventListener("keydown", (event) => {
    const editingText = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    const shortcut = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (shortcut && !editingText && key === "c") {
      event.preventDefault();
      copySelectedPlacement("copy");
      return;
    }

    if (shortcut && !editingText && key === "x") {
      event.preventDefault();
      copySelectedPlacement("cut");
      return;
    }

    if (shortcut && !editingText && key === "v") {
      event.preventDefault();
      const targetSlot = state.hoveredSlot || state.pendingCardSlot;
      if (targetSlot) {
        pastePlacementClipboard(targetSlot.pageId, targetSlot.row, targetSlot.col);
      } else {
        setStatus("Hover a target slot before pasting");
      }
      return;
    }

    if (event.key === "Escape" && !els.projectMenuModal.hidden) {
      closeProjectMenuModal();
      return;
    }

    if (event.key === "Escape" && state.imageImportItems.length) {
      cancelImageImportWizard();
      return;
    }

    if (event.key === "Escape" && state.pendingCardSlot) {
      closeCardInsertPrompt();
      return;
    }

    if (event.key === "Escape" && state.imagePlacementDraft) {
      closeImagePlacementModal();
      return;
    }

    if (event.key === "Escape" && state.pendingImagePlacement) {
      state.pendingImagePlacement = null;
      state.hoveredSlot = null;
      setStatus("Image placement cancelled");
      renderAll();
      return;
    }

    if (event.key === "Escape") {
      state.selectedPlacementId = null;
      renderAll();
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && !editingText) {
      deleteSelectedPlacement();
    }
  });
}

function renderAll() {
  ensureCurrentPage();
  renderSetupControls();
  renderProjectControls();
  renderPageList();
  applySidebarWidth();
  renderBinderViewControls();
  renderSpanControls();
  renderCardSearchControls();
  renderCardLibrary();
  renderImageLibrary();
  renderBinder();
  renderCropControls();
  renderImagePlacementModal();
  renderImageImportWizard();
  renderCardInsertPrompt();
}

function renderProjectControls() {
  const grid = getProjectGrid();
  els.projectSetup.hidden = state.project.setupComplete;
  els.projectNameInput.value = state.project.name;
  els.projectBinderSummary.textContent = `Binder: ${grid.rows} rows x ${grid.cols} columns`;
  els.saveLocalButton.disabled = state.indexedDbSavePending;
  els.menuAutoSaveInput.checked = state.project.localAutoSave === true;
  els.localSaveSummary.textContent = getLocalSaveSummary();
}

function renderSetupControls() {
  if (!state.setupInitialized) {
    const grid = getProjectGrid();
    els.setupProjectNameInput.value = state.project.name || "";
    els.setupRowsInput.value = grid.rows;
    els.setupColsInput.value = grid.cols;
    els.setupAutoSaveInput.checked = state.project.localAutoSave === true;
    state.setupInitialized = true;
  }
}

function getLocalSaveSummary() {
  if (state.indexedDbSavePending) {
    return "Local save: saving...";
  }

  const savedText = state.indexedDbSavedAt
    ? `Last saved local: ${new Date(state.indexedDbSavedAt).toLocaleString()}`
    : "Not saved to IndexedDB";

  return state.project.localAutoSave
    ? `Local save: auto. ${savedText}`
    : `Local save: manual. ${savedText}`;
}

function renderPageList() {
  els.pageList.replaceChildren();

  state.project.pages.forEach((page, index) => {
    const row = document.createElement("div");
    row.className = "page-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-tab${page.id === state.currentPageId ? " active" : ""}`;
    button.innerHTML = `<span></span><small></small>`;
    button.querySelector("span").textContent = `${index + 1}. ${page.title || `Page ${index + 1}`}`;
    button.querySelector("small").textContent = getSpreadLabelForIndex(index);
    button.addEventListener("click", () => {
      state.currentPageId = page.id;
      state.selectedPlacementId = null;
      saveProject("Page selected");
      renderAll();
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "page-edit-button";
    editButton.textContent = "Edit";
    editButton.title = `Rename ${page.title || `Page ${index + 1}`}`;
    editButton.setAttribute("aria-label", editButton.title);
    editButton.addEventListener("click", () => {
      renamePage(page.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "page-delete-button";
    deleteButton.title = `Delete ${page.title || `Page ${index + 1}`}`;
    deleteButton.setAttribute("aria-label", deleteButton.title);
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", () => {
      deletePage(page.id);
    });

    row.append(button, editButton, deleteButton);
    els.pageList.append(row);
  });
}

function applySidebarWidth() {
  els.appShell.style.setProperty("--sidebar-width", `${state.sidebarWidth}px`);
}

function setSidebarWidth(width) {
  state.sidebarWidth = clampInteger(width, SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX, 320);
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(state.sidebarWidth));
  applySidebarWidth();
  if (state.fitToDisplay) {
    applyBinderZoom();
  }
}

function bindSidebarResize() {
  els.sidebarResizer.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    state.sidebarResizeGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: state.sidebarWidth,
    };
    els.appShell.classList.add("resizing-sidebar");
    try {
      els.sidebarResizer.setPointerCapture?.(event.pointerId);
    } catch (error) {
      // Pointer capture is optional for this interaction.
    }
  });

  els.sidebarResizer.addEventListener("pointermove", (event) => {
    const gesture = state.sidebarResizeGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setSidebarWidth(gesture.startWidth + event.clientX - gesture.startX);
  });

  for (const eventName of ["pointerup", "pointercancel"]) {
    els.sidebarResizer.addEventListener(eventName, (event) => {
      const gesture = state.sidebarResizeGesture;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      state.sidebarResizeGesture = null;
      els.appShell.classList.remove("resizing-sidebar");
      try {
        els.sidebarResizer.releasePointerCapture?.(event.pointerId);
      } catch (error) {
        // Some browsers clear pointer capture before pointercancel.
      }
    });
  }

  els.sidebarResizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    if (event.key === "Home") {
      setSidebarWidth(SIDEBAR_WIDTH_MIN);
      return;
    }
    if (event.key === "End") {
      setSidebarWidth(SIDEBAR_WIDTH_MAX);
      return;
    }

    const step = event.shiftKey ? 40 : 16;
    setSidebarWidth(state.sidebarWidth + (event.key === "ArrowRight" ? step : -step));
  });
}

function renderBinderViewControls() {
  const zoomPercent = Math.round(state.binderZoom * 100);
  els.fitToDisplayInput.checked = state.fitToDisplay;
  els.centerBinderInput.checked = state.centerBinder;
  els.binderZoomInput.disabled = state.fitToDisplay;
  els.binderZoomInput.value = String(clampInteger(zoomPercent, 5, 200, 100));
  els.binderZoomLabel.textContent = state.fitToDisplay
    ? `Fit ${zoomPercent}%`
    : `${zoomPercent}%`;
}

function applyBinderZoom() {
  applyViewControlSafeArea();
  if (state.fitToDisplay) {
    state.binderZoom = calculateFitBinderZoom();
  }

  if (state.centerBinder) {
    state.binderPanX = 0;
    state.binderPanY = 0;
  }

  els.spreadCanvas.style.setProperty("--binder-zoom", state.binderZoom.toFixed(3));
  applyBinderPan();
  renderBinderViewControls();
}

function applyViewControlSafeArea() {
  const safeWidth = els.floatingViewControl ? els.floatingViewControl.offsetWidth + 18 : 0;
  els.workspace.style.setProperty("--view-control-safe-width", `${safeWidth}px`);
}

function setManualBinderZoom(nextZoom) {
  state.fitToDisplay = false;
  state.binderZoom = clampNumber(nextZoom, BINDER_ZOOM_MIN, BINDER_ZOOM_MAX, 1);
  applyBinderZoom();
}

function applyBinderPan() {
  els.spreadCanvas.style.setProperty("--binder-pan-x", `${Math.round(state.binderPanX)}px`);
  els.spreadCanvas.style.setProperty("--binder-pan-y", `${Math.round(state.binderPanY)}px`);
}

function bindBinderPanZoom() {
  const workspace = els.workspace;
  workspace.addEventListener("pointerdown", handleBinderPointerDown);
  workspace.addEventListener("pointermove", handleBinderPointerMove);
  workspace.addEventListener("pointerup", handleBinderPointerEnd);
  workspace.addEventListener("pointercancel", handleBinderPointerEnd);
  workspace.addEventListener(
    "click",
    (event) => {
      if (!state.suppressNextBinderClick) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      state.suppressNextBinderClick = false;
    },
    true,
  );
}

function handleBinderPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (event.target.closest(".floating-view-control")) {
    return;
  }

  if (!isBinderPanBackgroundTarget(event.target)) {
    return;
  }

  state.binderPointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });
  try {
    els.workspace.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Pointer capture is optional for this interaction.
  }

  if (state.binderPointers.size === 1) {
    state.binderGesture = {
      type: "pan",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: state.binderPanX,
      startPanY: state.binderPanY,
      dragged: false,
    };
  } else if (state.binderPointers.size === 2) {
    startBinderPinchGesture();
  }
}

function isBinderPanBackgroundTarget(target) {
  if (target.closest(".floating-view-control") || target.closest(".page-preview")) {
    return false;
  }

  return els.workspace.contains(target);
}

function handleBinderPointerMove(event) {
  if (!state.binderPointers.has(event.pointerId)) {
    return;
  }

  state.binderPointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (state.binderPointers.size >= 2) {
    updateBinderPinchGesture();
    event.preventDefault();
    return;
  }

  const gesture = state.binderGesture;
  if (!gesture || gesture.type !== "pan" || gesture.pointerId !== event.pointerId) {
    return;
  }

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;
  if (!gesture.dragged && Math.hypot(dx, dy) > 4) {
    gesture.dragged = true;
    els.workspace.classList.add("panning");
  }

  if (!gesture.dragged) {
    return;
  }

  event.preventDefault();
  state.fitToDisplay = false;
  state.centerBinder = false;
  state.binderPanX = gesture.startPanX + dx;
  state.binderPanY = gesture.startPanY + dy;
  applyBinderPan();
  renderBinderViewControls();
}

function handleBinderPointerEnd(event) {
  const gesture = state.binderGesture;
  const dragged = gesture?.dragged || gesture?.type === "pinch";

  state.binderPointers.delete(event.pointerId);
  try {
    els.workspace.releasePointerCapture?.(event.pointerId);
  } catch (error) {
    // Some browsers clear pointer capture before pointercancel.
  }

  if (dragged) {
    state.suppressNextBinderClick = true;
    window.setTimeout(() => {
      state.suppressNextBinderClick = false;
    }, 0);
  }

  if (state.binderPointers.size === 1) {
    const [pointerId, pointer] = state.binderPointers.entries().next().value;
    state.binderGesture = {
      type: "pan",
      pointerId,
      startX: pointer.x,
      startY: pointer.y,
      startPanX: state.binderPanX,
      startPanY: state.binderPanY,
      dragged: false,
    };
  } else {
    state.binderGesture = null;
    els.workspace.classList.remove("panning");
  }
}

function startBinderPinchGesture() {
  const [first, second] = Array.from(state.binderPointers.values());
  const distance = getPointerDistance(first, second);
  state.binderGesture = {
    type: "pinch",
    startDistance: Math.max(1, distance),
    startZoom: state.binderZoom,
  };
  els.workspace.classList.add("panning");
}

function updateBinderPinchGesture() {
  if (!state.binderGesture || state.binderGesture.type !== "pinch") {
    startBinderPinchGesture();
  }

  const [first, second] = Array.from(state.binderPointers.values());
  const distance = getPointerDistance(first, second);
  const nextZoom = state.binderGesture.startZoom * (distance / state.binderGesture.startDistance);
  setManualBinderZoom(nextZoom);
}

function getPointerDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function calculateFitBinderZoom() {
  const workspace = els.workspace;
  if (!workspace) {
    return 1;
  }

  const workspaceStyle = window.getComputedStyle(workspace);
  const paddingX =
    Number.parseFloat(workspaceStyle.paddingLeft) +
    Number.parseFloat(workspaceStyle.paddingRight);
  const paddingY =
    Number.parseFloat(workspaceStyle.paddingTop) +
    Number.parseFloat(workspaceStyle.paddingBottom);
  const safeGap = 18;
  const availableWidth = Math.max(220, workspace.clientWidth - paddingX - safeGap);
  const availableHeight = Math.max(220, workspace.clientHeight - paddingY - safeGap);
  const spreadInner = els.spreadCanvas.querySelector(".spread-inner");
  const naturalWidth =
    spreadInner?.offsetWidth ||
    Number.parseFloat(els.spreadCanvas.style.getPropertyValue("--binder-natural-width")) ||
    920;
  const naturalHeight =
    spreadInner?.offsetHeight ||
    Number.parseFloat(els.spreadCanvas.style.getPropertyValue("--binder-natural-height")) ||
    720;

  return clampNumber(
    Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight),
    BINDER_ZOOM_MIN,
    BINDER_ZOOM_MAX,
    1,
  );
}

function renderSpanControls() {
  const isCustom = els.spanSelect.value === "custom";
  els.customSpanColsInput.disabled = !isCustom;
  els.customSpanRowsInput.disabled = !isCustom;

  if (!els.customSpanColsInput.value) {
    els.customSpanColsInput.value = "1";
  }
  if (!els.customSpanRowsInput.value) {
    els.customSpanRowsInput.value = "1";
  }
}

function renderCardSearchControls() {
  els.cardSearchButton.disabled = state.cardSearchLoading;
  els.cardSearchResults.replaceChildren();

  if (!state.cardSearchResults.length) {
    return;
  }

  state.cardSearchResults.forEach((card) => {
    const imageUrl = getTcgdexCardImageUrl(card, "low", "webp");
    if (!imageUrl) return;

    const result = document.createElement("button");
    result.type = "button";
    result.className = "card-result";
    result.innerHTML = `<img alt=""><span><strong></strong><span></span><span></span></span>`;
    result.querySelector("img").src = imageUrl;
    result.querySelector("img").alt = card.name;
    result.querySelector("strong").textContent = card.name;
    const detailLines = result.querySelectorAll("span span");
    detailLines[0].textContent = card.localId ? `Local #${card.localId}` : "No local number";
    detailLines[1].textContent = card.id || "";
    result.addEventListener("click", async () => {
      await importTcgdexCardArt(card);
    });
    els.cardSearchResults.append(result);
  });
}

async function searchTcgdexCards() {
  const searchTerm = els.cardSearchInput.value.trim();
  if (!searchTerm) {
    clearCardSearch();
    return;
  }

  state.cardSearchLoading = true;
  state.cardSearchResults = [];
  els.cardSearchStatus.textContent = "Searching cards";
  renderCardSearchControls();

  try {
    state.cardSearchResults = await fetchTcgdexCardSearchResults(searchTerm);
    els.cardSearchStatus.textContent = state.cardSearchResults.length
      ? `${state.cardSearchResults.length} result${state.cardSearchResults.length === 1 ? "" : "s"}`
      : "No matching cards";
  } catch (error) {
    console.warn("TCGdex card search failed.", error);
    els.cardSearchStatus.textContent = "Card search failed";
  } finally {
    state.cardSearchLoading = false;
    renderCardSearchControls();
  }
}

async function fetchTcgdexCardSearchResults(searchTerm) {
  const query = buildTcgdexCardNameQuery(searchTerm);
  if (!query.name) {
    return [];
  }

  const params = new URLSearchParams({
    name: query.name,
    "pagination:page": "1",
    "pagination:itemsPerPage": "24",
    "sort:field": "name",
    "sort:order": "ASC",
  });

  const response = await fetch(`${TCGDEX_CARDS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Card search failed with status ${response.status}`);
  }

  const result = await response.json();
  return Array.isArray(result) ? result.filter((card) => card.image) : [];
}

function buildTcgdexCardNameQuery(searchTerm) {
  return {
    name: searchTerm.replace(/[^\w\s.'-]/g, " ").replace(/\s+/g, " ").trim(),
  };
}

function clearCardSearch() {
  state.cardSearchLoading = false;
  state.cardSearchResults = [];
  els.cardSearchStatus.textContent = "";
  renderCardSearchControls();
}

async function searchCardInsertTcgdexCards() {
  const searchTerm = els.cardInsertSearchInput.value.trim();
  if (!searchTerm) {
    clearCardInsertSearch();
    return;
  }

  state.cardInsertSearchLoading = true;
  state.cardInsertSearchResults = [];
  els.cardInsertSearchStatus.textContent = "Searching cards";
  renderCardInsertPrompt();

  try {
    state.cardInsertSearchResults = await fetchTcgdexCardSearchResults(searchTerm);
    els.cardInsertSearchStatus.textContent = state.cardInsertSearchResults.length
      ? `${state.cardInsertSearchResults.length} result${state.cardInsertSearchResults.length === 1 ? "" : "s"}`
      : "No matching cards";
  } catch (error) {
    console.warn("TCGdex insert card search failed.", error);
    els.cardInsertSearchStatus.textContent = "Card search failed";
  } finally {
    state.cardInsertSearchLoading = false;
    renderCardInsertPrompt();
  }
}

function clearCardInsertSearch() {
  state.cardInsertSearchLoading = false;
  state.cardInsertSearchResults = [];
  els.cardInsertSearchStatus.textContent = "";
  renderCardInsertPrompt();
}

async function importTcgdexCardArt(card, { statusElement = els.cardSearchStatus, renderAfterImport = true } = {}) {
  const existing = state.project.cards.find(
    (cardAsset) => cardAsset.source === "tcgdex" && cardAsset.cardId === card.id,
  );
  if (existing) {
    state.selectedCardId = existing.id;
    setStatus(`Selected ${existing.name}`);
    if (renderAfterImport) {
      renderAll();
    }
    return existing;
  }

  if (!card.image) {
    setStatus("This card has no image");
    return null;
  }

  statusElement.textContent = `Importing ${card.name}`;
  try {
    const cardDetail = await fetchTcgdexCardDetail(card.id);
    const cardForImport = cardDetail || card;
    const imageUrl = getTcgdexCardImageUrl(cardForImport, "high", "png");
    const dataUrl = await downloadImageAsDataUrl(imageUrl);
    const cardAsset = {
      id: createId(),
      name: formatTcgdexCardImageName(cardForImport),
      dataUrl,
      source: "tcgdex",
      cardId: cardForImport.id,
      cardName: cardForImport.name,
      setName: cardForImport.set?.name,
      number: cardForImport.localId,
      rarity: cardForImport.rarity,
    };
    state.project.cards.push(cardAsset);
    state.selectedCardId = cardAsset.id;
    saveProject(`Imported ${card.name}`);
    if (renderAfterImport) {
      renderAll();
    }
    return cardAsset;
  } catch (error) {
    console.warn("TCGdex image import failed.", error);
    statusElement.textContent = "Could not import card art";
    return null;
  }
}

async function fetchTcgdexCardDetail(cardId) {
  const response = await fetch(`${TCGDEX_CARDS_ENDPOINT}/${encodeURIComponent(cardId)}`);
  if (!response.ok) {
    throw new Error(`Card detail failed with status ${response.status}`);
  }
  return response.json();
}

function getTcgdexCardImageUrl(card, quality = "high", extension = "png") {
  return card.image ? `${card.image}/${quality}.${extension}` : "";
}

function formatTcgdexCardImageName(card) {
  return [card.name, card.set?.name, card.localId ? `#${card.localId}` : ""]
    .filter(Boolean)
    .join(" - ");
}

async function downloadImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const image = await loadImageFromBlob(blob);
  return compressImageToDataUrl(image, 520);
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Card art image could not be loaded"));
    });
    image.src = objectUrl;
  });
}

function compressImageToDataUrl(image, maxWidth) {
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function renderCardLibrary() {
  els.cardLibrary.replaceChildren();

  if (!state.project.cards.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No cards imported";
    els.cardLibrary.append(empty);
    return;
  }

  state.project.cards.forEach((card) => {
    const item = document.createElement("div");
    item.className = `library-item${card.id === state.selectedCardId ? " selected" : ""}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Select ${card.name}`);
    item.innerHTML = `<img alt=""><span></span>`;
    item.querySelector("img").src = card.dataUrl;
    item.querySelector("img").alt = card.name;
    item.querySelector("span").textContent = card.name;
    item.addEventListener("click", () => {
      state.selectedCardId = card.id;
      renderCardLibrary();
      setStatus(`Selected card ${card.name}`);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedCardId = card.id;
        renderCardLibrary();
        setStatus(`Selected card ${card.name}`);
      }
    });
    els.cardLibrary.append(item);
  });
}

function renderImageLibrary() {
  els.imageLibrary.replaceChildren();

  if (!state.project.images.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No images";
    els.imageLibrary.append(empty);
    return;
  }

  state.project.images.forEach((image) => {
    const item = document.createElement("div");
    item.className = `library-item${image.id === state.selectedImageId ? " selected" : ""}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Select ${image.name}`);
    item.innerHTML = `<img alt=""><span></span><button type="button" class="place-image-button">Place</button><button type="button" class="rename-image-button">Rename</button>`;
    item.querySelector("img").src = image.dataUrl;
    item.querySelector("img").alt = image.name;
    item.querySelector("span").textContent = image.name;
    item.querySelector(".place-image-button").addEventListener("click", (event) => {
      event.stopPropagation();
      openImagePlacementModal(image.id);
    });
    item.querySelector(".rename-image-button").addEventListener("click", (event) => {
      event.stopPropagation();
      renameImageAsset(image.id);
    });
    item.addEventListener("click", () => {
      state.selectedImageId = image.id;
      renderImageLibrary();
      setStatus(`Selected ${image.name}`);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedImageId = image.id;
        renderImageLibrary();
        setStatus(`Selected ${image.name}`);
      }
    });
    els.imageLibrary.append(item);
  });
}

function renameImageAsset(imageId) {
  const image = getImage(imageId);
  if (!image) return;

  const nextName = window.prompt("Rename image asset", image.name);
  if (nextName === null) {
    return;
  }

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    setStatus("Image name was not changed");
    return;
  }

  image.name = trimmedName;
  saveProject("Image renamed");
  renderAll();
}

function openImagePlacementModal(imageId) {
  const image = state.project.images.find((candidate) => candidate.id === imageId);
  if (!image) return;

  state.selectedImageId = image.id;
  state.pendingImagePlacement = null;
  state.imagePlacementDraft = {
    mode: "new",
    imageId: image.id,
    colSpan: 1,
    rowSpan: 1,
    crop: { ...DEFAULT_CROP },
  };
  setSpanControlsFromDraft(state.imagePlacementDraft);
  renderAll();
}

function setSpanControlsFromDraft(draft) {
  const preset = Object.entries(SPAN_PRESETS).find(
    ([, span]) => span.colSpan === draft.colSpan && span.rowSpan === draft.rowSpan,
  );
  els.spanSelect.value = preset ? preset[0] : "custom";
  els.customSpanColsInput.value = String(draft.colSpan);
  els.customSpanRowsInput.value = String(draft.rowSpan);
}

function openPlacementEditModal(pageId, placementId) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  const placement = page?.placements.find((candidate) => candidate.id === placementId);
  const image = placement ? getImage(placement.imageId) : null;
  if (!page || !placement || !image) return;

  state.currentPageId = page.id;
  state.selectedPlacementId = placement.id;
  state.pendingImagePlacement = null;
  state.imagePlacementDraft = {
    mode: "edit",
    pageId: page.id,
    placementId: placement.id,
    imageId: placement.imageId,
    colSpan: placement.colSpan,
    rowSpan: placement.rowSpan,
    crop: normalizeCrop(placement.crop),
  };
  setSpanControlsFromDraft(state.imagePlacementDraft);
  renderAll();
}

function closeImagePlacementModal() {
  state.imagePlacementDraft = null;
  renderAll();
}

function updateImagePlacementDraftSpan() {
  if (!state.imagePlacementDraft) {
    renderSpanControls();
    return;
  }

  const span = getSelectedSpan();
  state.imagePlacementDraft.colSpan = span.colSpan;
  state.imagePlacementDraft.rowSpan = span.rowSpan;
  renderImagePlacementModal();
}

function updateImagePlacementDraftCrop(key, value) {
  if (!state.imagePlacementDraft) return;

  state.imagePlacementDraft.crop = normalizeCrop({
    ...normalizeCrop(state.imagePlacementDraft.crop),
    [key]: key === "rotate" ? Number(value) : Number(value),
  });
  renderImagePlacementModal();
}

function renderImagePlacementModal() {
  const draft = state.imagePlacementDraft;
  els.imagePlacementModal.hidden = !draft;
  renderSpanControls();
  if (!draft) {
    els.imagePlacementPreview.replaceChildren();
    return;
  }

  const image = getImage(draft.imageId);
  if (!image) {
    closeImagePlacementModal();
    return;
  }

  els.imagePlacementName.textContent = image.name;
  els.imagePlacementTitle.textContent = draft.mode === "edit" ? "Edit Placement" : "Place Image";
  els.imagePlacementStartButton.textContent = draft.mode === "edit" ? "Save Changes" : "Place on Page";
  els.imagePlacementPreview.style.aspectRatio = `${draft.colSpan * CARD_ASPECT} / ${draft.rowSpan}`;
  const previewMetrics = setImagePlacementPreviewSize(draft);
  els.imagePlacementPreview.replaceChildren();

  const frame = document.createElement("div");
  frame.className = "placement-preview-frame";
  frame.style.width = `${previewMetrics.frameWidth}px`;
  frame.style.height = `${previewMetrics.frameHeight}px`;
  frame.style.setProperty("--preview-cols", draft.colSpan);
  frame.style.setProperty("--preview-rows", draft.rowSpan);

  const img = document.createElement("img");
  img.src = image.dataUrl;
  img.alt = image.name;
  img.style.width = `${previewMetrics.frameWidth}px`;
  img.style.height = `${previewMetrics.frameHeight}px`;
  img.style.transform = cropToTransform(draft.crop);
  frame.append(img);
  els.imagePlacementPreview.append(frame);

  const crop = normalizeCrop(draft.crop);
  els.placementCropScaleInput.value = crop.scale;
  els.placementCropXInput.value = crop.x;
  els.placementCropYInput.value = crop.y;
  els.placementCropRotateInput.value = crop.rotate;
}

function setImagePlacementPreviewSize(draft) {
  const ratio = (draft.colSpan * CARD_ASPECT) / draft.rowSpan;
  const stageWidth = 380;
  const stageHeight = 300;
  const frameMaxWidth = stageWidth * 0.58;
  const frameMaxHeight = stageHeight * 0.58;
  let frameWidth = frameMaxWidth;
  let frameHeight = frameWidth / ratio;
  if (frameHeight > frameMaxHeight) {
    frameHeight = frameMaxHeight;
    frameWidth = frameHeight * ratio;
  }

  els.imagePlacementPreview.style.width = `${stageWidth}px`;
  els.imagePlacementPreview.style.height = `${stageHeight}px`;
  return {
    frameWidth: Math.round(frameWidth),
    frameHeight: Math.round(frameHeight),
  };
}

function startPendingImagePlacement() {
  const draft = state.imagePlacementDraft;
  const image = draft ? getImage(draft.imageId) : null;
  if (!draft || !image) return;

  if (draft.mode === "edit") {
    savePlacementDraftChanges();
    return;
  }

  state.pendingImagePlacement = {
    imageId: draft.imageId,
    colSpan: draft.colSpan,
    rowSpan: draft.rowSpan,
    crop: normalizeCrop(draft.crop),
  };
  state.imagePlacementDraft = null;
  setStatus(`Click a slot to place ${image.name}`);
  renderAll();
}

function savePlacementDraftChanges() {
  const draft = state.imagePlacementDraft;
  if (!draft || draft.mode !== "edit") return;

  const page = state.project.pages.find((candidate) => candidate.id === draft.pageId);
  const placement = page?.placements.find((candidate) => candidate.id === draft.placementId);
  if (!page || !placement) return;

  const nextPlacement = {
    ...placement,
    colSpan: draft.colSpan,
    rowSpan: draft.rowSpan,
    crop: normalizeCrop(draft.crop),
  };
  const grid = getProjectGrid();
  if (!placementFits(nextPlacement, grid.rows, grid.cols)) {
    setStatus("Edited placement exceeds grid bounds");
    return;
  }

  const overlapping = page.placements.filter(
    (candidate) => candidate.id !== placement.id && placementsOverlap(candidate, nextPlacement),
  );
  if (
    overlapping.length &&
    !window.confirm(`Replace ${overlapping.length} overlapping placement${overlapping.length > 1 ? "s" : ""}?`)
  ) {
    return;
  }

  page.placements = page.placements
    .filter((candidate) => candidate.id !== placement.id && !placementsOverlap(candidate, nextPlacement))
    .concat(nextPlacement);
  state.imagePlacementDraft = null;
  state.selectedPlacementId = nextPlacement.id;
  saveProject("Placement updated");
  renderAll();
}

function renderCardInsertPrompt() {
  const pendingSlot = state.pendingCardSlot;
  els.cardInsertPrompt.hidden = !pendingSlot;
  els.cardInsertSearchResults.replaceChildren();
  els.cardInsertSearchButton.disabled = state.cardInsertSearchLoading;
  if (!pendingSlot) {
    return;
  }

  const page = state.project.pages.find((candidate) => candidate.id === pendingSlot.pageId);
  const pageNumber = page ? getPageNumber(page) : 1;
  els.cardInsertSlotText.textContent = `Page ${pageNumber}, row ${pendingSlot.row + 1}, column ${pendingSlot.col + 1}`;

  if (!state.cardInsertSearchResults.length && !state.cardInsertSearchLoading) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Search TCGdex to insert a card here.";
    els.cardInsertSearchResults.append(empty);
  }

  state.cardInsertSearchResults.forEach((card) => {
    const imageUrl = getTcgdexCardImageUrl(card, "low", "webp");
    if (!imageUrl) return;

    const result = document.createElement("button");
    result.type = "button";
    result.className = "card-result";
    result.innerHTML = `<img alt=""><span><strong></strong><span></span><span></span></span>`;
    result.querySelector("img").src = imageUrl;
    result.querySelector("img").alt = card.name;
    result.querySelector("strong").textContent = card.name;
    const detailLines = result.querySelectorAll("span span");
    detailLines[0].textContent = card.localId ? `Local #${card.localId}` : "No local number";
    detailLines[1].textContent = card.id || "";
    result.addEventListener("click", async () => {
      const cardAsset = await importTcgdexCardArt(card, {
        statusElement: els.cardInsertSearchStatus,
        renderAfterImport: false,
      });
      if (cardAsset) {
        placeCardInPendingSlot(cardAsset.id);
      }
    });
    els.cardInsertSearchResults.append(result);
  });
}

function openCardInsertPrompt(pageId, row, col) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page) return;

  state.currentPageId = page.id;
  state.selectedPlacementId = null;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  state.pendingCardSlot = { pageId, row, col };
  if (document.activeElement !== els.cardInsertSearchInput) {
    els.cardInsertSearchInput.value = "";
  }
  els.cardInsertSearchStatus.textContent = "";
  saveProject("Page selected");
  renderAll();
  window.setTimeout(() => {
    if (!els.cardInsertPrompt.hidden) {
      els.cardInsertSearchInput.focus();
    }
  }, 0);
}

function closeCardInsertPrompt() {
  state.pendingCardSlot = null;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  els.cardInsertSearchInput.value = "";
  els.cardInsertSearchStatus.textContent = "";
  renderAll();
}

function setHoveredSlot(slot) {
  const changed =
    state.hoveredSlot?.pageId !== slot.pageId ||
    state.hoveredSlot?.row !== slot.row ||
    state.hoveredSlot?.col !== slot.col;
  state.hoveredSlot = slot;
  if (changed && state.pendingImagePlacement) {
    renderBinder();
  }
}

function clearHoveredSlot(pageId, row, col) {
  if (
    state.hoveredSlot?.pageId !== pageId ||
    state.hoveredSlot.row !== row ||
    state.hoveredSlot.col !== col
  ) {
    return;
  }

  state.hoveredSlot = null;
  if (state.pendingImagePlacement) {
    renderBinder();
  }
}

function getPendingImageHoverPlacement(pageId) {
  if (!state.pendingImagePlacement || state.hoveredSlot?.pageId !== pageId) {
    return null;
  }

  return {
    id: "pending-image-placement-preview",
    imageId: state.pendingImagePlacement.imageId,
    row: state.hoveredSlot.row,
    col: state.hoveredSlot.col,
    rowSpan: state.pendingImagePlacement.rowSpan,
    colSpan: state.pendingImagePlacement.colSpan,
    crop: state.pendingImagePlacement.crop,
  };
}

function placeCardInPendingSlot(cardId) {
  const pendingSlot = state.pendingCardSlot;
  if (!pendingSlot) return;

  const card = getCard(cardId);
  const page = state.project.pages.find((candidate) => candidate.id === pendingSlot.pageId);
  if (!card || !page) return;

  const nextPlacement = {
    id: createId(),
    imageId: card.id,
    row: pendingSlot.row,
    col: pendingSlot.col,
    rowSpan: 1,
    colSpan: 1,
    crop: { ...DEFAULT_CROP },
  };

  const overlapping = page.placements.filter((placement) => placementsOverlap(placement, nextPlacement));
  if (
    overlapping.length &&
    !window.confirm(`Replace ${overlapping.length} overlapping placement${overlapping.length > 1 ? "s" : ""}?`)
  ) {
    return;
  }

  page.placements = page.placements.filter((placement) => !placementsOverlap(placement, nextPlacement));
  page.placements.push(nextPlacement);
  state.currentPageId = page.id;
  state.selectedCardId = card.id;
  state.selectedPlacementId = nextPlacement.id;
  state.pendingCardSlot = null;
  saveProject("Card placed");
  renderAll();
}

function renderBinder() {
  const pages = getCurrentSpreadPages();
  const grid = getProjectGrid();

  els.spreadCanvas.replaceChildren();
  els.spreadCanvas.className = "spread-canvas";
  const spreadMode = pages.length > 1 ? "spread" : "single";
  const naturalWidth = pages.length > 1 ? 1540 : 920;
  const naturalHeight = estimatePreviewNaturalHeight(grid);
  els.spreadCanvas.style.setProperty("--binder-natural-width", `${naturalWidth}px`);
  els.spreadCanvas.style.setProperty("--binder-natural-height", `${naturalHeight}px`);
  const spreadInner = document.createElement("div");
  spreadInner.className = `spread-inner ${spreadMode}`;
  pages.forEach((page) => {
    spreadInner.append(createPagePreview(page, grid));
  });
  els.spreadCanvas.append(spreadInner);
  els.spreadCanvas.style.setProperty(
    "--binder-natural-width",
    `${Math.ceil(spreadInner.offsetWidth || naturalWidth)}px`,
  );
  els.spreadCanvas.style.setProperty(
    "--binder-natural-height",
    `${Math.ceil(spreadInner.offsetHeight || naturalHeight)}px`,
  );
  applyBinderZoom();
}

function estimatePreviewNaturalHeight(grid) {
  const maxPageWidth = 920;
  const sheetHorizontalPadding = 48;
  const spineAndGap = 42;
  const gridWidth = maxPageWidth - sheetHorizontalPadding - spineAndGap;
  const gridHeight = gridWidth / (grid.cols * CARD_ASPECT / grid.rows);
  return Math.round(10 + 37 + 48 + gridHeight);
}

function createPagePreview(page, grid) {
  const pageNumber = getPageNumber(page);
  const wrapper = document.createElement("section");
  wrapper.className = `page-preview${page.id === state.currentPageId ? " active" : ""}`;
  wrapper.addEventListener("click", () => {
    if (state.currentPageId !== page.id) {
      state.currentPageId = page.id;
      state.selectedPlacementId = null;
      saveProject("Page selected");
      renderAll();
    }
  });

  const title = document.createElement("h1");
  title.className = "preview-title";
  title.textContent = `Page ${pageNumber}: ${page.title || `Page ${pageNumber}`}`;
  wrapper.append(title);

  const sheet = document.createElement("div");
  sheet.className = `binder-sheet${pageNumber > 1 && pageNumber % 2 === 0 ? " spine-right" : ""}`;

  const spine = document.createElement("div");
  spine.className = "spine";
  spine.setAttribute("aria-hidden", "true");
  spine.innerHTML = "<span></span><span></span><span></span>";
  sheet.append(spine);

  const binderGrid = document.createElement("div");
  binderGrid.className = "binder-grid";
  binderGrid.style.gridTemplateColumns = `repeat(${grid.cols}, minmax(0, 1fr))`;
  binderGrid.style.gridTemplateRows = `repeat(${grid.rows}, minmax(0, 1fr))`;
  binderGrid.style.aspectRatio = `${grid.cols * CARD_ASPECT} / ${grid.rows}`;

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const pocket = document.createElement("button");
      pocket.type = "button";
      pocket.className = "pocket";
      pocket.style.gridRow = `${row + 1} / span 1`;
      pocket.style.gridColumn = `${col + 1} / span 1`;
      pocket.setAttribute("aria-label", `Page ${pageNumber}, slot row ${row + 1}, column ${col + 1}`);
      pocket.addEventListener("mouseenter", () => {
        setHoveredSlot({ pageId: page.id, row, col });
      });
      pocket.addEventListener("mouseleave", () => {
        clearHoveredSlot(page.id, row, col);
      });
      pocket.addEventListener("focus", () => {
        setHoveredSlot({ pageId: page.id, row, col });
      });
      pocket.addEventListener("blur", () => {
        clearHoveredSlot(page.id, row, col);
      });
      pocket.addEventListener("click", (event) => {
        event.stopPropagation();
        if (state.placementClipboard) {
          pastePlacementClipboard(page.id, row, col);
          return;
        }
        if (state.pendingImagePlacement) {
          placePendingImage(page.id, row, col);
          return;
        }
        openCardInsertPrompt(page.id, row, col);
      });
      binderGrid.append(pocket);
    }
  }

  const hoverPlacement = getPendingImageHoverPlacement(page.id);
  if (hoverPlacement) {
    const hover = document.createElement("div");
    hover.className = `placement-target-preview${placementFits(hoverPlacement, grid.rows, grid.cols) ? "" : " invalid"}`;
    hover.style.gridRow = `${hoverPlacement.row + 1} / span ${hoverPlacement.rowSpan}`;
    hover.style.gridColumn = `${hoverPlacement.col + 1} / span ${hoverPlacement.colSpan}`;
    binderGrid.append(hover);
  }

  page.placements.forEach((placement) => {
    const image = getImage(placement.imageId);
    if (!image) return;

    const item = document.createElement("button");
    item.type = "button";
    item.className = `placement${placement.id === state.selectedPlacementId ? " selected" : ""}`;
    item.style.gridRow = `${placement.row + 1} / span ${placement.rowSpan}`;
    item.style.gridColumn = `${placement.col + 1} / span ${placement.colSpan}`;
    item.setAttribute("aria-label", `${image.name}, page ${pageNumber}, row ${placement.row + 1}, column ${placement.col + 1}`);

    const img = document.createElement("img");
    img.src = image.dataUrl;
    img.alt = image.name;
    img.style.transform = cropToTransform(placement.crop);
    item.append(img);

    const badge = document.createElement("span");
    badge.className = "placement-badge";
    badge.textContent = `${placement.colSpan}x${placement.rowSpan}`;
    item.append(badge);

    const trash = document.createElement("span");
    trash.className = "placement-trash";
    trash.setAttribute("aria-hidden", "true");
    trash.title = "Delete from layout";
    item.append(trash);

    const edit = document.createElement("span");
    edit.className = "placement-edit";
    edit.textContent = "Edit";
    edit.title = "Edit placement";
    item.append(edit);

    item.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest(".placement-trash")) {
        deletePlacement(page.id, placement.id);
        return;
      }

      if (event.target.closest(".placement-edit")) {
        openPlacementEditModal(page.id, placement.id);
        return;
      }

      state.currentPageId = page.id;
      state.selectedPlacementId = placement.id;
      renderAll();
    });

    binderGrid.append(item);
  });

  sheet.append(binderGrid);
  wrapper.append(sheet);
  return wrapper;
}

function cropToTransform(crop) {
  const safeCrop = normalizeCrop(crop);
  // Crop edits are non-destructive: the original data URL stays intact and CSS clips the view.
  return `translate(${safeCrop.x}%, ${safeCrop.y}%) rotate(${safeCrop.rotate}deg) scale(${safeCrop.scale})`;
}

function renderCropControls() {
  const placement = getSelectedPlacement();
  const image = placement ? getImage(placement.imageId) : null;
  const hasSelection = Boolean(placement && image);

  els.selectedPlacementName.textContent = hasSelection
    ? `${image.name} (${placement.colSpan}x${placement.rowSpan})`
    : "No placement selected";

  for (const control of [
    els.cropScaleInput,
    els.cropXInput,
    els.cropYInput,
    els.cropRotateInput,
    els.resetCropButton,
    els.deletePlacementButton,
  ]) {
    control.disabled = !hasSelection;
  }

  if (!hasSelection) {
    els.cropScaleInput.value = DEFAULT_CROP.scale;
    els.cropXInput.value = DEFAULT_CROP.x;
    els.cropYInput.value = DEFAULT_CROP.y;
    els.cropRotateInput.value = DEFAULT_CROP.rotate;
    return;
  }

  const crop = normalizeCrop(placement.crop);
  els.cropScaleInput.value = crop.scale;
  els.cropXInput.value = crop.x;
  els.cropYInput.value = crop.y;
  els.cropRotateInput.value = crop.rotate;
}

function getSelectedSpan() {
  if (els.spanSelect.value !== "custom") {
    return SPAN_PRESETS[els.spanSelect.value] || SPAN_PRESETS["1x1"];
  }

  return {
    colSpan: clampInteger(els.customSpanColsInput.value, 1, 8, 1),
    rowSpan: clampInteger(els.customSpanRowsInput.value, 1, 8, 1),
  };
}

function placePendingImage(pageId, row, col) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page) return;
  const grid = getProjectGrid();
  state.currentPageId = page.id;

  if (!state.pendingImagePlacement) {
    state.selectedPlacementId = null;
    saveProject("Page selected");
    renderAll();
    setStatus("Choose an image to place first");
    return;
  }

  const nextPlacement = {
    id: createId(),
    imageId: state.pendingImagePlacement.imageId,
    row,
    col,
    rowSpan: state.pendingImagePlacement.rowSpan,
    colSpan: state.pendingImagePlacement.colSpan,
    crop: normalizeCrop(state.pendingImagePlacement.crop),
  };

  if (!placementFits(nextPlacement, grid.rows, grid.cols)) {
    setStatus("Span exceeds grid bounds");
    return;
  }

  // Placements are grid rectangles. New rectangles must fit the page and either avoid
  // overlap or replace the existing overlapping rectangles after confirmation.
  const overlapping = page.placements.filter((placement) => placementsOverlap(placement, nextPlacement));
  if (
    overlapping.length &&
    !window.confirm(`Replace ${overlapping.length} overlapping placement${overlapping.length > 1 ? "s" : ""}?`)
  ) {
    return;
  }

  page.placements = page.placements.filter((placement) => !placementsOverlap(placement, nextPlacement));
  page.placements.push(nextPlacement);
  state.selectedPlacementId = nextPlacement.id;
  state.pendingImagePlacement = null;
  saveProject("Image placed");
  renderAll();
}

function placementFits(placement, rows, cols) {
  return (
    placement.row >= 0 &&
    placement.col >= 0 &&
    placement.row + placement.rowSpan <= rows &&
    placement.col + placement.colSpan <= cols
  );
}

function placementsOverlap(a, b) {
  return (
    a.col < b.col + b.colSpan &&
    a.col + a.colSpan > b.col &&
    a.row < b.row + b.rowSpan &&
    a.row + a.rowSpan > b.row
  );
}

function copySelectedPlacement(mode = "copy") {
  const page = getCurrentPage();
  const placement = getSelectedPlacement();
  const asset = placement ? getImage(placement.imageId) : null;
  if (!page || !placement || !asset) {
    setStatus("Select a placed card first");
    return false;
  }

  state.placementClipboard = {
    mode,
    sourcePageId: page.id,
    sourcePlacementId: placement.id,
    assetName: asset.name,
    placement: {
      imageId: placement.imageId,
      rowSpan: placement.rowSpan,
      colSpan: placement.colSpan,
      crop: normalizeCrop(placement.crop),
    },
  };
  setStatus(`${mode === "cut" ? "Cut" : "Copied"} ${asset.name}. Click a target slot to paste.`);
  renderCardInsertPrompt();
  return true;
}

function pastePlacementClipboard(pageId, row, col) {
  const clipboard = state.placementClipboard;
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  const asset = clipboard ? getImage(clipboard.placement.imageId) : null;
  if (!clipboard || !page || !asset) {
    setStatus("Nothing to paste");
    return false;
  }

  const grid = getProjectGrid();
  const nextPlacement = {
    id: createId(),
    imageId: clipboard.placement.imageId,
    row,
    col,
    rowSpan: clipboard.placement.rowSpan,
    colSpan: clipboard.placement.colSpan,
    crop: normalizeCrop(clipboard.placement.crop),
  };

  if (!placementFits(nextPlacement, grid.rows, grid.cols)) {
    setStatus("Pasted item exceeds grid bounds");
    return false;
  }

  const overlapping = page.placements.filter((placement) => {
    const isCutSource =
      clipboard.mode === "cut" &&
      clipboard.sourcePageId === page.id &&
      clipboard.sourcePlacementId === placement.id;
    return !isCutSource && placementsOverlap(placement, nextPlacement);
  });

  if (
    overlapping.length &&
    !window.confirm(`Replace ${overlapping.length} overlapping placement${overlapping.length > 1 ? "s" : ""}?`)
  ) {
    return false;
  }

  if (clipboard.mode === "cut") {
    const sourcePage = state.project.pages.find((candidate) => candidate.id === clipboard.sourcePageId);
    if (sourcePage) {
      sourcePage.placements = sourcePage.placements.filter(
        (placement) => placement.id !== clipboard.sourcePlacementId,
      );
    }
  }

  page.placements = page.placements.filter((placement) => !placementsOverlap(placement, nextPlacement));
  page.placements.push(nextPlacement);
  state.currentPageId = page.id;
  state.selectedPlacementId = nextPlacement.id;
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  saveProject(`${clipboard.mode === "cut" ? "Moved" : "Pasted"} ${asset.name}`);
  renderAll();
  return true;
}

function updateSelectedCrop(key, value) {
  const placement = getSelectedPlacement();
  if (!placement) return;

  const nextCrop = {
    ...normalizeCrop(placement.crop),
    [key]: key === "rotate" ? Number(value) : Number(value),
  };
  placement.crop = normalizeCrop(nextCrop);
  saveProject();
  renderBinder();
}

function getAssetKind(asset) {
  return state.project.cards.some((card) => card.id === asset?.id) ? "card" : "image";
}

function deletePlacement(pageId, placementId, { confirmDelete = true } = {}) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  const placement = page?.placements.find((candidate) => candidate.id === placementId);
  if (!page || !placement) return false;

  const asset = getImage(placement.imageId);
  const assetKind = getAssetKind(asset);
  if (
    confirmDelete &&
    !window.confirm(`Delete this ${assetKind} from the layout? The asset stays in your library.`)
  ) {
    return false;
  }

  page.placements = page.placements.filter((candidate) => candidate.id !== placement.id);
  if (state.selectedPlacementId === placement.id) {
    state.selectedPlacementId = null;
  }
  state.currentPageId = page.id;
  saveProject(`${assetKind === "card" ? "Card" : "Image"} deleted from layout`);
  renderAll();
  return true;
}

function deleteSelectedPlacement() {
  const page = getCurrentPage();
  if (!page || !state.selectedPlacementId) return;

  deletePlacement(page.id, state.selectedPlacementId);
}

async function importImageFiles(files, fallbackName = "image") {
  const imageFiles = files.filter((file) => file?.type?.startsWith("image/"));
  if (!imageFiles.length) {
    setStatus("No image files found");
    return;
  }

  const importItems = [];
  for (const file of imageFiles) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const fallbackIndex = state.project.images.length + state.imageImportItems.length + importItems.length + 1;
      importItems.push({
        originalName: file.name || `${fallbackName}-${fallbackIndex}.png`,
        name: stripImageExtension(file.name) || titleCaseFallbackName(fallbackName, fallbackIndex),
        dataUrl,
      });
    } catch (error) {
      console.warn("Could not import image.", error);
    }
  }

  if (!importItems.length) {
    setStatus("Image import failed");
    return;
  }

  state.imageImportItems.push(...importItems);
  if (state.imageImportItems.length === importItems.length) {
    state.imageImportIndex = 0;
  }
  setStatus(`${importItems.length} image${importItems.length > 1 ? "s" : ""} ready to rename`);
  renderAll();
}

function getCurrentImageImportItem() {
  return state.imageImportItems[state.imageImportIndex] || null;
}

function renderImageImportWizard() {
  const item = getCurrentImageImportItem();
  els.imageImportWizard.hidden = !item;
  if (!item) {
    return;
  }

  els.imageImportCount.textContent = `Image ${state.imageImportIndex + 1} of ${state.imageImportItems.length}`;
  els.imageImportPreview.src = item.dataUrl;
  els.imageImportPreview.alt = item.name || item.originalName;
  if (document.activeElement !== els.imageImportNameInput) {
    els.imageImportNameInput.value = item.name;
  }
  window.setTimeout(() => {
    if (!els.imageImportWizard.hidden && document.activeElement !== els.imageImportNameInput) {
      els.imageImportNameInput.focus();
      els.imageImportNameInput.select();
    }
  }, 0);
}

function importCurrentWizardImage() {
  const item = getCurrentImageImportItem();
  if (!item) return;

  const image = {
    id: createId(),
    name: (item.name || "").trim() || stripImageExtension(item.originalName) || "Imported Image",
    dataUrl: item.dataUrl,
    source: "upload",
  };

  state.project.images.push(image);
  state.selectedImageId = image.id;
  saveProject(`Imported ${image.name}`);
  advanceImageImportWizard();
}

function advanceImageImportWizard() {
  if (!state.imageImportItems.length) return;

  state.imageImportItems.splice(state.imageImportIndex, 1);
  if (state.imageImportIndex >= state.imageImportItems.length) {
    state.imageImportIndex = 0;
  }
  renderAll();
}

function cancelImageImportWizard() {
  state.imageImportItems = [];
  state.imageImportIndex = 0;
  setStatus("Image import cancelled");
  renderAll();
}

function stripImageExtension(name = "") {
  return name.replace(/\.[a-z0-9]+$/i, "").trim();
}

function titleCaseFallbackName(name, index) {
  const base = name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${base || "Image"} ${index}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function exportProjectJson() {
  const blob = new Blob([JSON.stringify(state.project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(state.project.name || "michi-binder")}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus("Project JSON exported");
}

async function importProjectJson() {
  const file = els.importJsonInput.files?.[0];
  els.importJsonInput.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    const nextProject = normalizeProject(JSON.parse(text));
    nextProject.setupComplete = true;
    if (!window.confirm("Replace the current project with this JSON file?")) {
      return;
    }

    state.project = nextProject;
    state.currentPageId = state.project.pages[0].id;
    state.selectedImageId = state.project.images[0]?.id || null;
    state.selectedCardId = state.project.cards[0]?.id || null;
    state.selectedPlacementId = null;
    saveProject("Project imported");
    renderAll();
  } catch (error) {
    console.warn("Could not import project JSON.", error);
    setStatus("Project JSON import failed");
  }
}

async function exportCurrentPagePng() {
  const pages = getCurrentSpreadPages();
  if (!pages.length) return;

  els.exportPngButton.disabled = true;
  setStatus("Rendering PNG");

  try {
    const canvas = await renderSpreadToCanvas(pages);
    const url = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(getSpreadExportName(pages))}.png`;
    anchor.click();
    setStatus("View PNG exported");
  } catch (error) {
    console.warn("Could not export PNG.", error);
    setStatus("View PNG export failed");
  } finally {
    els.exportPngButton.disabled = false;
  }
}

function getSpreadExportName(pages) {
  if (pages.length === 1) {
    return pages[0].title || "binder-page-1";
  }
  return `pages-${pages.map((page) => getPageNumber(page)).join("-")}`;
}

async function renderSpreadToCanvas(pages) {
  const grid = getProjectGrid();
  const slotWidth = 180;
  const slotHeight = slotWidth / CARD_ASPECT;
  const gap = 10;
  const padding = 28;
  const outerPadding = 28;
  const spreadGap = 26;
  const titleHeight = 68;
  const spineWidth = 28;
  const spineGap = 18;
  const gridWidth = grid.cols * slotWidth + (grid.cols - 1) * gap;
  const gridHeight = grid.rows * slotHeight + (grid.rows - 1) * gap;
  const pageWidth = Math.round(padding * 2 + spineWidth + spineGap + gridWidth);
  const pageHeight = Math.round(titleHeight + padding * 2 + gridHeight);
  const canvasWidth = Math.round(outerPadding * 2 + pages.length * pageWidth + (pages.length - 1) * spreadGap);
  const canvasHeight = Math.round(outerPadding * 2 + pageHeight);
  const scale = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(canvasWidth * scale);
  canvas.height = Math.round(canvasHeight * scale);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f7f5ef";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const imageCache = new Map();
  for (const [index, page] of pages.entries()) {
    const x = outerPadding + index * (pageWidth + spreadGap);
    await drawPageToCanvas(ctx, page, x, outerPadding, {
      rows: grid.rows,
      cols: grid.cols,
      pageWidth,
      pageHeight,
      slotWidth,
      slotHeight,
      gap,
      padding,
      titleHeight,
      spineWidth,
      spineGap,
      gridWidth,
      gridHeight,
    }, imageCache);
  }

  return canvas;
}

async function drawPageToCanvas(ctx, page, pageX, pageY, metrics, imageCache) {
  const {
    rows,
    cols,
    pageWidth,
    slotWidth,
    slotHeight,
    gap,
    padding,
    titleHeight,
    spineWidth,
    spineGap,
    gridHeight,
  } = metrics;
  const pageNumber = getPageNumber(page);
  const spineOnRight = pageNumber > 1 && pageNumber % 2 === 0;

  ctx.fillStyle = "#20242a";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapCanvasText(ctx, `Page ${pageNumber}: ${page.title || `Page ${pageNumber}`}`, pageX + pageWidth / 2, pageY + titleHeight / 2, pageWidth - 28, 32);

  const sheetX = pageX;
  const sheetY = pageY + titleHeight;
  const sheetWidth = pageWidth;
  const sheetHeight = gridHeight + padding * 2;
  roundRectPath(ctx, sheetX, sheetY, sheetWidth, sheetHeight, 10);
  ctx.fillStyle = "#0d0f12";
  ctx.fill();
  ctx.strokeStyle = "#2c3035";
  ctx.lineWidth = 1;
  ctx.stroke();

  const spineX = spineOnRight
    ? sheetX + sheetWidth - padding / 2 - spineWidth
    : sheetX + padding / 2;
  const spineCenterX = spineX + spineWidth / 2;
  const gridX = spineOnRight
    ? sheetX + padding
    : sheetX + padding + spineWidth + spineGap;
  const gridY = sheetY + padding;

  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  if (spineOnRight) {
    ctx.fillRect(sheetX + sheetWidth - spineWidth - padding - spineGap, sheetY + 1, spineWidth + padding + spineGap - 1, sheetHeight - 2);
  } else {
    ctx.fillRect(sheetX + 1, sheetY + 1, spineWidth + padding + spineGap, sheetHeight - 2);
  }

  for (const ratio of [0.22, 0.5, 0.78]) {
    ctx.beginPath();
    ctx.arc(spineCenterX, sheetY + sheetHeight * ratio, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = "#15181d";
    ctx.fill();
    ctx.strokeStyle = "#3c424a";
    ctx.stroke();
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = gridX + col * (slotWidth + gap);
      const y = gridY + row * (slotHeight + gap);
      drawPocket(ctx, x, y, slotWidth, slotHeight);
    }
  }

  for (const placement of page.placements) {
    const image = getImage(placement.imageId);
    if (!image) continue;
    if (!imageCache.has(image.id)) {
      imageCache.set(image.id, await loadCanvasImage(image.dataUrl));
    }

    const x = gridX + placement.col * (slotWidth + gap);
    const y = gridY + placement.row * (slotHeight + gap);
    const width = placement.colSpan * slotWidth + (placement.colSpan - 1) * gap;
    const height = placement.rowSpan * slotHeight + (placement.rowSpan - 1) * gap;
    drawPlacement(ctx, imageCache.get(image.id), placement.crop, x, y, width, height);
  }
}

function drawPocket(ctx, x, y, width, height) {
  roundRectPath(ctx, x, y, width, height, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.075)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPlacement(ctx, image, crop, x, y, width, height) {
  const safeCrop = normalizeCrop(crop);
  roundRectPath(ctx, x, y, width, height, 7);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#ece7dc";
  ctx.fillRect(x, y, width, height);

  // The PNG exporter mirrors the browser preview by drawing a cover-fit image into
  // a clipped slot rectangle, then applying the saved zoom/position/rotation.
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (imageRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
  }

  ctx.translate(x + width / 2 + (safeCrop.x / 100) * width, y + height / 2 + (safeCrop.y / 100) * height);
  ctx.rotate((safeCrop.rotate * Math.PI) / 180);
  ctx.scale(safeCrop.scale, safeCrop.scale);
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  roundRectPath(ctx, x, y, width, height, 7);
  ctx.strokeStyle = "rgba(55, 61, 67, 0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, centerX, centerY, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const totalHeight = (lines.length - 1) * lineHeight;
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, centerY - totalHeight / 2 + index * lineHeight);
  });
}

function safeFileName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "michi-binder";
}
