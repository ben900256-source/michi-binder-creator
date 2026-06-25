const STORAGE_KEY = "michiBinderCreator.project.v1";
const CURRENT_PAGE_KEY = "michiBinderCreator.currentPageId.v1";
const TCGDEX_CARDS_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const INDEXED_DB_NAME = "michiBinderCreator";
const INDEXED_DB_STORE = "projects";
const INDEXED_DB_CURRENT_PROJECT_ID = "current";
const SIDEBAR_WIDTH_KEY = "michiBinderCreator.sidebarWidth.v1";
const EXPORT_SETTINGS_KEY = "michiBinderCreator.exportSettings.v1";
const MOBILE_WARNING_DISMISSED_KEY = "michiBinderCreator.mobileWarningDismissed.v1";
const LOCAL_PROJECT_HINT_KEY = "michiBinderCreator.hasLocalProject.v1";
const LOCAL_STORAGE_PROJECT_MAX_CHARS = 4_500_000;
const STORAGE_DIAGNOSTICS_ENABLED = false;
const BINDER_ZOOM_MIN = 0.05;
const BINDER_ZOOM_MAX = 2;
const BINDER_WHEEL_ZOOM_SENSITIVITY = 0.001;
const SIDEBAR_WIDTH_MIN = 240;
const SIDEBAR_WIDTH_MAX = 560;
const DEFAULT_PROJECT_LAYOUT = {
  pocketWidth: 67,
  pocketHeight: 92,
  gapX: 3.5,
  gapY: 3.5,
};
const PROJECT_LAYOUT_PRESETS = {
  standard: {
    pocketWidth: DEFAULT_PROJECT_LAYOUT.pocketWidth,
    pocketHeight: DEFAULT_PROJECT_LAYOUT.pocketHeight,
  },
  toploader: {
    pocketWidth: 86,
    pocketHeight: 110,
  },
};
const CUSTOM_PROJECT_LAYOUT_PRESET = "custom";
const PDF_PAGE_WIDTH_MM = 215.9;
const PDF_PAGE_HEIGHT_MM = 279.4;
const PDF_MARGIN_MM = 10;
const PDF_CUTOUT_SPACING_MM = 4;
const PDF_LABEL_HEIGHT_MM = 6;
const PDF_LABEL_GAP_MM = 1.5;
const PDF_IMAGE_PX_PER_MM = 6;
const PDF_POINTS_PER_MM = 72 / 25.4;
const CARD_SEARCH_PAGE_SIZE = 24;
const PROJECT_HISTORY_MAX_DEPTH = 50;
const CARD_FACE_WIDTH_MM = 63;
const CARD_FACE_HEIGHT_MM = 88;

const DEFAULT_CROP = {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
};

const DEFAULT_EXPORT_SETTINGS = {
  png: {
    includePageTitles: true,
    printNeededCardsGreyscale: true,
  },
  pdf: {
    pageRange: "",
    includePageTitles: true,
    includeAllCards: false,
    includeNeededCards: true,
    printNeededCardsGreyscale: true,
  },
};

// One project object drives the app. Large project data is loaded asynchronously from IndexedDB.
const state = {
  project: createDefaultProject(),
  startupPhase: "loading",
  startupError: null,
  currentPageId: getLocalStorageItem(CURRENT_PAGE_KEY),
  lastModifiedPageId: getLocalStorageItem(CURRENT_PAGE_KEY),
  lastPlacedAssetId: null,
  selectedImageId: null,
  selectedCardId: null,
  selectedPlacementId: null,
  setupInitialized: false,
  projectSetupRequested: !hasStoredProjectHint(),
  cardSearchResults: [],
  cardSearchLoading: false,
  cardSearchQuery: "",
  cardSearchPage: 0,
  cardSearchHasMore: false,
  cardInsertSearchResults: [],
  cardInsertSearchLoading: false,
  cardInsertSearchQuery: "",
  cardInsertSearchPage: 0,
  cardInsertSearchHasMore: false,
  pageSearchQuery: "",
  imageSearchQuery: "",
  imageImportItems: [],
  imageImportIndex: 0,
  imageFileImportQueue: Promise.resolve(),
  imageImportSavePromise: null,
  imageImportSaving: false,
  pendingCardSlot: null,
  placementClipboard: null,
  draggedCardResult: null,
  draggedCardAssetId: null,
  draggedCardPreviewAsset: null,
  imagePlacementDraft: null,
  pendingImagePlacement: null,
  imageOverlapChoiceResolver: null,
  imageNaturalSizes: new Map(),
  imageNaturalSizeLoads: new Set(),
  imagePlacementPanGesture: null,
  localProjectChoices: [],
  hoveredSlot: null,
  binderZoom: 1,
  fitToDisplay: true,
  centerBinder: true,
  exportSettings: loadExportSettings(),
  sidebarWidth: clampInteger(getLocalStorageItem(SIDEBAR_WIDTH_KEY), SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX, 320),
  sidebarResizeGesture: null,
  binderPanX: 0,
  binderPanY: 0,
  binderPointers: new Map(),
  binderGesture: null,
  suppressNextBinderClick: false,
  renderFrameId: null,
  pendingRenderRegions: new Set(),
  binderMeasureFrameId: null,
  indexedDbSavedAt: null,
  indexedDbSavePending: false,
  indexedDbSaveInFlight: false,
  indexedDbSavePromise: null,
  indexedDbSaveRequest: null,
  projectPersistenceToken: 0,
  projectRevision: 0,
  savedRevision: 0,
  legacyLocalStorageProjectPending: false,
  indexedDbLastError: null,
  tcgdexCardStorageSlimmingPending: false,
  tcgdexCardImportPromises: new Map(),
  tcgdexCardImportQueue: Promise.resolve(),
  projectHistory: {
    undoStack: [],
    redoStack: [],
    lastRecord: null,
    coalesceKey: null,
  },
};

const els = {
  mobileWarning: document.querySelector("#mobileWarning"),
  mobileWarningCloseButton: document.querySelector("#mobileWarningCloseButton"),
  projectNameInput: document.querySelector("#projectNameInput"),
  undoProjectButton: document.querySelector("#undoProjectButton"),
  redoProjectButton: document.querySelector("#redoProjectButton"),
  projectSetup: document.querySelector("#projectSetup"),
  projectSetupForm: document.querySelector("#projectSetupForm"),
  setupProjectNameInput: document.querySelector("#setupProjectNameInput"),
  setupBinderPresetInput: document.querySelector("#setupBinderPresetInput"),
  setupRowsInput: document.querySelector("#setupRowsInput"),
  setupColsInput: document.querySelector("#setupColsInput"),
  setupPocketWidthInput: document.querySelector("#setupPocketWidthInput"),
  setupPocketHeightInput: document.querySelector("#setupPocketHeightInput"),
  setupGapXInput: document.querySelector("#setupGapXInput"),
  setupGapYInput: document.querySelector("#setupGapYInput"),
  projectBinderSummary: document.querySelector("#projectBinderSummary"),
  localSaveSummary: document.querySelector("#localSaveSummary"),
  imageImportWizard: document.querySelector("#imageImportWizard"),
  imageImportForm: document.querySelector("#imageImportForm"),
  imageImportCount: document.querySelector("#imageImportCount"),
  imageImportPreview: document.querySelector("#imageImportPreview"),
  imageImportPreviewImage: document.querySelector("#imageImportPreviewImage"),
  imageImportNameInput: document.querySelector("#imageImportNameInput"),
  imageImportScaleInput: document.querySelector("#imageImportScaleInput"),
  imageImportXInput: document.querySelector("#imageImportXInput"),
  imageImportYInput: document.querySelector("#imageImportYInput"),
  imageImportRotateInput: document.querySelector("#imageImportRotateInput"),
  imageImportResetCropButton: document.querySelector("#imageImportResetCropButton"),
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
  imagePlacementResetCropButton: document.querySelector("#imagePlacementResetCropButton"),
  imagePlacementCancelButton: document.querySelector("#imagePlacementCancelButton"),
  imagePlacementStartButton: document.querySelector("#imagePlacementStartButton"),
  imageOverlapModal: document.querySelector("#imageOverlapModal"),
  imageOverlapText: document.querySelector("#imageOverlapText"),
  imageOverlapOverButton: document.querySelector("#imageOverlapOverButton"),
  imageOverlapUnderButton: document.querySelector("#imageOverlapUnderButton"),
  imageOverlapReplaceButton: document.querySelector("#imageOverlapReplaceButton"),
  imageOverlapCancelButton: document.querySelector("#imageOverlapCancelButton"),
  helpButton: document.querySelector("#helpButton"),
  helpModal: document.querySelector("#helpModal"),
  helpCloseButton: document.querySelector("#helpCloseButton"),
  cardArtModal: document.querySelector("#cardArtModal"),
  cardArtModalTitle: document.querySelector("#cardArtModalTitle"),
  cardArtModalImage: document.querySelector("#cardArtModalImage"),
  cardArtModalCloseButton: document.querySelector("#cardArtModalCloseButton"),
  localProjectPicker: document.querySelector("#localProjectPicker"),
  localProjectList: document.querySelector("#localProjectList"),
  localProjectNewButton: document.querySelector("#localProjectNewButton"),
  localProjectCloseButton: document.querySelector("#localProjectCloseButton"),
  projectMenuButton: document.querySelector("#projectMenuButton"),
  projectMenuModal: document.querySelector("#projectMenuModal"),
  projectMenuCloseButton: document.querySelector("#projectMenuCloseButton"),
  projectSettingsButton: document.querySelector("#projectSettingsButton"),
  projectSettingsModal: document.querySelector("#projectSettingsModal"),
  projectSettingsForm: document.querySelector("#projectSettingsForm"),
  projectSettingsCancelButton: document.querySelector("#projectSettingsCancelButton"),
  settingsBinderPresetInput: document.querySelector("#settingsBinderPresetInput"),
  settingsBinderWidthInput: document.querySelector("#settingsBinderWidthInput"),
  settingsBinderHeightInput: document.querySelector("#settingsBinderHeightInput"),
  settingsPocketWidthInput: document.querySelector("#settingsPocketWidthInput"),
  settingsPocketHeightInput: document.querySelector("#settingsPocketHeightInput"),
  settingsGapXInput: document.querySelector("#settingsGapXInput"),
  settingsGapYInput: document.querySelector("#settingsGapYInput"),
  newProjectButton: document.querySelector("#newProjectButton"),
  newPageButton: document.querySelector("#newPageButton"),
  deleteProjectButton: document.querySelector("#deleteProjectButton"),
  loadLocalButton: document.querySelector("#loadLocalButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  importJsonButton: document.querySelector("#importJsonButton"),
  importJsonInput: document.querySelector("#importJsonInput"),
  exportButton: document.querySelector("#exportButton"),
  exportSettingsModal: document.querySelector("#exportSettingsModal"),
  exportSettingsForm: document.querySelector("#exportSettingsForm"),
  exportSettingsCancelButton: document.querySelector("#exportSettingsCancelButton"),
  pngExportIncludeTitlesInput: document.querySelector("#pngExportIncludeTitlesInput"),
  pngExportNeededGreyscaleInput: document.querySelector("#pngExportNeededGreyscaleInput"),
  pdfExportPageRangeInput: document.querySelector("#pdfExportPageRangeInput"),
  pdfExportIncludeTitlesInput: document.querySelector("#pdfExportIncludeTitlesInput"),
  pdfExportIncludeAllCardsInput: document.querySelector("#pdfExportIncludeAllCardsInput"),
  pdfExportIncludeNeededCardsInput: document.querySelector("#pdfExportIncludeNeededCardsInput"),
  pdfExportNeededGreyscaleInput: document.querySelector("#pdfExportNeededGreyscaleInput"),
  exportPngButton: document.querySelector("#exportPngButton"),
  exportPdfButton: document.querySelector("#exportPdfButton"),
  statusText: document.querySelector("#statusText"),
  pageSearchInput: document.querySelector("#pageSearchInput"),
  pageList: document.querySelector("#pageList"),
  binderZoomInput: document.querySelector("#binderZoomInput"),
  binderZoomLabel: document.querySelector("#binderZoomLabel"),
  fitToDisplayInput: document.querySelector("#fitToDisplayInput"),
  centerBinderInput: document.querySelector("#centerBinderInput"),
  placementColsInput: document.querySelector("#placementColsInput"),
  placementRowsInput: document.querySelector("#placementRowsInput"),
  imageFileInput: document.querySelector("#imageFileInput"),
  imageSearchInput: document.querySelector("#imageSearchInput"),
  dropZone: document.querySelector("#dropZone"),
  imageLibrary: document.querySelector("#imageLibrary"),
  appShell: document.querySelector(".app-shell"),
  sidebarResizer: document.querySelector("#sidebarResizer"),
  workspace: document.querySelector(".workspace"),
  floatingViewControl: document.querySelector(".floating-view-control"),
  spreadCanvas: document.querySelector("#spreadCanvas"),
};

void bootApp();

async function bootApp() {
  ensureCurrentPage();
  state.lastPlacedAssetId = getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId || state.currentPageId);
  resetProjectHistory();
  bindEvents();
  renderAll();
  showMobileWarningIfNeeded();
  setStatus(state.projectSetupRequested ? "New project ready" : "Loading local project...");

  let hydrated = false;
  try {
    hydrated = await hydrateProjectFromIndexedDbIfNeeded();
    state.startupPhase = "ready";
    state.startupError = null;
  } catch (error) {
    console.error("Could not finish project startup.", error);
    state.startupPhase = "error";
    state.startupError = error;
    state.indexedDbLastError = error;
    hydrated = false;
  }

  if (!hydrated && !state.project.setupComplete) {
    state.projectSetupRequested = true;
    resetProjectHistory();
  }
  ensureCurrentPage();
  saveProjectMetadataToLocalStorage();
  scheduleRender("all");
  queueTcgdexCardStorageSlimming();
  if (state.startupPhase === "error") {
    setStatus("Local project load failed");
  } else {
    setStatus(hydrated ? "Loaded local project" : "New project ready");
  }
}

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
    id: createId(),
    name: "",
    rows: 3,
    cols: 3,
    layout: { ...DEFAULT_PROJECT_LAYOUT },
    setupComplete,
    localAutoSave: true,
    pages: [firstPage],
    cards: [],
    images: [],
  };
}

function loadLegacyLocalStorageProject() {
  const saved = getLocalStorageItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    return normalizeProject(JSON.parse(saved));
  } catch (error) {
    console.warn("Could not load saved binder project.", error);
    return null;
  }
}

function getLocalStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Could not read localStorage item "${key}".`, error);
    return null;
  }
}

function hasStoredProjectHint() {
  return getLocalStorageItem(LOCAL_PROJECT_HINT_KEY) === "1";
}

function loadExportSettings() {
  try {
    return normalizeExportSettings(JSON.parse(localStorage.getItem(EXPORT_SETTINGS_KEY) || "null"));
  } catch (error) {
    console.warn("Could not load export settings.", error);
    return normalizeExportSettings(null);
  }
}

function normalizeExportSettings(settings) {
  const legacySettings = settings && !settings.png && !settings.pdf ? settings : null;
  return {
    png: normalizePngExportSettings(settings?.png || legacySettings),
    pdf: normalizePdfExportSettings(settings?.pdf || legacySettings),
  };
}

function normalizePngExportSettings(settings) {
  return {
    includePageTitles: settings?.includePageTitles !== false,
    printNeededCardsGreyscale: settings?.printNeededCardsGreyscale !== false,
  };
}

function normalizePdfExportSettings(settings) {
  return {
    pageRange: typeof settings?.pageRange === "string" ? settings.pageRange : DEFAULT_EXPORT_SETTINGS.pdf.pageRange,
    includePageTitles: settings?.includePageTitles !== false,
    includeAllCards: settings?.includeAllCards === true,
    includeNeededCards: settings?.includeNeededCards !== false,
    printNeededCardsGreyscale: settings?.printNeededCardsGreyscale !== false,
  };
}

function persistExportSettings() {
  localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify(state.exportSettings));
}

function normalizeProject(input) {
  const fallback = createDefaultProject({ setupComplete: true });
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const legacyFirstPage = Array.isArray(input.pages) ? input.pages[0] : null;
  const rows = clampInteger(input.rows, 1, 8, clampInteger(legacyFirstPage?.rows, 1, 8, 3));
  const cols = clampInteger(input.cols, 1, 8, clampInteger(legacyFirstPage?.cols, 1, 8, 3));
  const layout = normalizeProjectLayout(input);

  const normalizedImages = Array.isArray(input.images)
    ? input.images
        .filter((image) => image && typeof image.dataUrl === "string")
        .map(normalizeAsset)
    : [];
  const migratedCards = normalizedImages.filter((image) => image.source === "tcgdex");
  const images = normalizedImages.filter((image) => image.source !== "tcgdex");
  const cards = dedupeAssetsById([
    ...(Array.isArray(input.cards)
      ? input.cards.filter((card) => card && hasAssetImage(card)).map(normalizeCardAsset)
      : []),
    ...migratedCards.map(normalizeCardAsset),
  ]);

  const assetIds = new Set([...images, ...cards].map((asset) => asset.id));
  const pages = Array.isArray(input.pages)
    ? input.pages.map((page, index) => normalizePage(page, assetIds, index, rows, cols))
    : [];

  return {
    id: typeof input.id === "string" ? input.id : createId(),
    name: typeof input.name === "string" ? input.name : "",
    rows,
    cols,
    layout,
    setupComplete: input.setupComplete === true,
    localAutoSave: true,
    pages: pages.length ? pages : fallback.pages,
    cards,
    images,
  };
}

function normalizeProjectLayout(input) {
  const layout = input?.layout && typeof input.layout === "object" ? input.layout : input;
  return {
    pocketWidth: clampNumber(layout?.pocketWidth, 10, 300, DEFAULT_PROJECT_LAYOUT.pocketWidth),
    pocketHeight: clampNumber(layout?.pocketHeight, 10, 300, DEFAULT_PROJECT_LAYOUT.pocketHeight),
    gapX: clampNumber(layout?.gapX, 0, 100, DEFAULT_PROJECT_LAYOUT.gapX),
    gapY: clampNumber(layout?.gapY, 0, 100, DEFAULT_PROJECT_LAYOUT.gapY),
  };
}

function normalizeAsset(asset) {
  const dataUrl = typeof asset.dataUrl === "string" && asset.dataUrl ? asset.dataUrl : undefined;
  const imageUrl = typeof asset.imageUrl === "string" && asset.imageUrl ? asset.imageUrl : undefined;
  return {
    id: typeof asset.id === "string" ? asset.id : createId(),
    name: typeof asset.name === "string" ? asset.name : "image",
    ...(dataUrl ? { dataUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
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
    owned: card.owned !== false,
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
    layer: normalizePlacementLayer(placement.layer),
  };
}

function normalizePlacementLayer(layer) {
  if (layer === null || layer === undefined || layer === "") {
    return null;
  }
  const parsed = Number(layer);
  return Number.isFinite(parsed) ? parsed : null;
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

  try {
    localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
  } catch (error) {
    console.warn("Could not save current page metadata.", error);
  }
}

function getProjectGrid() {
  return {
    rows: clampInteger(state.project.rows, 1, 8, 3),
    cols: clampInteger(state.project.cols, 1, 8, 3),
  };
}

function getProjectLayout() {
  return normalizeProjectLayout(state.project);
}

function getGridDimensions(grid, layout = getProjectLayout()) {
  return {
    width: grid.cols * layout.pocketWidth + Math.max(0, grid.cols - 1) * layout.gapX,
    height: grid.rows * layout.pocketHeight + Math.max(0, grid.rows - 1) * layout.gapY,
  };
}

function getPlacementDimensions(colSpan, rowSpan, layout = getProjectLayout()) {
  return {
    width: colSpan * layout.pocketWidth + Math.max(0, colSpan - 1) * layout.gapX,
    height: rowSpan * layout.pocketHeight + Math.max(0, rowSpan - 1) * layout.gapY,
  };
}

function getPlacementAspect(colSpan, rowSpan, layout = getProjectLayout()) {
  const dimensions = getPlacementDimensions(colSpan, rowSpan, layout);
  return dimensions.width / dimensions.height;
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

function getSpreadStartIndices(pageCount = state.project.pages.length) {
  if (pageCount <= 0) {
    return [];
  }

  const indices = [0];
  for (let index = 1; index < pageCount; index += 2) {
    indices.push(index);
  }
  return indices;
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

function setLastModifiedPageId(pageId) {
  if (state.project.pages.some((page) => page.id === pageId)) {
    state.lastModifiedPageId = pageId;
  }
}

function setLastPlacedAssetId(assetId) {
  if (getImage(assetId)) {
    state.lastPlacedAssetId = assetId;
  }
}

function selectPage(pageId, message = "Page selected") {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page || page.id === state.currentPageId) {
    return false;
  }

  state.currentPageId = page.id;
  state.selectedPlacementId = null;
  saveProject(message);
  renderAll();
  return true;
}

function cycleCurrentSpread(direction) {
  const pages = state.project.pages;
  const spreadStartIndices = getSpreadStartIndices(pages.length);
  if (spreadStartIndices.length < 2) {
    return false;
  }

  const currentSpreadStart = getSpreadStartIndex();
  const currentSpreadIndex = Math.max(0, spreadStartIndices.indexOf(currentSpreadStart));
  const nextSpreadIndex = (currentSpreadIndex + direction + spreadStartIndices.length) % spreadStartIndices.length;
  const nextPage = pages[spreadStartIndices[nextSpreadIndex]];
  return selectPage(nextPage?.id, "Spread selected");
}

function addPage() {
  const page = createPage(`Page ${state.project.pages.length + 1}`);
  state.project.pages.push(page);
  state.currentPageId = page.id;
  state.selectedPlacementId = null;
  saveProject("Page created", { modifiedPageId: page.id });
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

  saveProject("Page deleted", { modifiedPageId: state.currentPageId });
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
  saveProject("Page renamed", { modifiedPageId: page.id });
  renderAll();
}

function resetTransientProjectState() {
  state.selectedImageId = null;
  state.selectedCardId = null;
  state.selectedPlacementId = null;
  state.setupInitialized = false;
  state.projectSetupRequested = false;
  state.cardSearchResults = [];
  state.cardSearchLoading = false;
  state.cardSearchQuery = "";
  state.cardSearchPage = 0;
  state.cardSearchHasMore = false;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  state.cardInsertSearchQuery = "";
  state.cardInsertSearchPage = 0;
  state.cardInsertSearchHasMore = false;
  state.imageSearchQuery = "";
  state.imageImportItems = [];
  state.imageImportIndex = 0;
  state.imageFileImportQueue = Promise.resolve();
  state.imageImportSavePromise = null;
  state.imageImportSaving = false;
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  state.draggedCardResult = null;
  state.draggedCardAssetId = null;
  state.draggedCardPreviewAsset = null;
  state.imagePlacementDraft = null;
  state.pendingImagePlacement = null;
  state.imageOverlapChoiceResolver = null;
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
  state.tcgdexCardStorageSlimmingPending = false;
  state.tcgdexCardImportPromises.clear();
  state.tcgdexCardImportQueue = Promise.resolve();
}

function resetProjectPersistenceState({ savedAt = null } = {}) {
  state.projectPersistenceToken += 1;
  state.projectRevision = 0;
  state.savedRevision = 0;
  state.indexedDbSavePending = false;
  state.indexedDbSaveInFlight = false;
  state.indexedDbSavePromise = null;
  state.indexedDbSaveRequest = null;
  state.indexedDbSavedAt = savedAt;
  state.indexedDbLastError = null;
}

function ensureProjectId(project = state.project) {
  if (!project.id || project.id === INDEXED_DB_CURRENT_PROJECT_ID) {
    project.id = createId();
  }
  return project.id;
}

function startNewProject({ confirm = true } = {}) {
  if (confirm && !window.confirm("Create a new project? Export JSON first if you need a separate backup.")) {
    return;
  }

  state.project = createDefaultProject();
  state.currentPageId = state.project.pages[0].id;
  state.lastModifiedPageId = state.currentPageId;
  state.lastPlacedAssetId = null;
  resetTransientProjectState();
  resetProjectPersistenceState();
  state.projectSetupRequested = true;
  saveProject("New project ready", { resetHistory: true });
  renderAll();
}

async function deleteProject() {
  if (!window.confirm("Delete the whole project? This clears the current project and saved local copy.")) {
    return;
  }

  let localDeleteFailed = false;
  try {
    const db = await openProjectDatabase();
    if (state.project.id) {
      await deleteIndexedDbRecord(db, state.project.id);
    }
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
  state.lastModifiedPageId = state.currentPageId;
  state.lastPlacedAssetId = null;
  resetTransientProjectState();
  resetProjectPersistenceState();
  saveProject(localDeleteFailed ? "Project deleted; local save delete failed" : "Project deleted", {
    resetHistory: true,
  });
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

function getAssetImageSrc(asset) {
  if (typeof asset?.imageUrl === "string" && asset.imageUrl) {
    return asset.imageUrl;
  }
  if (typeof asset?.dataUrl === "string" && asset.dataUrl) {
    return asset.dataUrl;
  }
  return "";
}

function hasAssetImage(asset) {
  return Boolean(getAssetImageSrc(asset));
}

function getSelectedPlacement() {
  const page = getCurrentPage();
  return page?.placements.find((placement) => placement.id === state.selectedPlacementId) || null;
}

function createProjectHistoryRecord() {
  const project = normalizeProject(JSON.parse(JSON.stringify(state.project)));
  return {
    projectJson: JSON.stringify(project),
    currentPageId: state.currentPageId,
    lastModifiedPageId: state.lastModifiedPageId,
    lastPlacedAssetId: state.lastPlacedAssetId,
  };
}

function resetProjectHistory() {
  state.projectHistory.undoStack = [];
  state.projectHistory.redoStack = [];
  state.projectHistory.coalesceKey = null;
  state.projectHistory.lastRecord = createProjectHistoryRecord();
  renderProjectHistoryControls();
}

function pushProjectHistoryRecord(stack, record) {
  stack.push(record);
  if (stack.length > PROJECT_HISTORY_MAX_DEPTH) {
    stack.splice(0, stack.length - PROJECT_HISTORY_MAX_DEPTH);
  }
}

function recordProjectHistoryForSave({ coalesceKey = null } = {}) {
  const nextRecord = createProjectHistoryRecord();
  const previousRecord = state.projectHistory.lastRecord;
  if (!previousRecord) {
    state.projectHistory.lastRecord = nextRecord;
    state.projectHistory.coalesceKey = coalesceKey;
    renderProjectHistoryControls();
    return;
  }

  if (nextRecord.projectJson === previousRecord.projectJson) {
    state.projectHistory.lastRecord = nextRecord;
    if (!coalesceKey) {
      state.projectHistory.coalesceKey = null;
    }
    renderProjectHistoryControls();
    return;
  }

  const shouldCoalesce = coalesceKey && state.projectHistory.coalesceKey === coalesceKey;
  let nextCoalesceKey = coalesceKey;
  if (shouldCoalesce) {
    const coalesceBaseRecord = state.projectHistory.undoStack[state.projectHistory.undoStack.length - 1];
    if (coalesceBaseRecord?.projectJson === nextRecord.projectJson) {
      state.projectHistory.undoStack.pop();
      nextCoalesceKey = null;
    }
  } else {
    pushProjectHistoryRecord(state.projectHistory.undoStack, previousRecord);
  }

  state.projectHistory.redoStack = [];
  state.projectHistory.coalesceKey = nextCoalesceKey;
  state.projectHistory.lastRecord = nextRecord;
  renderProjectHistoryControls();
}

function endProjectHistoryCoalescing() {
  state.projectHistory.coalesceKey = null;
}

function canUndoProjectChange() {
  return state.projectHistory.undoStack.length > 0;
}

function canRedoProjectChange() {
  return state.projectHistory.redoStack.length > 0;
}

function isOverlayOpen(element) {
  return element && !element.hidden;
}

function hasBlockingOverlayOpen() {
  return [
    els.projectSetup,
    els.imageImportWizard,
    els.cardInsertPrompt,
    els.imagePlacementModal,
    els.imageOverlapModal,
    els.projectMenuModal,
    els.projectSettingsModal,
    els.helpModal,
    els.cardArtModal,
    els.localProjectPicker,
    els.exportSettingsModal,
  ].some(isOverlayOpen);
}

function renderProjectHistoryControls() {
  if (els.undoProjectButton) {
    els.undoProjectButton.disabled = !canUndoProjectChange();
  }
  if (els.redoProjectButton) {
    els.redoProjectButton.disabled = !canRedoProjectChange();
  }
}

function clearProjectHistoryTransientState() {
  if (state.imageOverlapChoiceResolver) {
    resolveImageOverlapChoice("cancel");
  } else if (els.imageOverlapModal) {
    els.imageOverlapModal.hidden = true;
  }

  state.selectedPlacementId = null;
  state.pendingCardSlot = null;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  state.cardInsertSearchQuery = "";
  state.cardInsertSearchPage = 0;
  state.cardInsertSearchHasMore = false;
  state.placementClipboard = null;
  state.draggedCardResult = null;
  state.draggedCardAssetId = null;
  state.draggedCardPreviewAsset = null;
  state.imagePlacementDraft = null;
  state.pendingImagePlacement = null;
  state.hoveredSlot = null;
  if (els.cardInsertSearchInput) {
    els.cardInsertSearchInput.value = "";
  }
  if (els.cardInsertSearchStatus) {
    els.cardInsertSearchStatus.textContent = "";
  }
}

function restoreProjectHistoryRecord(record, message) {
  try {
    const restoredProject = normalizeProject(JSON.parse(record.projectJson));
    state.project = restoredProject;
    state.currentPageId = restoredProject.pages.some((page) => page.id === record.currentPageId)
      ? record.currentPageId
      : restoredProject.pages[0]?.id || null;
    state.lastModifiedPageId = restoredProject.pages.some((page) => page.id === record.lastModifiedPageId)
      ? record.lastModifiedPageId
      : state.currentPageId;
    state.lastPlacedAssetId = getImage(record.lastPlacedAssetId)
      ? record.lastPlacedAssetId
      : getInferredLastPlacedAssetId(restoredProject, state.lastModifiedPageId);
    clearProjectHistoryTransientState();
    markProjectChanged();
    saveProjectMetadataToLocalStorage();
    queueIndexedDbAutoSave();
    setStatus(message);
    renderAll();
    state.projectHistory.lastRecord = createProjectHistoryRecord();
    renderProjectHistoryControls();
  } catch (error) {
    console.warn("Could not restore project history.", error);
    setStatus("Project history restore failed");
  }
}

function undoProjectChange() {
  endProjectHistoryCoalescing();
  if (!canUndoProjectChange()) {
    return;
  }

  const currentRecord = createProjectHistoryRecord();
  const targetRecord = state.projectHistory.undoStack.pop();
  pushProjectHistoryRecord(state.projectHistory.redoStack, currentRecord);
  restoreProjectHistoryRecord(targetRecord, "Undid project change");
}

function redoProjectChange() {
  endProjectHistoryCoalescing();
  if (!canRedoProjectChange()) {
    return;
  }

  const currentRecord = createProjectHistoryRecord();
  const targetRecord = state.projectHistory.redoStack.pop();
  pushProjectHistoryRecord(state.projectHistory.undoStack, currentRecord);
  restoreProjectHistoryRecord(targetRecord, "Redid project change");
}

function saveProject(message = "Saved", options = {}) {
  ensureProjectId();
  if (options.modifiedPageId) {
    setLastModifiedPageId(options.modifiedPageId);
  }
  if (options.placedAssetId) {
    setLastPlacedAssetId(options.placedAssetId);
  }
  if (options.resetHistory) {
    resetProjectHistory();
  } else {
    recordProjectHistoryForSave({ coalesceKey: options.coalesceKey });
  }
  markProjectChanged();
  saveProjectMetadataToLocalStorage();
  setStatus(message);
  queueIndexedDbAutoSave();
  renderProjectHistoryControls();
}

function markProjectChanged() {
  state.projectRevision += 1;
  state.project.localAutoSave = true;
}

function saveProjectMetadataToLocalStorage() {
  try {
    ensureProjectId();
    if (!state.legacyLocalStorageProjectPending) {
      removeLegacyLocalStorageProject();
    }
    if (state.currentPageId) {
      localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
    } else {
      localStorage.removeItem(CURRENT_PAGE_KEY);
    }
    if (state.project.setupComplete) {
      localStorage.setItem(LOCAL_PROJECT_HINT_KEY, "1");
    } else {
      localStorage.removeItem(LOCAL_PROJECT_HINT_KEY);
    }
    return true;
  } catch (error) {
    console.warn("Could not save project metadata to localStorage.", error);
    return false;
  }
}

function removeLegacyLocalStorageProject() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not remove legacy localStorage project.", error);
  }
}

function getProjectEmbeddedDataUrlChars(project) {
  const assets = [
    ...(Array.isArray(project?.images) ? project.images : []),
    ...(Array.isArray(project?.cards) ? project.cards : []),
  ];

  return assets.reduce(
    (total, asset) => total + (typeof asset?.dataUrl === "string" ? asset.dataUrl.length : 0),
    0,
  );
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function isMobileViewport() {
  return (
    window.matchMedia("(max-width: 760px)").matches ||
    window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches
  );
}

function showMobileWarningIfNeeded() {
  if (!els.mobileWarning || sessionStorage.getItem(MOBILE_WARNING_DISMISSED_KEY) || !isMobileViewport()) {
    return;
  }

  els.mobileWarning.hidden = false;
  window.setTimeout(() => {
    els.mobileWarningCloseButton?.focus();
  }, 0);
}

function closeMobileWarning() {
  sessionStorage.setItem(MOBILE_WARNING_DISMISSED_KEY, "1");
  els.mobileWarning.hidden = true;
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

function openProjectSettingsModal() {
  const grid = getProjectGrid();
  const layout = getProjectLayout();
  syncProjectGridControls(
    {
      rows: els.settingsBinderHeightInput,
      cols: els.settingsBinderWidthInput,
    },
    grid,
  );
  syncProjectLayoutControls(
    {
      preset: els.settingsBinderPresetInput,
      pocketWidth: els.settingsPocketWidthInput,
      pocketHeight: els.settingsPocketHeightInput,
      gapX: els.settingsGapXInput,
      gapY: els.settingsGapYInput,
    },
    layout,
  );
  els.projectSettingsModal.hidden = false;
  window.setTimeout(() => {
    els.settingsBinderWidthInput.focus();
  }, 0);
}

function closeProjectSettingsModal() {
  els.projectSettingsModal.hidden = true;
}

function openExportSettingsModal() {
  syncExportSettingsControls();
  els.exportSettingsModal.hidden = false;
  window.setTimeout(() => {
    els.pngExportIncludeTitlesInput.focus();
  }, 0);
}

function closeExportSettingsModal() {
  els.exportSettingsModal.hidden = true;
}

function syncExportSettingsControls() {
  const settings = normalizeExportSettings(state.exportSettings);
  els.pngExportIncludeTitlesInput.checked = settings.png.includePageTitles;
  els.pngExportNeededGreyscaleInput.checked = settings.png.printNeededCardsGreyscale;
  els.pdfExportPageRangeInput.value = settings.pdf.pageRange;
  els.pdfExportIncludeTitlesInput.checked = settings.pdf.includePageTitles;
  els.pdfExportIncludeAllCardsInput.checked = settings.pdf.includeAllCards;
  els.pdfExportIncludeNeededCardsInput.checked = settings.pdf.includeNeededCards;
  els.pdfExportNeededGreyscaleInput.checked = settings.pdf.printNeededCardsGreyscale;
  updateExportSettingsControlState();
}

function saveExportSettingsFromControls({ closeModal = true, statusMessage = "Export settings saved" } = {}) {
  state.exportSettings = normalizeExportSettings({
    png: {
      includePageTitles: els.pngExportIncludeTitlesInput.checked,
      printNeededCardsGreyscale: els.pngExportNeededGreyscaleInput.checked,
    },
    pdf: {
      pageRange: els.pdfExportPageRangeInput.value.trim(),
      includePageTitles: els.pdfExportIncludeTitlesInput.checked,
      includeAllCards: els.pdfExportIncludeAllCardsInput.checked,
      includeNeededCards: els.pdfExportIncludeNeededCardsInput.checked,
      printNeededCardsGreyscale: els.pdfExportNeededGreyscaleInput.checked,
    },
  });
  persistExportSettings();
  if (closeModal) {
    closeExportSettingsModal();
  }
  if (statusMessage) {
    setStatus(statusMessage);
  }
}

function updateExportSettingsControlState() {
  els.pdfExportNeededGreyscaleInput.disabled =
    !els.pdfExportIncludeAllCardsInput.checked && !els.pdfExportIncludeNeededCardsInput.checked;
}

function getExportSettings() {
  state.exportSettings = normalizeExportSettings(state.exportSettings);
  return state.exportSettings;
}

function syncProjectGridControls(controls, grid = getProjectGrid()) {
  controls.rows.value = grid.rows;
  controls.cols.value = grid.cols;
}

function getProjectGridFromControls(controls) {
  return {
    rows: clampInteger(controls.rows.value, 1, 8, 3),
    cols: clampInteger(controls.cols.value, 1, 8, 3),
  };
}

function syncProjectLayoutControls(controls, layout = getProjectLayout()) {
  controls.pocketWidth.value = layout.pocketWidth;
  controls.pocketHeight.value = layout.pocketHeight;
  controls.gapX.value = layout.gapX;
  controls.gapY.value = layout.gapY;
  if (controls.preset) {
    controls.preset.value = getProjectLayoutPreset(layout);
  }
}

function getProjectLayoutFromControls(controls) {
  return normalizeProjectLayout({
    pocketWidth: controls.pocketWidth.value,
    pocketHeight: controls.pocketHeight.value,
    gapX: controls.gapX.value,
    gapY: controls.gapY.value,
  });
}

function getProjectLayoutPreset(layout = getProjectLayout()) {
  const normalizedLayout = normalizeProjectLayout(layout);
  const preset = Object.entries(PROJECT_LAYOUT_PRESETS).find(([, presetLayout]) =>
    layoutDimensionsMatchPreset(normalizedLayout, presetLayout),
  );
  return preset?.[0] || CUSTOM_PROJECT_LAYOUT_PRESET;
}

function layoutDimensionsMatchPreset(layout, presetLayout) {
  return (
    Math.abs(Number(layout.pocketWidth) - presetLayout.pocketWidth) < 0.05 &&
    Math.abs(Number(layout.pocketHeight) - presetLayout.pocketHeight) < 0.05
  );
}

function applyProjectLayoutPreset(controls) {
  const presetLayout = PROJECT_LAYOUT_PRESETS[controls.preset.value];
  if (!presetLayout) {
    return;
  }

  const currentLayout = getProjectLayoutFromControls(controls);
  syncProjectLayoutControls(controls, {
    ...currentLayout,
    pocketWidth: presetLayout.pocketWidth,
    pocketHeight: presetLayout.pocketHeight,
  });
  controls.preset.value = getProjectLayoutPreset(getProjectLayoutFromControls(controls));
}

function syncProjectLayoutPresetFromControls(controls) {
  controls.preset.value = getProjectLayoutPreset(getProjectLayoutFromControls(controls));
}

function bindProjectLayoutPresetControls(controls) {
  controls.preset.addEventListener("change", () => {
    applyProjectLayoutPreset(controls);
  });

  [controls.pocketWidth, controls.pocketHeight].forEach((input) => {
    input.addEventListener("input", () => {
      syncProjectLayoutPresetFromControls(controls);
    });
  });
}

function getExportPageSelection(settings = getExportSettings().png) {
  return parsePageRange(settings.pageRange, state.project.pages.length);
}

function parsePageRange(rangeText, totalPages) {
  const text = String(rangeText || "").trim();
  if (!text || text.toLowerCase() === "all") {
    return {
      pages: [...state.project.pages],
      pageIndexes: state.project.pages.map((_, index) => index),
      error: "",
    };
  }

  const pageIndexes = [];
  const seen = new Set();
  const tokens = text.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) {
    return { pages: [], pageIndexes: [], error: "Page range is empty" };
  }

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = token.match(/^\d+$/);
    let start;
    let end;

    if (rangeMatch) {
      start = Number(rangeMatch[1]);
      end = Number(rangeMatch[2]);
    } else if (singleMatch) {
      start = Number(token);
      end = start;
    } else {
      return { pages: [], pageIndexes: [], error: `Invalid page range: ${token}` };
    }

    if (start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
      return { pages: [], pageIndexes: [], error: `Page range must be between 1 and ${totalPages}` };
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      const pageIndex = pageNumber - 1;
      if (!seen.has(pageIndex)) {
        seen.add(pageIndex);
        pageIndexes.push(pageIndex);
      }
    }
  }

  return {
    pages: pageIndexes.map((pageIndex) => state.project.pages[pageIndex]).filter(Boolean),
    pageIndexes,
    error: "",
  };
}

function saveProjectSettings() {
  const { rows, cols } = getProjectGridFromControls({
    rows: els.settingsBinderHeightInput,
    cols: els.settingsBinderWidthInput,
  });
  const invalidPlacements = state.project.pages.flatMap((page) =>
    page.placements.filter((placement) => !placementFits(placement, rows, cols)),
  );

  if (
    invalidPlacements.length &&
    !window.confirm("This binder size will remove placements outside the new bounds. Continue?")
  ) {
    return;
  }

  state.project.rows = rows;
  state.project.cols = cols;
  state.project.layout = getProjectLayoutFromControls({
    pocketWidth: els.settingsPocketWidthInput,
    pocketHeight: els.settingsPocketHeightInput,
    gapX: els.settingsGapXInput,
    gapY: els.settingsGapYInput,
  });
  state.project.pages.forEach((page) => {
    page.placements = page.placements.filter((placement) => placementFits(placement, rows, cols));
  });
  if (!getSelectedPlacement()) {
    state.selectedPlacementId = null;
  }
  state.project.localAutoSave = true;
  closeProjectSettingsModal();
  saveProject("Project settings updated");
  renderAll();
}

function openHelpModal() {
  els.helpModal.hidden = false;
  window.setTimeout(() => {
    els.helpCloseButton.focus();
  }, 0);
}

function closeHelpModal() {
  els.helpModal.hidden = true;
}

function openCardArtModal(card) {
  const imageSrc = getAssetImageSrc(card);
  if (!imageSrc) {
    return;
  }

  els.cardArtModalTitle.textContent = card.name || "Card Art";
  els.cardArtModalImage.src = imageSrc;
  els.cardArtModalImage.alt = card.name || "Card art";
  els.cardArtModal.hidden = false;
  window.setTimeout(() => {
    els.cardArtModalCloseButton.focus();
  }, 0);
}

function closeCardArtModal() {
  els.cardArtModal.hidden = true;
  els.cardArtModalImage.removeAttribute("src");
  els.cardArtModalImage.alt = "";
}

function queueTcgdexCardStorageSlimming() {
  if (
    state.tcgdexCardStorageSlimmingPending ||
    !state.project.cards.some(shouldSlimTcgdexCardStorage)
  ) {
    return;
  }

  state.tcgdexCardStorageSlimmingPending = true;
  window.setTimeout(() => {
    void slimTcgdexCardStorage();
  }, 0);
}

function shouldSlimTcgdexCardStorage(card) {
  return card?.source === "tcgdex" && card.cardId && typeof card.dataUrl === "string";
}

async function slimTcgdexCardStorage() {
  let changed = false;
  try {
    for (const card of state.project.cards) {
      if (!shouldSlimTcgdexCardStorage(card)) {
        continue;
      }

      try {
        if (!card.imageUrl) {
          const cardDetail = await fetchTcgdexCardDetail(card.cardId);
          const imageUrl = getTcgdexCardImageUrl(cardDetail || card, "high", "png");
          if (!imageUrl) {
            continue;
          }
          card.imageUrl = imageUrl;
        }

        delete card.dataUrl;
        state.imageNaturalSizes.delete(card.id);
        changed = true;
      } catch (error) {
        console.warn("Could not slim TCGdex card storage.", error);
      }
    }

    if (changed) {
      markProjectChanged();
      saveProjectMetadataToLocalStorage();
      queueIndexedDbAutoSave();
      resetProjectHistory();
      renderAll();
    }
  } finally {
    state.tcgdexCardStorageSlimmingPending = false;
  }
}

function openLocalProjectPicker() {
  els.localProjectPicker.hidden = false;
  window.setTimeout(() => {
    els.localProjectList.querySelector("button")?.focus();
  }, 0);
}

function closeLocalProjectPicker() {
  els.localProjectPicker.hidden = true;
}

function getProjectQuickStats(project) {
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  const placements = pages.reduce(
    (count, page) => count + (Array.isArray(page?.placements) ? page.placements.length : 0),
    0,
  );
  return {
    pages: pages.length,
    placements,
    images: Array.isArray(project?.images) ? project.images.length : 0,
    cards: Array.isArray(project?.cards) ? project.cards.length : 0,
    rows: clampInteger(project?.rows, 1, 8, 3),
    cols: clampInteger(project?.cols, 1, 8, 3),
  };
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatProjectQuickStats(stats) {
  return [
    formatCount(stats.pages, "page"),
    formatCount(stats.placements, "placement"),
    formatCount(stats.images, "image"),
    formatCount(stats.cards, "card"),
    `${stats.rows}x${stats.cols}`,
  ].join(" | ");
}

function getProjectAssetMap(project) {
  const images = Array.isArray(project?.images) ? project.images : [];
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  return new Map([...images, ...cards].filter((asset) => asset?.id).map((asset) => [asset.id, asset]));
}

function getProjectCardAssetIds(project) {
  return new Set((Array.isArray(project?.cards) ? project.cards : []).map((card) => card.id).filter(Boolean));
}

function getInferredLastPlacedAssetId(project, preferredPageId = null) {
  const assetMap = getProjectAssetMap(project);
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  const preferredPage = pages.find((page) => page.id === preferredPageId);
  const orderedPages = preferredPage
    ? [preferredPage, ...pages.filter((page) => page !== preferredPage).reverse()]
    : pages.slice().reverse();

  for (const page of orderedPages) {
    const placements = Array.isArray(page?.placements) ? page.placements.slice().reverse() : [];
    const placement = placements.find((candidate) => hasAssetImage(assetMap.get(candidate?.imageId)));
    if (placement) {
      return placement.imageId;
    }
  }

  return null;
}

function getProjectLastPlacedAsset(project, lastPlacedAssetId = null, preferredPageId = null) {
  const assetMap = getProjectAssetMap(project);
  if (lastPlacedAssetId && hasAssetImage(assetMap.get(lastPlacedAssetId))) {
    return assetMap.get(lastPlacedAssetId);
  }

  const inferredAssetId = getInferredLastPlacedAssetId(project, preferredPageId);
  return inferredAssetId ? assetMap.get(inferredAssetId) || null : null;
}

function getLocalProjectPlacementLayer(placement, index, cardAssetIds) {
  const explicitLayer = normalizePlacementLayer(placement?.layer);
  if (explicitLayer !== null) {
    return explicitLayer;
  }
  return index + (cardAssetIds.has(placement?.imageId) ? 10000 : 0);
}

function getProjectPreviewPage(project, currentPageId = null) {
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  return pages.find((page) => page.id === currentPageId) || pages[0] || null;
}

function getProjectPreviewPageLabel(project, currentPageId = null) {
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  const page = getProjectPreviewPage(project, currentPageId);
  if (!page) {
    return "Preview: no pages";
  }

  const pageIndex = pages.findIndex((candidate) => candidate.id === page.id);
  return `Preview: page ${pageIndex + 1}${page.title ? `, ${page.title}` : ""}`;
}

function createLocalProjectPagePreview(project, currentPageId = null, lastPlacedAssetId = null) {
  const preview = document.createElement("span");
  preview.className = "local-project-preview";
  const page = getProjectPreviewPage(project, currentPageId);
  const pageRender = document.createElement("span");
  pageRender.className = "local-project-page-render";

  if (page) {
    const stats = getProjectQuickStats(project);
    const assetMap = getProjectAssetMap(project);
    const cardAssetIds = getProjectCardAssetIds(project);
    const layout = normalizeProjectLayout(project);
    const gridDimensions = {
      width: stats.cols * layout.pocketWidth + Math.max(0, stats.cols - 1) * layout.gapX,
      height: stats.rows * layout.pocketHeight + Math.max(0, stats.rows - 1) * layout.gapY,
    };

    pageRender.style.gridTemplateColumns = `repeat(${stats.cols}, minmax(0, 1fr))`;
    pageRender.style.gridTemplateRows = `repeat(${stats.rows}, minmax(0, 1fr))`;
    pageRender.style.aspectRatio = `${gridDimensions.width} / ${gridDimensions.height}`;
    const cardOccupiedSlots = getCardOccupiedSlotsForAssetIds(
      page,
      { rows: stats.rows, cols: stats.cols },
      cardAssetIds,
    );

    for (let row = 0; row < stats.rows; row += 1) {
      for (let col = 0; col < stats.cols; col += 1) {
        const pocket = document.createElement("span");
        pocket.className = [
          "local-project-page-pocket",
          cardOccupiedSlots.has(getSlotKey(row, col)) ? "card-occupied" : "",
        ]
          .filter(Boolean)
          .join(" ");
        pocket.style.gridRow = `${row + 1} / span 1`;
        pocket.style.gridColumn = `${col + 1} / span 1`;
        pageRender.append(pocket);
      }
    }

    const placements = (Array.isArray(page.placements) ? page.placements : [])
      .map((placement, index) => ({ placement, index }))
      .filter(({ placement }) => hasAssetImage(assetMap.get(placement?.imageId)) && placementFits(placement, stats.rows, stats.cols))
      .sort(
        (a, b) =>
          getLocalProjectPlacementLayer(a.placement, a.index, cardAssetIds) -
            getLocalProjectPlacementLayer(b.placement, b.index, cardAssetIds) || a.index - b.index,
      );

    placements.forEach(({ placement }, renderIndex) => {
      const asset = assetMap.get(placement.imageId);
      const block = document.createElement("span");
      block.className = [
        "local-project-page-placement",
        cardAssetIds.has(placement.imageId) ? "card-placement" : "",
      ]
        .filter(Boolean)
        .join(" ");
      block.style.gridRow = `${placement.row + 1} / span ${placement.rowSpan}`;
      block.style.gridColumn = `${placement.col + 1} / span ${placement.colSpan}`;
      block.style.zIndex = String(renderIndex + 2);

      const image = document.createElement("img");
      image.src = getAssetImageSrc(asset);
      image.alt = "";
      image.style.transform = cropToTransform(placement.crop);
      block.append(image);
      pageRender.append(block);
    });
  } else {
    pageRender.classList.add("local-project-page-render-empty");
    pageRender.textContent = "No page";
  }

  const lastAsset = getProjectLastPlacedAsset(project, lastPlacedAssetId, currentPageId);
  const lastAssetPreview = document.createElement("span");
  lastAssetPreview.className = "local-project-last-asset";
  if (lastAsset) {
    const image = document.createElement("img");
    image.src = getAssetImageSrc(lastAsset);
    image.alt = "";
    lastAssetPreview.append(image);
  } else {
    lastAssetPreview.textContent = "No item";
  }

  preview.append(pageRender, lastAssetPreview);
  return preview;
}

function renderLocalProjectPicker() {
  els.localProjectList.replaceChildren();
  if (!state.localProjectChoices.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.indexedDbLastError
      ? "Project storage unavailable."
      : "No local projects saved for this browser URL.";
    els.localProjectList.append(empty);
    return;
  }

  state.localProjectChoices.forEach((record) => {
    const item = document.createElement("div");
    item.className = "local-project-item";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "local-project-load";

    const previewPageId = record.lastModifiedPageId || record.currentPageId;
    const lastAsset = getProjectLastPlacedAsset(record.project, record.lastPlacedAssetId, previewPageId);
    const preview = createLocalProjectPagePreview(record.project, previewPageId, lastAsset?.id || null);

    const copy = document.createElement("span");
    copy.className = "local-project-copy";
    const savedText = record.savedAt ? new Date(record.savedAt).toLocaleString() : "Unknown save time";
    const statsText = formatProjectQuickStats(getProjectQuickStats(record.project));
    copy.innerHTML = `<strong></strong><small></small><small></small><small></small><small></small>`;
    copy.querySelector("strong").textContent = record.name || "Untitled Binder";
    const details = copy.querySelectorAll("small");
    details[0].textContent = getProjectPreviewPageLabel(record.project, previewPageId);
    details[1].textContent = lastAsset ? `Last item: ${lastAsset.name || "Untitled"}` : "Last item: none";
    details[2].textContent = statsText;
    details[3].textContent = savedText;
    loadButton.append(preview, copy);
    loadButton.addEventListener("click", () => {
      loadLocalProject(record.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "local-project-delete-button danger";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${record.name || "Untitled Binder"}`);
    deleteButton.addEventListener("click", () => {
      deleteLocalProject(record.id);
    });

    item.append(loadButton, deleteButton);
    els.localProjectList.append(item);
  });
}

async function deleteLocalProject(projectId) {
  const record = state.localProjectChoices.find((candidate) => candidate.id === projectId);
  if (!record) {
    return;
  }

  const name = record.name || "Untitled Binder";
  const statsText = formatProjectQuickStats(getProjectQuickStats(record.project));
  if (
    !window.confirm(
      `Delete local project "${name}"?\n\n${statsText}\n\nThis removes the saved copy from this browser.`,
    )
  ) {
    return;
  }

  try {
    const db = await openProjectDatabase();
    const currentRecord = await getIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
    await deleteIndexedDbRecord(db, projectId);
    if (currentRecord?.currentProjectId === projectId || currentRecord?.id === projectId) {
      await deleteIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
    }
    db.close();
    state.localProjectChoices = state.localProjectChoices.filter((candidate) => candidate.id !== projectId);
    if (state.project.id === projectId) {
      state.indexedDbSavedAt = null;
      renderProjectControls();
    }
    renderLocalProjectPicker();
    setStatus(`Deleted local project "${name}"`);
  } catch (error) {
    console.warn("Could not delete local project.", error);
    setStatus("Local project delete failed");
  }
}

async function loadLocalProject(projectId) {
  try {
    const db = await openProjectDatabase();
    const record = await getIndexedDbRecord(db, projectId);
    if (!record?.project) {
      db.close();
      setStatus("Local project not found");
      return;
    }

    state.project = normalizeProject(record.project);
    state.currentPageId = record.currentPageId || state.project.pages[0]?.id || null;
    state.lastModifiedPageId = record.lastModifiedPageId || state.currentPageId;
    const loadedLastPlacedAssetId =
      record.lastPlacedAssetId || getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
    state.lastPlacedAssetId = getImage(loadedLastPlacedAssetId)
      ? loadedLastPlacedAssetId
      : getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
    resetTransientProjectState();
    resetProjectPersistenceState({ savedAt: record.savedAt || null });
    resetProjectHistory();
    saveProjectMetadataToLocalStorage();
    await putIndexedDbRecord(db, {
      id: INDEXED_DB_CURRENT_PROJECT_ID,
      currentProjectId: ensureProjectId(),
      savedAt: record.savedAt || new Date().toISOString(),
    });
    db.close();
    closeLocalProjectPicker();
    renderAll();
    queueTcgdexCardStorageSlimming();
  } catch (error) {
    console.warn("Could not load local project.", error);
    setStatus("Local project load failed");
  }
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
    request.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB open failed", {
        database: INDEXED_DB_NAME,
        store: INDEXED_DB_STORE,
        error: getSerializableError(request.error),
      });
      reject(request.error);
    });
    request.addEventListener("blocked", () => {
      console.warn("[Michi Binder storage] IndexedDB open blocked", {
        database: INDEXED_DB_NAME,
        store: INDEXED_DB_STORE,
      });
    });
  });
}

async function saveProjectToIndexedDb(
  message = "Saved local",
  { quiet = false, reason = "autosave", managePending = true, persistenceToken = state.projectPersistenceToken } = {},
) {
  if (managePending) {
    state.indexedDbSavePending = true;
    scheduleRender("project");
  }
  let db = null;
  const savedAt = new Date().toISOString();
  const projectToSave = state.project;
  const projectId = ensureProjectId(projectToSave);
  const currentPageId = state.currentPageId;
  const lastModifiedPageId = state.lastModifiedPageId || state.currentPageId;
  const shouldLogDiagnostics = STORAGE_DIAGNOSTICS_ENABLED && (!quiet || reason === "json-import");
  const projectJson = shouldLogDiagnostics ? JSON.stringify(projectToSave) : "";
  const lastPlacedAssetId = getImage(state.lastPlacedAssetId)
    ? state.lastPlacedAssetId
    : getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);

  try {
    if (shouldLogDiagnostics) {
      await logProjectStorageDiagnostics("IndexedDB save requested", projectToSave, {
        message,
        reason,
        savedAt,
        projectJson,
      });
    }
    db = await openProjectDatabase();
    if (persistenceToken !== state.projectPersistenceToken) {
      return false;
    }
    await putProjectIndexedDbRecords(db, projectToSave, {
      savedAt,
      currentPageId,
      lastModifiedPageId,
      lastPlacedAssetId,
      persistenceToken,
    });
    state.indexedDbSavedAt = savedAt;
    state.indexedDbLastError = null;
    if (!quiet) {
      setStatus(message);
    }
    if (shouldLogDiagnostics) {
      await logProjectStorageDiagnostics("IndexedDB save succeeded", projectToSave, {
        message,
        reason,
        savedAt,
        projectJson,
      });
    }
    return true;
  } catch (error) {
    console.error("Could not save project to IndexedDB.", error);
    state.indexedDbLastError = error;
    await logProjectStorageDiagnostics("IndexedDB save failed", projectToSave, {
      message,
      reason,
      savedAt,
      projectJson,
      error,
    });
    setStatus("Autosave failed");
    return false;
  } finally {
    db?.close();
    if (managePending) {
      state.indexedDbSavePending = false;
      scheduleRender("project");
    }
  }
}

async function putProjectIndexedDbRecords(
  db,
  projectCopy,
  { savedAt, currentPageId, lastModifiedPageId, lastPlacedAssetId, persistenceToken = state.projectPersistenceToken },
) {
  await putIndexedDbRecord(
    db,
    {
      id: projectCopy.id,
      name: projectCopy.name || "Untitled Binder",
      savedAt,
      currentPageId,
      lastModifiedPageId,
      lastPlacedAssetId,
      project: projectCopy,
    },
    { label: "project", savedAt },
  );
  if (persistenceToken !== state.projectPersistenceToken) {
    return;
  }
  await putIndexedDbRecord(
    db,
    {
      id: INDEXED_DB_CURRENT_PROJECT_ID,
      currentProjectId: projectCopy.id,
      savedAt,
    },
    { label: "current pointer", savedAt },
  );
}

function getStringByteLength(value = "") {
  return String(value).length;
}

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getSerializableError(error) {
  if (!error) {
    return null;
  }
  return {
    name: error.name || "Error",
    message: error.message || String(error),
    code: error.code ?? null,
    stack: error.stack || null,
  };
}

function getAssetStorageDetails(asset, type) {
  const dataUrl = typeof asset?.dataUrl === "string" ? asset.dataUrl : "";
  const dataUrlBytes = getStringByteLength(dataUrl);
  const mime = dataUrl.match(/^data:([^;,]+)/)?.[1] || "";
  return {
    type,
    id: asset?.id || "",
    name: asset?.name || "Untitled",
    source: asset?.source || "",
    mime,
    dataUrlChars: dataUrl.length,
    dataUrlBytes,
    dataUrlSize: formatBytes(dataUrlBytes),
  };
}

function getProjectStorageDiagnostics(project, projectJson = JSON.stringify(project)) {
  const images = Array.isArray(project?.images) ? project.images : [];
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  const placements = pages.reduce((total, page) => total + (page?.placements?.length || 0), 0);
  const assets = [
    ...images.map((asset) => getAssetStorageDetails(asset, "image")),
    ...cards.map((asset) => getAssetStorageDetails(asset, "card")),
  ];
  const assetDataUrlBytes = assets.reduce((total, asset) => total + asset.dataUrlBytes, 0);
  const projectJsonBytes = getStringByteLength(projectJson);

  return {
    projectId: project?.id || "",
    projectName: project?.name || "Untitled Binder",
    setupComplete: project?.setupComplete === true,
    pages: pages.length,
    placements,
    images: images.length,
    cards: cards.length,
    projectJsonBytes,
    projectJsonSize: formatBytes(projectJsonBytes),
    assetDataUrlBytes,
    assetDataUrlSize: formatBytes(assetDataUrlBytes),
    largestAssets: assets
      .sort((a, b) => b.dataUrlBytes - a.dataUrlBytes)
      .slice(0, 10),
    currentPageId: state.currentPageId,
    lastModifiedPageId: state.lastModifiedPageId,
    lastPlacedAssetId: state.lastPlacedAssetId,
    locationProtocol: window.location.protocol,
    locationOrigin: window.location.origin,
  };
}

function getImportAssetIds(input) {
  const images = Array.isArray(input?.images) ? input.images : [];
  const cards = Array.isArray(input?.cards) ? input.cards : [];
  return new Set(
    [...images, ...cards]
      .filter((asset) => asset && hasAssetImage(asset) && typeof asset.id === "string")
      .map((asset) => asset.id),
  );
}

function hasOwnField(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function getRawPlacementCount(input) {
  return Array.isArray(input?.pages)
    ? input.pages.reduce((total, page) => total + (Array.isArray(page?.placements) ? page.placements.length : 0), 0)
    : 0;
}

function getNormalizedPlacementCount(project) {
  return Array.isArray(project?.pages)
    ? project.pages.reduce((total, page) => total + (Array.isArray(page?.placements) ? page.placements.length : 0), 0)
    : 0;
}

function getProjectImportCompatibilityDiagnostics(input, normalizedProject) {
  const pages = Array.isArray(input?.pages) ? input.pages : [];
  const firstPage = pages[0] || null;
  const assetIds = getImportAssetIds(input);
  const layoutSource =
    input?.layout && typeof input.layout === "object"
      ? "project.layout"
      : ["pocketWidth", "pocketHeight", "gapX", "gapY"].some((key) => hasOwnField(input, key))
        ? "legacy top-level layout fields"
        : "defaults";
  const rawLayout = layoutSource === "project.layout" ? input.layout : input;
  const missingLayoutFields = Object.keys(DEFAULT_PROJECT_LAYOUT).filter((key) => !Number.isFinite(Number(rawLayout?.[key])));
  const rawRows = input?.rows;
  const rawCols = input?.cols;
  const legacyFirstPageRows = firstPage?.rows;
  const legacyFirstPageCols = firstPage?.cols;
  const droppedPlacementDetails = [];
  let missingAssetRefs = 0;
  let outOfBoundsPlacements = 0;

  pages.forEach((page, pageIndex) => {
    const placements = Array.isArray(page?.placements) ? page.placements : [];
    placements.forEach((placement, placementIndex) => {
      if (!placement || typeof placement !== "object") {
        droppedPlacementDetails.push({ pageIndex, placementIndex, reason: "placement is not an object" });
        return;
      }
      if (!assetIds.has(placement.imageId)) {
        missingAssetRefs += 1;
        droppedPlacementDetails.push({
          pageIndex,
          placementIndex,
          reason: "missing asset reference",
          imageId: placement.imageId || null,
        });
        return;
      }

      const normalizedPlacement = normalizePlacement(placement, assetIds);
      if (!normalizedPlacement || !placementFits(normalizedPlacement, normalizedProject.rows, normalizedProject.cols)) {
        outOfBoundsPlacements += 1;
        droppedPlacementDetails.push({
          pageIndex,
          placementIndex,
          reason: "placement does not fit normalized grid",
          raw: {
            row: placement.row,
            col: placement.col,
            rowSpan: placement.rowSpan,
            colSpan: placement.colSpan,
          },
          normalizedGrid: {
            rows: normalizedProject.rows,
            cols: normalizedProject.cols,
          },
        });
      }
    });
  });

  return {
    rawProjectType: input && typeof input === "object" ? "object" : typeof input,
    rawProjectId: typeof input?.id === "string" ? input.id : null,
    normalizedProjectId: normalizedProject.id,
    usedReservedProjectId: input?.id === INDEXED_DB_CURRENT_PROJECT_ID,
    rawRows,
    rawCols,
    legacyFirstPageRows,
    legacyFirstPageCols,
    normalizedRows: normalizedProject.rows,
    normalizedCols: normalizedProject.cols,
    layoutSource,
    rawLayout: {
      pocketWidth: rawLayout?.pocketWidth,
      pocketHeight: rawLayout?.pocketHeight,
      gapX: rawLayout?.gapX,
      gapY: rawLayout?.gapY,
    },
    normalizedLayout: normalizedProject.layout,
    missingLayoutFields,
    rawPages: pages.length,
    normalizedPages: normalizedProject.pages.length,
    rawPlacements: getRawPlacementCount(input),
    normalizedPlacements: getNormalizedPlacementCount(normalizedProject),
    droppedPlacements: getRawPlacementCount(input) - getNormalizedPlacementCount(normalizedProject),
    missingAssetRefs,
    outOfBoundsPlacements,
    droppedPlacementDetails: droppedPlacementDetails.slice(0, 20),
    rawImages: Array.isArray(input?.images) ? input.images.length : 0,
    normalizedImages: normalizedProject.images.length,
    rawCards: Array.isArray(input?.cards) ? input.cards.length : 0,
    normalizedCards: normalizedProject.cards.length,
    tcgdexImagesMigratedToCards: Array.isArray(input?.images)
      ? input.images.filter((image) => image?.source === "tcgdex").length
      : 0,
  };
}

function logProjectImportDiagnostics(rawProject, normalizedProject, context = {}) {
  if (!STORAGE_DIAGNOSTICS_ENABLED) {
    return;
  }

  const group = console.groupCollapsed || console.group;
  const endGroup = console.groupEnd || (() => {});
  const rawJson = context.rawJson || "";
  const normalizedJson = JSON.stringify(normalizedProject);

  group.call(console, "[Michi Binder import] JSON compatibility");
  console.info("context", {
    fileName: context.fileName || "",
    rawJsonBytes: getStringByteLength(rawJson),
    rawJsonSize: formatBytes(getStringByteLength(rawJson)),
    normalizedJsonBytes: getStringByteLength(normalizedJson),
    normalizedJsonSize: formatBytes(getStringByteLength(normalizedJson)),
  });
  console.info("compatibility", getProjectImportCompatibilityDiagnostics(rawProject, normalizedProject));
  console.info("normalized storage", getProjectStorageDiagnostics(normalizedProject, normalizedJson));
  endGroup.call(console);
}

async function getStorageEstimateForDiagnostics() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usageBytes: estimate.usage ?? null,
      usageSize: estimate.usage == null ? null : formatBytes(estimate.usage),
      quotaBytes: estimate.quota ?? null,
      quotaSize: estimate.quota == null ? null : formatBytes(estimate.quota),
      percentUsed:
        estimate.usage != null && estimate.quota
          ? `${((estimate.usage / estimate.quota) * 100).toFixed(2)}%`
          : null,
    };
  } catch (error) {
    return { error: getSerializableError(error) };
  }
}

async function logProjectStorageDiagnostics(label, project, details = {}) {
  if (!STORAGE_DIAGNOSTICS_ENABLED) {
    return;
  }

  const { projectJson = JSON.stringify(project), error, ...context } = details;
  const diagnostics = getProjectStorageDiagnostics(project, projectJson);
  const storageEstimate = await getStorageEstimateForDiagnostics();
  const group = console.groupCollapsed || console.group;
  const endGroup = console.groupEnd || (() => {});

  group.call(console, `[Michi Binder storage] ${label}`);
  console.info("context", {
    ...context,
    error: getSerializableError(error),
  });
  console.info("project", diagnostics);
  if (storageEstimate) {
    console.info("navigator.storage.estimate()", storageEstimate);
  }
  if (error) {
    console.error("error", error);
  }
  endGroup.call(console);
}

function getLocalStorageDiagnostics() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const currentPageId = localStorage.getItem(CURRENT_PAGE_KEY);
  const result = {
    storageKey: STORAGE_KEY,
    currentPageKey: CURRENT_PAGE_KEY,
    hasProject: Boolean(saved),
    projectBytes: getStringByteLength(saved || ""),
    projectSize: formatBytes(getStringByteLength(saved || "")),
    currentPageId,
  };

  if (!saved) {
    return result;
  }

  try {
    const project = normalizeProject(JSON.parse(saved));
    return {
      ...result,
      projectId: project.id,
      projectName: project.name || "Untitled Binder",
      setupComplete: project.setupComplete === true,
      pages: project.pages.length,
      placements: getNormalizedPlacementCount(project),
      images: project.images.length,
      cards: project.cards.length,
    };
  } catch (error) {
    return {
      ...result,
      parseError: getSerializableError(error),
    };
  }
}

function getIndexedDbRecordsDiagnostics(records = []) {
  return records.map((record) => {
    const project = record?.project ? normalizeProject(record.project) : null;
    return {
      id: record?.id || "",
      savedAt: record?.savedAt || null,
      currentProjectId: record?.currentProjectId || null,
      hasProject: Boolean(record?.project),
      projectId: project?.id || null,
      projectName: project?.name || null,
      setupComplete: project?.setupComplete === true,
      pages: project?.pages.length ?? null,
      placements: project ? getNormalizedPlacementCount(project) : null,
      images: project?.images.length ?? null,
      cards: project?.cards.length ?? null,
    };
  });
}

async function logStartupStorageDiagnostics(label, details = {}) {
  if (!STORAGE_DIAGNOSTICS_ENABLED) {
    return;
  }

  const { error, records, currentRecord, ...context } = details;
  const storageEstimate = await getStorageEstimateForDiagnostics();
  const group = console.groupCollapsed || console.group;
  const endGroup = console.groupEnd || (() => {});

  group.call(console, `[Michi Binder startup] ${label}`);
  console.info("context", {
    ...context,
    error: getSerializableError(error),
    locationProtocol: window.location.protocol,
    locationOrigin: window.location.origin,
  });
  console.info("localStorage", getLocalStorageDiagnostics());
  if (records) {
    console.info("IndexedDB records", getIndexedDbRecordsDiagnostics(records));
  }
  if (currentRecord !== undefined) {
    console.info("IndexedDB current record", getIndexedDbRecordsDiagnostics([currentRecord])[0] || null);
  }
  if (storageEstimate) {
    console.info("navigator.storage.estimate()", storageEstimate);
  }
  if (error) {
    console.error("error", error);
  }
  endGroup.call(console);
}

function getIndexedDbRecordDiagnostics(record, context = {}) {
  const embeddedDataUrlChars = record?.project ? getProjectEmbeddedDataUrlChars(record.project) : 0;

  return {
    ...context,
    store: INDEXED_DB_STORE,
    recordId: record?.id || "",
    hasProject: Boolean(record?.project),
    embeddedDataUrlChars,
    embeddedDataUrlSize: formatBytes(embeddedDataUrlChars),
  };
}

function queueIndexedDbAutoSave(message = "Auto saved local", options = {}) {
  state.project.localAutoSave = true;
  state.indexedDbSaveRequest = {
    message,
    options: {
      quiet: true,
      reason: "autosave",
      ...options,
    },
  };
  void flushIndexedDbSaveQueue();
}

async function flushIndexedDbSaveQueue() {
  if (state.indexedDbSaveInFlight) {
    return state.indexedDbSavePromise;
  }

  state.indexedDbSaveInFlight = true;
  state.indexedDbSavePending = true;
  scheduleRender("project");
  const persistenceToken = state.projectPersistenceToken;

  state.indexedDbSavePromise = (async () => {
    let latestResult = true;
    try {
      while (
        persistenceToken === state.projectPersistenceToken &&
        state.savedRevision < state.projectRevision
      ) {
        const revisionToSave = state.projectRevision;
        const request = state.indexedDbSaveRequest || {
          message: "Auto saved local",
          options: { quiet: true, reason: "autosave" },
        };
        state.indexedDbSaveRequest = null;
        latestResult = await saveProjectToIndexedDb(request.message, {
          ...request.options,
          managePending: false,
          persistenceToken,
        });
        if (!latestResult || persistenceToken !== state.projectPersistenceToken) {
          return latestResult;
        }

        state.savedRevision = Math.max(state.savedRevision, revisionToSave);
        if (state.legacyLocalStorageProjectPending) {
          state.legacyLocalStorageProjectPending = false;
          removeLegacyLocalStorageProject();
        }
        saveProjectMetadataToLocalStorage();
      }
      return latestResult;
    } finally {
      if (persistenceToken === state.projectPersistenceToken) {
        state.indexedDbSaveInFlight = false;
        state.indexedDbSavePending = false;
        state.indexedDbSavePromise = null;
        scheduleRender("project");
      }
    }
  })();

  return state.indexedDbSavePromise;
}

function putIndexedDbRecord(db, record, context = {}) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
    const request = transaction.objectStore(INDEXED_DB_STORE).put(record);
    request.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB put request failed", {
        ...getIndexedDbRecordDiagnostics(record, context),
        error: getSerializableError(request.error),
      });
    });
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB transaction failed", {
        ...getIndexedDbRecordDiagnostics(record, context),
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
    transaction.addEventListener("abort", () => {
      console.error("[Michi Binder storage] IndexedDB transaction aborted", {
        ...getIndexedDbRecordDiagnostics(record, context),
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
  });
}

async function hydrateProjectFromIndexedDbIfNeeded() {
  await logStartupStorageDiagnostics("hydrate begin", {
    stateProjectId: state.project.id,
    stateProjectSetupComplete: state.project.setupComplete === true,
    stateCurrentPageId: state.currentPageId,
  });

  let indexedDbError = null;
  try {
    const recovered = await loadCurrentIndexedDbProject();
    if (recovered) {
      await logStartupStorageDiagnostics("current project recovered", {
        recovered,
        stateProjectId: state.project.id,
        stateProjectSetupComplete: state.project.setupComplete === true,
      });
      return true;
    }
  } catch (error) {
    indexedDbError = error;
    console.error("Could not load IndexedDB project.", error);
    await logStartupStorageDiagnostics("hydrate failed", {
      error,
      stateProjectId: state.project.id,
      stateProjectSetupComplete: state.project.setupComplete === true,
    });
    state.indexedDbLastError = error;
    scheduleRender("project");
  }

  const legacyRecovered = await loadLegacyLocalStorageProjectIntoState({ indexedDbError });
  await logStartupStorageDiagnostics(
    legacyRecovered ? "legacy localStorage project recovered" : "no project to recover",
    {
      legacyRecovered,
      indexedDbError,
      stateProjectId: state.project.id,
      stateProjectSetupComplete: state.project.setupComplete === true,
    },
  );
  return legacyRecovered;
}

async function loadLegacyLocalStorageProjectIntoState({ indexedDbError = null } = {}) {
  const project = loadLegacyLocalStorageProject();
  if (!project) {
    return false;
  }

  state.project = project;
  const currentPageId = getLocalStorageItem(CURRENT_PAGE_KEY);
  state.currentPageId = state.project.pages.some((page) => page.id === currentPageId)
    ? currentPageId
    : state.project.pages[0]?.id || null;
  state.lastModifiedPageId = state.currentPageId;
  state.lastPlacedAssetId = getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
  resetTransientProjectState();
  resetProjectPersistenceState();
  state.legacyLocalStorageProjectPending = true;
  if (indexedDbError) {
    state.indexedDbLastError = indexedDbError;
  }
  resetProjectHistory();
  markProjectChanged();

  const persisted = await saveProjectToIndexedDb("Imported legacy local project", {
    quiet: true,
    reason: "legacy-localStorage-import",
  });
  if (persisted) {
    state.savedRevision = state.projectRevision;
    state.legacyLocalStorageProjectPending = false;
    removeLegacyLocalStorageProject();
    saveProjectMetadataToLocalStorage();
  }
  return true;
}

async function loadCurrentIndexedDbProject(records = state.localProjectChoices) {
  const db = await openProjectDatabase();
  try {
    const currentRecord = await getIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
    await logStartupStorageDiagnostics("IndexedDB current record read", {
      records,
      currentRecord,
    });
    const record = currentRecord?.project
      ? currentRecord
      : records.find((candidate) => candidate.id === currentRecord?.currentProjectId) ||
        (currentRecord?.currentProjectId ? await getIndexedDbRecord(db, currentRecord.currentProjectId) : null);

    if (!record?.project) {
      return false;
    }

    state.project = normalizeProject(record.project);
    state.currentPageId = record.currentPageId || state.project.pages[0]?.id || null;
    state.lastModifiedPageId = record.lastModifiedPageId || state.currentPageId;
    const loadedLastPlacedAssetId =
      record.lastPlacedAssetId || getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
    state.lastPlacedAssetId = getImage(loadedLastPlacedAssetId)
      ? loadedLastPlacedAssetId
      : getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
    resetTransientProjectState();
    resetProjectPersistenceState({ savedAt: record.savedAt || currentRecord?.savedAt || null });
    resetProjectHistory();
    saveProjectMetadataToLocalStorage();
    return true;
  } finally {
    db.close();
  }
}

async function refreshLocalProjectChoices({ openWhenAvailable = false } = {}) {
  const db = await openProjectDatabase();
  try {
    await migrateLegacyCurrentProjectRecord(db);
  } catch (error) {
    console.warn("Could not migrate current IndexedDB project record.", error);
    state.indexedDbLastError = error;
  }

  let records;
  try {
    records = await getIndexedDbProjectRecords(db);
  } finally {
    db.close();
  }

  state.localProjectChoices = records;
  const currentRecord = records.find((record) => record.id === state.project.id);
  if (currentRecord?.savedAt) {
    state.indexedDbSavedAt = currentRecord.savedAt;
    state.indexedDbLastError = null;
    renderProjectControls();
  }
  renderLocalProjectPicker();
  if (openWhenAvailable && records.length) {
    openLocalProjectPicker();
  }
  return records;
}

async function migrateLegacyCurrentProjectRecord(db) {
  const currentRecord = await getIndexedDbRecord(db, INDEXED_DB_CURRENT_PROJECT_ID);
  if (!currentRecord?.project) {
    return;
  }

  const project = normalizeProject(currentRecord.project);
  const projectId = ensureProjectId(project);
  const savedAt = currentRecord.savedAt || new Date().toISOString();
  await putIndexedDbRecord(db, {
    id: projectId,
    name: project.name || "Untitled Binder",
    savedAt,
    currentPageId: currentRecord.currentPageId || project.pages[0]?.id || null,
    lastModifiedPageId: currentRecord.lastModifiedPageId || currentRecord.currentPageId || project.pages[0]?.id || null,
    lastPlacedAssetId:
      currentRecord.lastPlacedAssetId ||
      getInferredLastPlacedAssetId(project, currentRecord.lastModifiedPageId || currentRecord.currentPageId),
    project,
  });
  await putIndexedDbRecord(db, {
    id: INDEXED_DB_CURRENT_PROJECT_ID,
    currentProjectId: projectId,
    savedAt,
  });
}

async function getIndexedDbProjectRecords(db) {
  const records = await getAllIndexedDbRecords(db);
  return records
    .filter((record) => record?.project)
    .map((record) => ({
      id: record.id,
      name: record.project?.name || record.name || "Untitled Binder",
      savedAt: record.savedAt || null,
      currentPageId: record.currentPageId || record.project?.pages?.[0]?.id || null,
      lastModifiedPageId:
        record.lastModifiedPageId || record.currentPageId || record.project?.pages?.[0]?.id || null,
      lastPlacedAssetId:
        record.lastPlacedAssetId ||
        getInferredLastPlacedAssetId(record.project, record.lastModifiedPageId || record.currentPageId),
      project: record.project,
    }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
}

function getAllIndexedDbRecords(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).getAll();
    request.addEventListener("success", () => resolve(request.result || []));
    request.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB getAll request failed", {
        store: INDEXED_DB_STORE,
        error: getSerializableError(request.error),
      });
      reject(request.error);
    });
    transaction.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB getAll transaction failed", {
        store: INDEXED_DB_STORE,
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
    transaction.addEventListener("abort", () => {
      console.error("[Michi Binder storage] IndexedDB getAll transaction aborted", {
        store: INDEXED_DB_STORE,
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
  });
}

function getIndexedDbRecord(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).get(id);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB get request failed", {
        store: INDEXED_DB_STORE,
        recordId: id,
        error: getSerializableError(request.error),
      });
      reject(request.error);
    });
    transaction.addEventListener("error", () => {
      console.error("[Michi Binder storage] IndexedDB get transaction failed", {
        store: INDEXED_DB_STORE,
        recordId: id,
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
    transaction.addEventListener("abort", () => {
      console.error("[Michi Binder storage] IndexedDB get transaction aborted", {
        store: INDEXED_DB_STORE,
        recordId: id,
        error: getSerializableError(transaction.error || request.error),
      });
      reject(transaction.error || request.error);
    });
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
  els.mobileWarningCloseButton.addEventListener("click", closeMobileWarning);

  els.projectSetupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const { rows, cols } = getProjectGridFromControls({
      rows: els.setupRowsInput,
      cols: els.setupColsInput,
    });
    const layout = getProjectLayoutFromControls({
      pocketWidth: els.setupPocketWidthInput,
      pocketHeight: els.setupPocketHeightInput,
      gapX: els.setupGapXInput,
      gapY: els.setupGapYInput,
    });
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
    state.project.layout = layout;
    state.project.localAutoSave = true;
    state.project.pages.forEach((page) => {
      page.placements = page.placements.filter((placement) => placementFits(placement, rows, cols));
    });
    state.project.setupComplete = true;
    state.setupInitialized = false;
    state.projectSetupRequested = false;
    state.lastModifiedPageId = state.currentPageId;
    state.lastPlacedAssetId = null;
    saveProject("Project created", { resetHistory: true });
    renderAll();
  });
  bindProjectLayoutPresetControls({
    preset: els.setupBinderPresetInput,
    pocketWidth: els.setupPocketWidthInput,
    pocketHeight: els.setupPocketHeightInput,
    gapX: els.setupGapXInput,
    gapY: els.setupGapYInput,
  });

  els.projectNameInput.addEventListener("input", () => {
    state.project.name = els.projectNameInput.value;
    saveProject("Saved", { coalesceKey: "project-name" });
  });
  els.projectNameInput.addEventListener("blur", endProjectHistoryCoalescing);
  els.undoProjectButton.addEventListener("click", undoProjectChange);
  els.redoProjectButton.addEventListener("click", redoProjectChange);

  els.projectMenuButton.addEventListener("click", openProjectMenuModal);
  els.projectMenuCloseButton.addEventListener("click", closeProjectMenuModal);
  els.projectMenuModal.addEventListener("click", (event) => {
    if (event.target === els.projectMenuModal) {
      closeProjectMenuModal();
    }
  });
  els.projectSettingsButton.addEventListener("click", () => {
    openProjectSettingsModal();
  });
  els.projectSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProjectSettings();
  });
  bindProjectLayoutPresetControls({
    preset: els.settingsBinderPresetInput,
    pocketWidth: els.settingsPocketWidthInput,
    pocketHeight: els.settingsPocketHeightInput,
    gapX: els.settingsGapXInput,
    gapY: els.settingsGapYInput,
  });
  els.projectSettingsCancelButton.addEventListener("click", closeProjectSettingsModal);
  els.projectSettingsModal.addEventListener("click", (event) => {
    if (event.target === els.projectSettingsModal) {
      closeProjectSettingsModal();
    }
  });
  els.helpButton.addEventListener("click", openHelpModal);
  els.helpCloseButton.addEventListener("click", closeHelpModal);
  els.helpModal.addEventListener("click", (event) => {
    if (event.target === els.helpModal) {
      closeHelpModal();
    }
  });
  els.cardArtModalCloseButton.addEventListener("click", closeCardArtModal);
  els.cardArtModal.addEventListener("click", (event) => {
    if (event.target === els.cardArtModal) {
      closeCardArtModal();
    }
  });
  els.localProjectNewButton.addEventListener("click", () => {
    closeLocalProjectPicker();
    startNewProject({ confirm: false });
  });
  els.localProjectCloseButton.addEventListener("click", closeLocalProjectPicker);
  els.localProjectPicker.addEventListener("click", (event) => {
    if (event.target === els.localProjectPicker) {
      closeLocalProjectPicker();
    }
  });
  els.newProjectButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    startNewProject();
  });

  els.loadLocalButton.addEventListener("click", async () => {
    closeProjectMenuModal();
    try {
      await refreshLocalProjectChoices();
      openLocalProjectPicker();
    } catch (error) {
      console.warn("Could not list local projects.", error);
      state.indexedDbLastError = error;
      state.localProjectChoices = [];
      renderLocalProjectPicker();
      renderProjectControls();
      setStatus("Project storage unavailable");
      openLocalProjectPicker();
    }
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

  els.imageImportScaleInput.addEventListener("input", () => {
    updateImageImportCrop("scale", els.imageImportScaleInput.value);
  });
  els.imageImportXInput.addEventListener("input", () => {
    updateImageImportCrop("x", els.imageImportXInput.value);
  });
  els.imageImportYInput.addEventListener("input", () => {
    updateImageImportCrop("y", els.imageImportYInput.value);
  });
  els.imageImportRotateInput.addEventListener("change", () => {
    updateImageImportCrop("rotate", els.imageImportRotateInput.value);
  });
  els.imageImportResetCropButton.addEventListener("click", () => {
    setCurrentImageImportCrop(DEFAULT_CROP);
  });

  els.imageImportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await importCurrentWizardImage();
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

  els.imageOverlapOverButton.addEventListener("click", () => {
    resolveImageOverlapChoice("overlap");
  });
  els.imageOverlapUnderButton.addEventListener("click", () => {
    resolveImageOverlapChoice("underlap");
  });
  els.imageOverlapReplaceButton.addEventListener("click", () => {
    resolveImageOverlapChoice("replace");
  });
  els.imageOverlapCancelButton.addEventListener("click", () => {
    resolveImageOverlapChoice("cancel");
  });
  els.imageOverlapModal.addEventListener("click", (event) => {
    if (event.target === els.imageOverlapModal) {
      resolveImageOverlapChoice("cancel");
    }
  });

  els.newPageButton.addEventListener("click", (event) => {
    closeParentDetails(event.currentTarget);
    addPage();
  });
  els.pageSearchInput.addEventListener("input", () => {
    state.pageSearchQuery = els.pageSearchInput.value.trim().toLowerCase();
    renderPageList();
  });

  els.exportJsonButton.addEventListener("click", (event) => {
    closeExportSettingsModal();
    exportProjectJson();
  });
  els.importJsonButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    els.importJsonInput.click();
  });
  els.importJsonInput.addEventListener("change", importProjectJson);
  els.exportButton.addEventListener("click", openExportSettingsModal);
  els.exportSettingsCancelButton.addEventListener("click", closeExportSettingsModal);
  els.exportSettingsModal.addEventListener("click", (event) => {
    if (event.target === els.exportSettingsModal) {
      closeExportSettingsModal();
    }
  });
  els.exportSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveExportSettingsFromControls({ closeModal: false });
  });
  els.pdfExportIncludeAllCardsInput.addEventListener("change", updateExportSettingsControlState);
  els.pdfExportIncludeNeededCardsInput.addEventListener("change", updateExportSettingsControlState);
  els.exportPngButton.addEventListener("click", () => {
    exportFromModal("png");
  });
  els.exportPdfButton.addEventListener("click", () => {
    exportFromModal("pdf");
  });

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
  bindImagePlacementPreviewControls();

  els.placementColsInput.addEventListener("input", () => {
    updateImagePlacementDraftSpan();
  });
  els.placementRowsInput.addEventListener("input", () => {
    updateImagePlacementDraftSpan();
  });
  [els.placementColsInput, els.placementRowsInput].forEach((input) => {
    input.addEventListener("focus", () => {
      window.setTimeout(() => input.select(), 0);
    });
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
  els.imagePlacementResetCropButton.addEventListener("click", () => {
    if (!state.imagePlacementDraft) return;
    setImagePlacementDraftCrop(DEFAULT_CROP);
  });

  els.imageFileInput.addEventListener("change", async () => {
    await importImageFiles(Array.from(els.imageFileInput.files || []));
    els.imageFileInput.value = "";
  });

  els.imageSearchInput.addEventListener("input", () => {
    state.imageSearchQuery = els.imageSearchInput.value.trim().toLowerCase();
    renderImageLibrary();
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

  document.addEventListener("contextmenu", (event) => {
    if (!state.placementClipboard) {
      return;
    }

    event.preventDefault();
    clearPlacementClipboard();
  });

  document.addEventListener("keydown", async (event) => {
    const editingText = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    const shortcut = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (shortcut && !editingText && key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redoProjectChange();
      } else {
        undoProjectChange();
      }
      return;
    }

    if (shortcut && !editingText && key === "y") {
      event.preventDefault();
      redoProjectChange();
      return;
    }

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

    if (shortcut && !editingText && key === "v" && state.placementClipboard) {
      const targetSlot = state.hoveredSlot || state.pendingCardSlot;
      if (!targetSlot) {
        return;
      }

      event.preventDefault();
      const targetPage = state.project.pages.find((page) => page.id === targetSlot.pageId);
      const targetPlacement = targetPage
        ? findPlacementAtSlot(targetPage, targetSlot.row, targetSlot.col)
        : null;
      await pastePlacementClipboardAtSlot(
        targetSlot.pageId,
        targetSlot.row,
        targetSlot.col,
        targetPlacement?.id ?? null,
      );
      return;
    }

    if (
      !shortcut &&
      !editingText &&
      !event.altKey &&
      !event.shiftKey &&
      document.activeElement !== els.sidebarResizer &&
      !hasBlockingOverlayOpen() &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      cycleCurrentSpread(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (event.key === "Escape" && !els.imageOverlapModal.hidden) {
      resolveImageOverlapChoice("cancel");
      return;
    }

    if (event.key === "Escape" && !els.projectMenuModal.hidden) {
      closeProjectMenuModal();
      return;
    }

    if (event.key === "Escape" && !els.projectSettingsModal.hidden) {
      closeProjectSettingsModal();
      return;
    }

    if (event.key === "Escape" && !els.helpModal.hidden) {
      closeHelpModal();
      return;
    }

    if (event.key === "Escape" && !els.cardArtModal.hidden) {
      closeCardArtModal();
      return;
    }

    if (event.key === "Escape" && !els.localProjectPicker.hidden) {
      closeLocalProjectPicker();
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

    if (event.key === "Escape" && state.placementClipboard) {
      clearPlacementClipboard();
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

function scheduleRender(...regions) {
  const requestedRegions = regions.flat().filter(Boolean);
  if (!requestedRegions.length || requestedRegions.includes("all")) {
    state.pendingRenderRegions.clear();
    state.pendingRenderRegions.add("all");
  } else if (!state.pendingRenderRegions.has("all")) {
    requestedRegions.forEach((region) => state.pendingRenderRegions.add(region));
  }

  if (state.renderFrameId !== null) {
    return;
  }

  state.renderFrameId = window.requestAnimationFrame(() => {
    state.renderFrameId = null;
    const pendingRegions = new Set(state.pendingRenderRegions);
    state.pendingRenderRegions.clear();
    renderRegions(pendingRegions);
  });
}

function renderAll() {
  renderRegions(new Set(["all"]));
}

function renderRegions(regions) {
  const renderEverything = regions.has("all");
  ensureCurrentPage();
  if (renderEverything || regions.has("setup")) {
    renderSetupControls();
  }
  if (renderEverything || regions.has("project")) {
    renderProjectControls();
  }
  if (renderEverything || regions.has("pages")) {
    renderPageList();
  }
  if (renderEverything || regions.has("sidebar")) {
    applySidebarWidth();
  }
  if (renderEverything || regions.has("binderControls")) {
    renderBinderViewControls();
  }
  if (renderEverything || regions.has("cardSearch")) {
    renderCardSearchControls();
  }
  if (renderEverything || regions.has("cardLibrary")) {
    renderCardLibrary();
  }
  if (renderEverything || regions.has("imageLibrary")) {
    renderImageLibrary();
  }
  if (renderEverything || regions.has("binder")) {
    renderBinder();
  }
  if (renderEverything || regions.has("modals")) {
    renderImagePlacementModal();
    renderImageImportWizard();
    renderCardInsertPrompt();
  }
}

function renderProjectControls() {
  const grid = getProjectGrid();
  const layout = getProjectLayout();
  els.projectSetup.hidden = state.project.setupComplete || !state.projectSetupRequested;
  els.projectNameInput.value = state.project.name;
  els.projectBinderSummary.textContent =
    `Binder: ${grid.rows} rows x ${grid.cols} columns, pockets ${formatLayoutNumber(layout.pocketWidth)} x ${formatLayoutNumber(layout.pocketHeight)}, gaps ${formatLayoutNumber(layout.gapX)} x ${formatLayoutNumber(layout.gapY)}`;
  els.localSaveSummary.textContent = getLocalSaveSummary();
  renderProjectHistoryControls();
}

function formatLayoutNumber(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function renderSetupControls() {
  if (!state.setupInitialized) {
    const grid = getProjectGrid();
    els.setupProjectNameInput.value = state.project.name || "";
    els.setupRowsInput.value = grid.rows;
    els.setupColsInput.value = grid.cols;
    syncProjectLayoutControls(
      {
        preset: els.setupBinderPresetInput,
        pocketWidth: els.setupPocketWidthInput,
        pocketHeight: els.setupPocketHeightInput,
        gapX: els.setupGapXInput,
        gapY: els.setupGapYInput,
      },
      getProjectLayout(),
    );
    state.setupInitialized = true;
  }
}

function getLocalSaveSummary() {
  if (state.startupPhase === "loading") {
    return "Loading project...";
  }

  if (state.indexedDbSavePending) {
    return "Saving...";
  }

  if (state.indexedDbLastError) {
    const savedText = state.indexedDbSavedAt
      ? `Last saved: ${new Date(state.indexedDbSavedAt).toLocaleString()}`
      : "Not saved yet";
    return `Autosave failed. ${savedText}`;
  }

  const savedText = state.indexedDbSavedAt
    ? `Last saved: ${new Date(state.indexedDbSavedAt).toLocaleString()}`
    : "Not saved yet";

  return savedText;
}

function renderPageList() {
  els.pageList.replaceChildren();
  if (document.activeElement !== els.pageSearchInput) {
    els.pageSearchInput.value = state.pageSearchQuery;
  }

  const query = state.pageSearchQuery.trim().toLowerCase();
  const pages = query
    ? state.project.pages
        .map((page, index) => ({ page, index }))
        .filter(({ page, index }) => getPageSearchText(page, index).includes(query))
    : state.project.pages.map((page, index) => ({ page, index }));

  if (!pages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state page-list-empty";
    empty.textContent = "No matching pages";
    els.pageList.append(empty);
    return;
  }

  pages.forEach(({ page, index }) => {
    const row = document.createElement("div");
    row.className = "page-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-tab${page.id === state.currentPageId ? " active" : ""}`;
    button.innerHTML = `<span></span>`;
    button.querySelector("span").textContent = `${index + 1}. ${page.title || `Page ${index + 1}`}`;
    button.addEventListener("click", () => {
      selectPage(page.id);
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "page-edit-button";
    editButton.textContent = "Rename";
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

function getPageSearchText(page, index) {
  const pageNumber = index + 1;
  const title = page.title || `Page ${pageNumber}`;
  return [
    title,
    `page ${pageNumber}`,
    String(pageNumber),
    getSpreadLabelForIndex(index),
  ]
    .join(" ")
    .toLowerCase();
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

function bindImagePlacementPreviewControls() {
  const preview = els.imagePlacementPreview;

  preview.addEventListener("pointerdown", (event) => {
    if (!state.imagePlacementDraft || event.button !== 0) return;

    const imageLayer = preview.querySelector(".placement-preview-image-layer");
    if (!imageLayer) return;

    const layerBounds = imageLayer.getBoundingClientRect();
    if (!layerBounds.width || !layerBounds.height) return;

    event.preventDefault();
    preview.setPointerCapture(event.pointerId);
    state.imagePlacementPanGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      imageWidth: layerBounds.width,
      imageHeight: layerBounds.height,
      crop: normalizeCrop(state.imagePlacementDraft.crop),
    };
    preview.classList.add("panning");
  });

  preview.addEventListener("pointermove", (event) => {
    const gesture = state.imagePlacementPanGesture;
    if (!state.imagePlacementDraft || !gesture || gesture.pointerId !== event.pointerId) return;

    event.preventDefault();
    setImagePlacementDraftCrop({
      ...gesture.crop,
      x: gesture.crop.x + ((event.clientX - gesture.startX) / gesture.imageWidth) * 100,
      y: gesture.crop.y + ((event.clientY - gesture.startY) / gesture.imageHeight) * 100,
    });
  });

  const endPan = (event) => {
    const gesture = state.imagePlacementPanGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (preview.hasPointerCapture(event.pointerId)) {
      preview.releasePointerCapture(event.pointerId);
    }
    state.imagePlacementPanGesture = null;
    preview.classList.remove("panning");
  };

  preview.addEventListener("pointerup", endPan);
  preview.addEventListener("pointercancel", endPan);
  preview.addEventListener(
    "wheel",
    (event) => {
      if (!state.imagePlacementDraft) return;

      event.preventDefault();
      const crop = normalizeCrop(state.imagePlacementDraft.crop);
      const zoomFactor = Math.exp(-event.deltaY * 0.001);
      setImagePlacementDraftCrop({
        ...crop,
        scale: clampNumber(crop.scale * zoomFactor, 0.5, 4, crop.scale),
      });
    },
    { passive: false },
  );
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
  workspace.addEventListener("wheel", handleBinderWheelZoom, { passive: false });
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

function handleBinderWheelZoom(event) {
  if (event.target.closest(".floating-view-control")) {
    return;
  }

  const deltaY = normalizeWheelDeltaY(event);
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 0.01) {
    return;
  }

  event.preventDefault();
  const zoomFactor = Math.exp(-deltaY * BINDER_WHEEL_ZOOM_SENSITIVITY);
  setManualBinderZoom(state.binderZoom * zoomFactor);
}

function normalizeWheelDeltaY(event) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(1, els.workspace.clientHeight);
  }
  return event.deltaY;
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
  if (target.closest(".floating-view-control") || isInteractivePanBlocker(target)) {
    return false;
  }

  return els.workspace.contains(target);
}

function isInteractivePanBlocker(target) {
  return Boolean(
    target.closest(
      [
        "a[href]",
        "button",
        "input",
        "select",
        "textarea",
        "summary",
        "[contenteditable='true']",
        "[role='button']",
        "[role='checkbox']",
        "[role='menuitem']",
        "[role='option']",
        "[role='slider']",
        "[role='switch']",
        "[tabindex]:not(.workspace):not(.page-preview):not(.binder-sheet):not(.binder-grid)",
      ].join(","),
    ),
  );
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
    result.draggable = true;
    result.innerHTML = `<img alt=""><span><strong></strong><span></span><span></span></span>`;
    result.querySelector("img").src = imageUrl;
    result.querySelector("img").alt = card.name;
    result.querySelector("strong").textContent = card.name;
    const detailLines = result.querySelectorAll("span span");
    detailLines[0].textContent = card.localId ? `Local #${card.localId}` : "No local number";
    detailLines[1].textContent = card.id || "";
    result.addEventListener("click", async () => {
      const cardAsset = await importTcgdexCardArt(card, {
        statusElement: els.cardSearchStatus,
        renderAfterImport: false,
      });
      if (cardAsset) {
        setCardPlacementClipboard(cardAsset);
      }
    });
    result.addEventListener("dragstart", (event) => {
      state.draggedCardResult = card;
      setDraggedCardPreviewAsset(card);
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", card.name || "TCGdex card");
      event.dataTransfer.setData("application/x-michi-card-id", card.id || "");
      result.classList.add("dragging");
    });
    result.addEventListener("dragend", () => {
      clearDraggedCardDragState();
      result.classList.remove("dragging");
    });
    els.cardSearchResults.append(result);
  });

  if (state.cardSearchHasMore) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "load-more-button";
    loadMore.disabled = state.cardSearchLoading;
    loadMore.textContent = state.cardSearchLoading ? "Loading..." : "Load More";
    loadMore.addEventListener("click", () => {
      searchTcgdexCards({ append: true });
    });
    els.cardSearchResults.append(loadMore);
  }
}

async function searchTcgdexCards({ append = false } = {}) {
  const searchTerm = els.cardSearchInput.value.trim();
  if (!searchTerm) {
    clearCardSearch();
    return;
  }

  const page = append && state.cardSearchQuery === searchTerm ? state.cardSearchPage + 1 : 1;
  state.cardSearchLoading = true;
  state.cardSearchQuery = searchTerm;
  if (!append) {
    state.cardSearchResults = [];
    state.cardSearchHasMore = false;
  }
  els.cardSearchStatus.textContent = append ? "Loading more cards" : "Searching cards";
  renderCardSearchControls();

  try {
    const result = await fetchTcgdexCardSearchResults(searchTerm, page);
    state.cardSearchResults = append
      ? dedupeCardsById([...state.cardSearchResults, ...result.cards])
      : result.cards;
    state.cardSearchPage = page;
    state.cardSearchHasMore = result.hasMore;
    els.cardSearchStatus.textContent = state.cardSearchResults.length
      ? `${state.cardSearchResults.length} result${state.cardSearchResults.length === 1 ? "" : "s"}${state.cardSearchHasMore ? " shown" : ""}`
      : "No matching cards";
  } catch (error) {
    console.warn("TCGdex card search failed.", error);
    els.cardSearchStatus.textContent = "Card search failed";
  } finally {
    state.cardSearchLoading = false;
    renderCardSearchControls();
  }
}

async function fetchTcgdexCardSearchResults(searchTerm, page = 1) {
  const queries = buildTcgdexCardNameQueries(searchTerm);
  if (!queries.length) {
    return { cards: [], hasMore: false };
  }

  const resultSets = await Promise.all(
    queries.map((query) => fetchTcgdexCardSearchPage(query, page)),
  );
  const cards = dedupeCardsById(
    resultSets.flatMap((result) => result.cards).filter((card) => card.image),
  );

  return {
    cards,
    hasMore: resultSets.some((result) => result.hasMore),
  };
}

async function fetchTcgdexCardSearchPage(query, page) {
  const params = new URLSearchParams({
    name: query,
    "pagination:page": String(page),
    "pagination:itemsPerPage": String(CARD_SEARCH_PAGE_SIZE),
    "sort:field": "name",
    "sort:order": "ASC",
  });

  const response = await fetch(`${TCGDEX_CARDS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Card search failed with status ${response.status}`);
  }

  const result = await response.json();
  const cards = Array.isArray(result) ? result : [];
  return {
    cards,
    hasMore: cards.length >= CARD_SEARCH_PAGE_SIZE,
  };
}

function buildTcgdexCardNameQueries(searchTerm) {
  const clean = sanitizeCardSearchTerm(searchTerm);
  const normalized = stripDiacritics(clean);
  return [...new Set([
    clean,
    normalized,
    addPokemonAccentVariant(normalized),
  ].map(sanitizeCardSearchTerm).filter(Boolean))];
}

function sanitizeCardSearchTerm(searchTerm) {
  return String(searchTerm || "")
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripDiacritics(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function addPokemonAccentVariant(text) {
  return String(text || "").replace(/poke/gi, (match) => {
    if (match === match.toUpperCase()) {
      return "POK\u00c9";
    }
    if (match[0] === match[0].toUpperCase()) {
      return "Pok\u00e9";
    }
    return "pok\u00e9";
  });
}

function dedupeCardsById(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    const key = card.id || `${card.name}-${card.localId || ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function clearCardSearch() {
  state.cardSearchLoading = false;
  state.cardSearchResults = [];
  state.cardSearchQuery = "";
  state.cardSearchPage = 0;
  state.cardSearchHasMore = false;
  els.cardSearchStatus.textContent = "";
  renderCardSearchControls();
}

async function searchCardInsertTcgdexCards({ append = false } = {}) {
  const searchTerm = els.cardInsertSearchInput.value.trim();
  if (!searchTerm) {
    clearCardInsertSearch();
    return;
  }

  const page = append && state.cardInsertSearchQuery === searchTerm ? state.cardInsertSearchPage + 1 : 1;
  state.cardInsertSearchLoading = true;
  state.cardInsertSearchQuery = searchTerm;
  if (!append) {
    state.cardInsertSearchResults = [];
    state.cardInsertSearchHasMore = false;
  }
  els.cardInsertSearchStatus.textContent = append ? "Loading more cards" : "Searching cards";
  renderCardInsertPrompt();

  try {
    const result = await fetchTcgdexCardSearchResults(searchTerm, page);
    state.cardInsertSearchResults = append
      ? dedupeCardsById([...state.cardInsertSearchResults, ...result.cards])
      : result.cards;
    state.cardInsertSearchPage = page;
    state.cardInsertSearchHasMore = result.hasMore;
    els.cardInsertSearchStatus.textContent = state.cardInsertSearchResults.length
      ? `${state.cardInsertSearchResults.length} result${state.cardInsertSearchResults.length === 1 ? "" : "s"}${state.cardInsertSearchHasMore ? " shown" : ""}`
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
  state.cardInsertSearchQuery = "";
  state.cardInsertSearchPage = 0;
  state.cardInsertSearchHasMore = false;
  els.cardInsertSearchStatus.textContent = "";
  renderCardInsertPrompt();
}

function getImportedTcgdexCardAsset(cardId) {
  return state.project.cards.find(
    (cardAsset) => cardAsset.source === "tcgdex" && cardAsset.cardId === cardId,
  );
}

function enqueueTcgdexCardImport(importTask) {
  const queuedImport = state.tcgdexCardImportQueue.then(importTask, importTask);
  state.tcgdexCardImportQueue = queuedImport.catch(() => null);
  return queuedImport;
}

async function importTcgdexCardArt(card, { statusElement = els.cardSearchStatus, renderAfterImport = true } = {}) {
  const cardId = card?.id;
  if (!cardId) {
    setStatus("Card could not be imported");
    return null;
  }

  const existing = getImportedTcgdexCardAsset(cardId);
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

  const existingImport = state.tcgdexCardImportPromises.get(cardId);
  if (existingImport) {
    const imported = await existingImport;
    if (imported) {
      state.selectedCardId = imported.id;
      if (renderAfterImport) {
        renderAll();
      }
    }
    return imported;
  }

  const persistenceToken = state.projectPersistenceToken;
  const importPromise = enqueueTcgdexCardImport(async () => {
    try {
      if (persistenceToken !== state.projectPersistenceToken) {
        return null;
      }

      const cardDetail = await fetchTcgdexCardDetail(cardId);
      if (persistenceToken !== state.projectPersistenceToken) {
        return null;
      }

      const existingAfterFetch = getImportedTcgdexCardAsset(cardId);
      if (existingAfterFetch) {
        return existingAfterFetch;
      }

      const cardForImport = cardDetail || card;
      const imageUrl = getTcgdexCardImageUrl(cardForImport, "high", "png");
      if (!imageUrl) {
        throw new Error("Card art image URL is unavailable");
      }
      const cardAsset = {
        id: createId(),
        name: formatTcgdexCardImageName(cardForImport),
        imageUrl,
        source: "tcgdex",
        cardId: cardForImport.id,
        cardName: cardForImport.name,
        setName: cardForImport.set?.name,
        number: cardForImport.localId,
        rarity: cardForImport.rarity,
        owned: true,
      };
      state.project.cards.push(cardAsset);
      state.selectedCardId = cardAsset.id;
      saveProject(`Imported ${card.name}`);
      return cardAsset;
    } catch (error) {
      console.warn("TCGdex image import failed.", error);
      statusElement.textContent = "Could not import card art";
      return null;
    }
  }).finally(() => {
    if (state.tcgdexCardImportPromises.get(cardId) === importPromise) {
      state.tcgdexCardImportPromises.delete(cardId);
    }
  });
  state.tcgdexCardImportPromises.set(cardId, importPromise);

  const imported = await importPromise;
  if (imported && renderAfterImport) {
    renderAll();
  }
  return imported;
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

function renderCardLibrary() {
  els.cardLibrary.replaceChildren();
  els.cardLibrary.hidden = !state.project.cards.length;

  if (!state.project.cards.length) {
    return;
  }

  state.project.cards.forEach((card) => {
    const item = document.createElement("div");
    item.className = [
      "library-item",
      "card-library-item",
      card.id === state.selectedCardId ? "selected" : "",
      isCardOwned(card) ? "" : "not-owned",
    ]
      .filter(Boolean)
      .join(" ");
    item.draggable = true;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Copy ${card.name} to placement clipboard`);
    item.innerHTML = `<img alt=""><span></span><label class="card-owned-control"><input type="checkbox"><span>Have</span></label>`;
    item.querySelector("img").src = getAssetImageSrc(card);
    item.querySelector("img").alt = card.name;
    item.querySelector("span").textContent = card.name;
    item.querySelector(".card-owned-control").addEventListener("click", (event) => {
      event.stopPropagation();
    });
    const ownedInput = item.querySelector(".card-owned-control input");
    ownedInput.checked = isCardOwned(card);
    ownedInput.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    ownedInput.addEventListener("change", (event) => {
      event.stopPropagation();
      setCardOwned(card.id, ownedInput.checked);
    });
    item.addEventListener("click", () => {
      setCardPlacementClipboard(card);
      renderCardLibrary();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setCardPlacementClipboard(card);
        renderCardLibrary();
      }
    });
    item.addEventListener("dragstart", (event) => {
      state.draggedCardAssetId = card.id;
      state.draggedCardPreviewAsset = card;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", card.name || "Imported card");
      event.dataTransfer.setData("application/x-michi-card-asset-id", card.id);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      clearDraggedCardDragState();
      item.classList.remove("dragging");
    });
    els.cardLibrary.append(item);
  });
}

function setCardOwned(cardId, owned) {
  const card = getCard(cardId);
  if (!card) return;

  card.owned = owned;
  saveProject(`${card.name} marked ${owned ? "owned" : "needed"}`);
  renderAll();
}

function renderImageLibrary() {
  els.imageLibrary.replaceChildren();
  if (document.activeElement !== els.imageSearchInput) {
    els.imageSearchInput.value = state.imageSearchQuery;
  }

  if (!state.project.images.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No images";
    els.imageLibrary.append(empty);
    return;
  }

  const query = state.imageSearchQuery.trim().toLowerCase();
  const images = query
    ? state.project.images.filter((image) => image.name.toLowerCase().includes(query))
    : state.project.images;

  if (!images.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No matching images";
    els.imageLibrary.append(empty);
    return;
  }

  images.forEach((image) => {
    const item = document.createElement("div");
    item.className = `library-item${image.id === state.selectedImageId ? " selected" : ""}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Select ${image.name}`);
    item.innerHTML = `<img alt=""><span></span><button type="button" class="place-image-button">Place</button><button type="button" class="rename-image-button">Rename</button><button type="button" class="delete-image-button danger">Delete</button>`;
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
    item.querySelector(".delete-image-button").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteImageAsset(image.id);
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

function deleteImageAsset(imageId) {
  const image = state.project.images.find((candidate) => candidate.id === imageId);
  if (!image) return;

  const placementCount = state.project.pages.reduce(
    (count, page) => count + page.placements.filter((placement) => placement.imageId === imageId).length,
    0,
  );
  const message = placementCount
    ? `Delete "${image.name}" and remove ${placementCount} placement${placementCount === 1 ? "" : "s"} from the binder?`
    : `Delete "${image.name}"?`;
  if (!window.confirm(message)) {
    return;
  }

  state.project.images = state.project.images.filter((candidate) => candidate.id !== imageId);
  state.project.pages.forEach((page) => {
    page.placements = page.placements.filter((placement) => placement.imageId !== imageId);
  });

  if (state.selectedImageId === imageId) {
    state.selectedImageId = state.project.images[0]?.id || null;
  }
  if (state.selectedPlacementId) {
    const selectedStillExists = state.project.pages.some((page) =>
      page.placements.some((placement) => placement.id === state.selectedPlacementId),
    );
    if (!selectedStillExists) {
      state.selectedPlacementId = null;
    }
  }
  if (state.pendingImagePlacement?.imageId === imageId) {
    state.pendingImagePlacement = null;
  }
  if (state.imagePlacementDraft?.imageId === imageId) {
    state.imagePlacementDraft = null;
  }
  if (state.placementClipboard?.placement?.imageId === imageId) {
    state.placementClipboard = null;
  }
  state.imageNaturalSizes.delete(imageId);

  saveProject("Image deleted", { modifiedPageId: state.currentPageId });
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
  renderAll();
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
  renderAll();
}

function closeImagePlacementModal() {
  state.imagePlacementDraft = null;
  renderAll();
}

function requestImageOverlapChoice(overlappingPlacements) {
  if (state.imageOverlapChoiceResolver) {
    resolveImageOverlapChoice("cancel");
  }

  return new Promise((resolve) => {
    state.imageOverlapChoiceResolver = resolve;
    els.imageOverlapText.textContent =
      `This placement overlaps ${formatPlacementCount(overlappingPlacements.length, "existing placement")}. Choose whether the new item should sit over, sit under, or replace the existing layout.`;
    els.imageOverlapModal.hidden = false;
    window.setTimeout(() => {
      els.imageOverlapOverButton.focus();
    }, 0);
  });
}

function resolveImageOverlapChoice(choice) {
  const resolver = state.imageOverlapChoiceResolver;
  state.imageOverlapChoiceResolver = null;
  els.imageOverlapModal.hidden = true;
  if (resolver) {
    resolver(choice);
  }
}

function updateImagePlacementDraftSpan() {
  if (!state.imagePlacementDraft) {
    return;
  }

  state.imagePlacementDraft.colSpan = parsePlacementSpanInput(
    els.placementColsInput,
    state.imagePlacementDraft.colSpan,
  );
  state.imagePlacementDraft.rowSpan = parsePlacementSpanInput(
    els.placementRowsInput,
    state.imagePlacementDraft.rowSpan,
  );
  renderImagePlacementModal();
}

function parsePlacementSpanInput(input, fallback) {
  const rawValue = input.value.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  if (parsedValue > 8 && rawValue.length > 1) {
    const lastDigit = Number.parseInt(rawValue.at(-1), 10);
    if (Number.isFinite(lastDigit) && lastDigit >= 1 && lastDigit <= 8) {
      return lastDigit;
    }
  }

  return clampInteger(parsedValue, 1, 8, fallback);
}

function syncImagePlacementSpanControls() {
  const draft = state.imagePlacementDraft;
  els.placementColsInput.value = String(draft ? draft.colSpan : 1);
  els.placementRowsInput.value = String(draft ? draft.rowSpan : 1);
}

function updateImagePlacementDraftCrop(key, value) {
  if (!state.imagePlacementDraft) return;

  setImagePlacementDraftCrop({
    ...normalizeCrop(state.imagePlacementDraft.crop),
    [key]: key === "rotate" ? Number(value) : Number(value),
  });
}

function setImagePlacementDraftCrop(crop) {
  if (!state.imagePlacementDraft) return;

  state.imagePlacementDraft.crop = normalizeCrop(crop);
  syncImagePlacementCropControls();
  applyImagePlacementPreviewCrop();
}

function syncImagePlacementCropControls() {
  const crop = normalizeCrop(state.imagePlacementDraft?.crop);
  els.placementCropScaleInput.value = crop.scale;
  els.placementCropXInput.value = crop.x;
  els.placementCropYInput.value = crop.y;
  els.placementCropRotateInput.value = crop.rotate;
}

function applyImagePlacementPreviewCrop() {
  const img = els.imagePlacementPreview.querySelector(".placement-preview-image-layer img");
  if (!img || !state.imagePlacementDraft) return;

  img.style.transform = cropToTransform(state.imagePlacementDraft.crop);
}

function renderImagePlacementModal() {
  const draft = state.imagePlacementDraft;
  els.imagePlacementModal.hidden = !draft;
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
  const placementDimensions = getPlacementDimensions(draft.colSpan, draft.rowSpan);
  els.imagePlacementPreview.style.aspectRatio = `${placementDimensions.width} / ${placementDimensions.height}`;
  const previewMetrics = setImagePlacementPreviewSize(draft);
  els.imagePlacementPreview.replaceChildren();

  const frame = document.createElement("div");
  frame.className = "placement-preview-frame";
  frame.style.width = `${previewMetrics.frameWidth}px`;
  frame.style.height = `${previewMetrics.frameHeight}px`;
  frame.style.setProperty("--preview-cols", draft.colSpan);
  frame.style.setProperty("--preview-rows", draft.rowSpan);

  const imageLayer = document.createElement("div");
  imageLayer.className = "placement-preview-image-layer";
  const imageBox = getPlacementPreviewImageBox(image, previewMetrics.frameWidth, previewMetrics.frameHeight);
  imageLayer.style.width = `${imageBox.width}px`;
  imageLayer.style.height = `${imageBox.height}px`;

  const img = document.createElement("img");
  img.src = getAssetImageSrc(image);
  img.alt = image.name;
  img.style.transform = cropToTransform(draft.crop);
  imageLayer.append(img);
  frame.append(imageLayer);
  els.imagePlacementPreview.append(frame);

  syncImagePlacementSpanControls();
  syncImagePlacementCropControls();
}

function setImagePlacementPreviewSize(draft) {
  const ratio = getPlacementAspect(draft.colSpan, draft.rowSpan);
  const stageWidth = Math.round(Math.min(680, Math.max(380, window.innerWidth - 120)));
  const stageHeight = Math.round(Math.min(460, Math.max(300, window.innerHeight * 0.48)));
  const frameMaxWidth = stageWidth * 0.62;
  const frameMaxHeight = stageHeight * 0.62;
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

function getPlacementPreviewImageBox(image, frameWidth, frameHeight) {
  const frameRatio = frameWidth / frameHeight;
  const scale = getCoverImageScale(getImageRatio(image, frameRatio), frameRatio);

  return {
    width: Math.round(frameWidth * scale.width),
    height: Math.round(frameHeight * scale.height),
  };
}

function getPlacementLayerPercentSize(image, frameRatio, { fit = "cover" } = {}) {
  const imageRatio = getImageRatio(image, frameRatio);
  const scale = fit === "contain" ? getContainImageScale(imageRatio, frameRatio) : getCoverImageScale(imageRatio, frameRatio);
  return {
    width: scale.width * 100,
    height: scale.height * 100,
  };
}

function getCardPhysicalLayerScale(placement, layout) {
  const placementDimensions = getPlacementDimensions(placement.colSpan, placement.rowSpan, layout);
  const cardDimensions = getPlacementDimensions(placement.colSpan, placement.rowSpan, {
    pocketWidth: CARD_FACE_WIDTH_MM,
    pocketHeight: CARD_FACE_HEIGHT_MM,
    gapX: layout.gapX,
    gapY: layout.gapY,
  });
  return {
    width: Math.min(1, cardDimensions.width / placementDimensions.width),
    height: Math.min(1, cardDimensions.height / placementDimensions.height),
  };
}

function getCardPhysicalLayerPercentSize(placement, layout) {
  const scale = getCardPhysicalLayerScale(placement, layout);
  return {
    width: scale.width * 100,
    height: scale.height * 100,
  };
}

function getCoverImageScale(imageRatio, frameRatio) {
  if (!Number.isFinite(imageRatio) || imageRatio <= 0 || !Number.isFinite(frameRatio) || frameRatio <= 0) {
    return { width: 1, height: 1 };
  }

  if (imageRatio > frameRatio) {
    return { width: imageRatio / frameRatio, height: 1 };
  }

  return { width: 1, height: frameRatio / imageRatio };
}

function getContainImageScale(imageRatio, frameRatio) {
  if (!Number.isFinite(imageRatio) || imageRatio <= 0 || !Number.isFinite(frameRatio) || frameRatio <= 0) {
    return { width: 1, height: 1 };
  }

  if (imageRatio > frameRatio) {
    return { width: 1, height: frameRatio / imageRatio };
  }

  return { width: imageRatio / frameRatio, height: 1 };
}

function getImageRatio(image, fallbackRatio) {
  const naturalSize = ensureImageNaturalSize(image);
  return naturalSize ? naturalSize.width / naturalSize.height : fallbackRatio;
}

function ensureImageNaturalSize(image) {
  const imageSrc = getAssetImageSrc(image);
  if (!image?.id || !imageSrc) return null;

  const cached = state.imageNaturalSizes.get(image.id);
  if (cached) return cached;
  if (state.imageNaturalSizeLoads.has(image.id)) return null;

  state.imageNaturalSizeLoads.add(image.id);
  const probe = new Image();
  probe.addEventListener(
    "load",
    () => {
      state.imageNaturalSizeLoads.delete(image.id);
      if (probe.naturalWidth && probe.naturalHeight) {
        state.imageNaturalSizes.set(image.id, {
          width: probe.naturalWidth,
          height: probe.naturalHeight,
        });
      }
      if (state.imagePlacementDraft?.imageId === image.id) {
        renderImagePlacementModal();
      }
      renderBinder();
    },
    { once: true },
  );
  probe.addEventListener(
    "error",
    () => {
      state.imageNaturalSizeLoads.delete(image.id);
    },
    { once: true },
  );
  if (!imageSrc.startsWith("data:")) {
    probe.crossOrigin = "anonymous";
  }
  probe.src = imageSrc;
  return null;
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

  page.placements = page.placements.map((candidate) =>
    candidate.id === placement.id ? nextPlacement : candidate,
  );
  state.imagePlacementDraft = null;
  state.selectedPlacementId = nextPlacement.id;
  saveProject("Placement updated", { modifiedPageId: page.id });
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
        await placeCardInPendingSlot(cardAsset.id);
      }
    });
    els.cardInsertSearchResults.append(result);
  });

  if (state.cardInsertSearchHasMore) {
    const loadMore = document.createElement("button");
    loadMore.type = "button";
    loadMore.className = "load-more-button";
    loadMore.disabled = state.cardInsertSearchLoading;
    loadMore.textContent = state.cardInsertSearchLoading ? "Loading..." : "Load More";
    loadMore.addEventListener("click", () => {
      searchCardInsertTcgdexCards({ append: true });
    });
    els.cardInsertSearchResults.append(loadMore);
  }
}

function openCardInsertPrompt(pageId, row, col) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!page) return;

  state.currentPageId = page.id;
  state.selectedPlacementId = null;
  state.cardInsertSearchResults = [];
  state.cardInsertSearchLoading = false;
  state.cardInsertSearchQuery = "";
  state.cardInsertSearchPage = 0;
  state.cardInsertSearchHasMore = false;
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
  state.cardInsertSearchQuery = "";
  state.cardInsertSearchPage = 0;
  state.cardInsertSearchHasMore = false;
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
  if (changed && (state.pendingImagePlacement || state.placementClipboard || state.draggedCardPreviewAsset)) {
    renderBinder();
  }
}

function clearHoveredSlot(pageId, row, col) {
  if (state.draggedCardPreviewAsset) {
    return;
  }

  if (
    state.hoveredSlot?.pageId !== pageId ||
    state.hoveredSlot.row !== row ||
    state.hoveredSlot.col !== col
  ) {
    return;
  }

  state.hoveredSlot = null;
  if (state.pendingImagePlacement || state.placementClipboard || state.draggedCardPreviewAsset) {
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

function getClipboardHoverPlacement(pageId) {
  const clipboard = state.placementClipboard;
  if (!clipboard || state.hoveredSlot?.pageId !== pageId) {
    return null;
  }

  return {
    id: "clipboard-placement-preview",
    imageId: clipboard.placement.imageId,
    row: state.hoveredSlot.row,
    col: state.hoveredSlot.col,
    rowSpan: clipboard.placement.rowSpan,
    colSpan: clipboard.placement.colSpan,
    crop: normalizeCrop(clipboard.placement.crop),
  };
}

function getDraggedCardHoverPlacement(pageId) {
  const card = getDraggedCardPreviewAsset();
  if (!card || state.hoveredSlot?.pageId !== pageId) {
    return null;
  }

  return {
    id: "dragged-card-placement-preview",
    imageId: card.id,
    row: state.hoveredSlot.row,
    col: state.hoveredSlot.col,
    rowSpan: 1,
    colSpan: 1,
    crop: { ...DEFAULT_CROP },
  };
}

function getDraggedCardPreviewAsset() {
  if (state.draggedCardAssetId) {
    return getCard(state.draggedCardAssetId);
  }
  return state.draggedCardPreviewAsset;
}

function setDraggedCardPreviewAsset(card) {
  const imageUrl = getTcgdexCardImageUrl(card, "low", "webp") || getTcgdexCardImageUrl(card, "high", "png");
  state.draggedCardPreviewAsset = imageUrl
    ? {
        id: "dragged-card-preview-asset",
        name: card.name || "Dragged card",
        imageUrl,
        source: "tcgdex",
      }
    : null;
}

function clearDraggedCardDragState() {
  state.draggedCardResult = null;
  state.draggedCardAssetId = null;
  state.draggedCardPreviewAsset = null;
  const hovered = state.hoveredSlot;
  state.hoveredSlot = null;
  if (hovered) {
    renderBinder();
  }
}

async function placeCardInPendingSlot(cardId) {
  const pendingSlot = state.pendingCardSlot;
  if (!pendingSlot) return;

  await placeCardAtSlot(cardId, pendingSlot.pageId, pendingSlot.row, pendingSlot.col);
}

async function placeCardAtSlot(cardId, pageId, row, col) {
  const card = getCard(cardId);
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  if (!card || !page) {
    setStatus("Card could not be placed");
    return false;
  }

  const nextPlacement = {
    id: createId(),
    imageId: card.id,
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    crop: { ...DEFAULT_CROP },
  };

  const overlapPlan = await confirmPlacementOverlapPlan(page, nextPlacement, { allowLayerOnImages: true });
  if (!overlapPlan) {
    return false;
  }

  removePlannedOverlaps(page, overlapPlan);
  page.placements.push(nextPlacement);
  state.currentPageId = page.id;
  state.selectedCardId = card.id;
  state.selectedPlacementId = nextPlacement.id;
  state.pendingCardSlot = null;
  saveProject("Card placed", { modifiedPageId: page.id, placedAssetId: card.id });
  renderAll();
  return true;
}

function getSlotKey(row, col) {
  return `${row}:${col}`;
}

function getCardOccupiedSlots(page, grid = getProjectGrid()) {
  return getCardOccupiedSlotsForAssetIds(page, grid, getProjectCardAssetIds(state.project));
}

function getCardOccupiedSlotsForAssetIds(page, grid, cardAssetIds) {
  const slots = new Set();
  const placements = Array.isArray(page?.placements) ? page.placements : [];
  placements
    .filter((placement) => cardAssetIds.has(placement?.imageId) && placementFits(placement, grid.rows, grid.cols))
    .forEach((placement) => {
      for (let row = placement.row; row < placement.row + placement.rowSpan; row += 1) {
        for (let col = placement.col; col < placement.col + placement.colSpan; col += 1) {
          slots.add(getSlotKey(row, col));
        }
      }
    });
  return slots;
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
  scheduleBinderMeasurement(naturalWidth, naturalHeight);
}

function scheduleBinderMeasurement(fallbackWidth, fallbackHeight) {
  if (state.binderMeasureFrameId !== null) {
    window.cancelAnimationFrame(state.binderMeasureFrameId);
  }

  state.binderMeasureFrameId = window.requestAnimationFrame(() => {
    state.binderMeasureFrameId = null;
    const spreadInner = els.spreadCanvas.querySelector(".spread-inner");
    els.spreadCanvas.style.setProperty(
      "--binder-natural-width",
      `${Math.ceil(spreadInner?.offsetWidth || fallbackWidth)}px`,
    );
    els.spreadCanvas.style.setProperty(
      "--binder-natural-height",
      `${Math.ceil(spreadInner?.offsetHeight || fallbackHeight)}px`,
    );
    applyBinderZoom();
  });
}

function estimatePreviewNaturalHeight(grid) {
  const maxPageWidth = 920;
  const sheetHorizontalPadding = 48;
  const spineAndGap = 42;
  const gridWidth = maxPageWidth - sheetHorizontalPadding - spineAndGap;
  const gridDimensions = getGridDimensions(grid);
  const gridHeight = gridWidth / (gridDimensions.width / gridDimensions.height);
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
  const layout = getProjectLayout();
  const gridDimensions = getGridDimensions(grid, layout);
  binderGrid.style.gridTemplateColumns = `repeat(${grid.cols}, minmax(0, 1fr))`;
  binderGrid.style.gridTemplateRows = `repeat(${grid.rows}, minmax(0, 1fr))`;
  binderGrid.style.aspectRatio = `${gridDimensions.width} / ${gridDimensions.height}`;
  binderGrid.style.columnGap = `${(layout.gapX / gridDimensions.width) * 100}%`;
  binderGrid.style.rowGap = `${(layout.gapY / gridDimensions.height) * 100}%`;
  const cardOccupiedSlots = getCardOccupiedSlots(page, grid);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const pocket = document.createElement("button");
      pocket.type = "button";
      pocket.className = `pocket${cardOccupiedSlots.has(getSlotKey(row, col)) ? " card-occupied" : ""}`;
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
      pocket.addEventListener("dragover", (event) => {
        if (!state.draggedCardResult && !state.draggedCardAssetId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setHoveredSlot({ pageId: page.id, row, col });
        pocket.classList.add("dragover");
      });
      pocket.addEventListener("dragleave", () => {
        pocket.classList.remove("dragover");
        clearHoveredSlot(page.id, row, col);
      });
      pocket.addEventListener("drop", async (event) => {
        if (!state.draggedCardResult && !state.draggedCardAssetId) return;
        event.preventDefault();
        event.stopPropagation();
        pocket.classList.remove("dragover");
        const card = state.draggedCardResult;
        const cardAssetId = state.draggedCardAssetId;
        clearDraggedCardDragState();
        const cardAsset = cardAssetId
          ? getCard(cardAssetId)
          : await importTcgdexCardArt(card, {
              statusElement: els.cardSearchStatus,
              renderAfterImport: false,
            });
        if (cardAsset) {
          await placeCardAtSlot(cardAsset.id, page.id, row, col);
        }
      });
      pocket.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (state.placementClipboard) {
          await pastePlacementClipboardAtSlot(page.id, row, col);
          return;
        }
        if (state.pendingImagePlacement) {
          await placePendingImage(page.id, row, col);
          return;
        }
        openCardInsertPrompt(page.id, row, col);
      });
      binderGrid.append(pocket);
    }
  }

  const hoverPlacement = getPendingImageHoverPlacement(page.id);
  if (hoverPlacement) {
    const hover = createPlacementPreviewBlock(hoverPlacement, grid, layout);
    if (hover) {
      binderGrid.append(hover);
    }
  }

  const clipboardHoverPlacement = getClipboardHoverPlacement(page.id);
  if (clipboardHoverPlacement) {
    const hover = createPlacementPreviewBlock(clipboardHoverPlacement, grid, layout);
    if (hover) {
      binderGrid.append(hover);
    }
  }

  const draggedCardHoverPlacement = getDraggedCardHoverPlacement(page.id);
  if (draggedCardHoverPlacement) {
    const hover = createPlacementPreviewBlock(draggedCardHoverPlacement, grid, layout, {
      image: getDraggedCardPreviewAsset(),
      isCard: true,
      previewClass: "drag-card-preview",
    });
    if (hover) {
      binderGrid.append(hover);
    }
  }

  getSegmentedPlacementRenderEntries(page).forEach((entry) => {
    const { placement, image, segment, segmentIndex, segmentCount, renderIndex } = entry;
    const gridPlacement = segment || placement;
    const showPlacementControls = !segment || segmentIndex === 0;

    const item = document.createElement("button");
    item.type = "button";
    item.className = [
      "placement",
      segment ? "placement-segment" : "",
      segmentCount > 1 ? "segmented" : "",
      entry.isCard ? "card-placement" : "",
      entry.isCard && !isCardOwned(image) ? "not-owned-card" : "",
      showPlacementControls ? "" : "placement-controls-hidden",
      placement.id === state.selectedPlacementId ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    item.style.gridRow = `${gridPlacement.row + 1} / span ${gridPlacement.rowSpan}`;
    item.style.gridColumn = `${gridPlacement.col + 1} / span ${gridPlacement.colSpan}`;
    item.style.zIndex = String(20 + renderIndex);
    item.setAttribute(
      "aria-label",
      `${image.name}${segmentCount > 1 ? " segment" : ""}, page ${pageNumber}, row ${gridPlacement.row + 1}, column ${gridPlacement.col + 1}`,
    );

    item.append(createPlacementImageLayer(image, placement, layout, segment));

    const badge = document.createElement("span");
    badge.className = "placement-badge";
    badge.textContent = `${placement.colSpan}x${placement.rowSpan}`;
    item.append(badge);

    const trash = document.createElement("span");
    trash.className = "placement-trash";
    trash.setAttribute("aria-hidden", "true");
    trash.title = "Delete from layout";
    item.append(trash);

    const placementIsCard = isCardPlacement(placement);
    if (placementIsCard) {
      const viewArt = document.createElement("span");
      viewArt.className = "placement-view-art";
      viewArt.title = "View card art";
      viewArt.setAttribute("aria-label", "View card art");
      viewArt.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2.1 12s3.6-6.5 9.9-6.5 9.9 6.5 9.9 6.5-3.6 6.5-9.9 6.5S2.1 12 2.1 12Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
      item.append(viewArt);

      const ownedToggle = document.createElement("span");
      ownedToggle.className = "placement-owned-toggle";
      ownedToggle.textContent = isCardOwned(image) ? "Have" : "Need";
      ownedToggle.title = isCardOwned(image) ? "Mark as needed" : "Mark as owned";
      item.append(ownedToggle);
    }

    if (!placementIsCard) {
      const edit = document.createElement("span");
      edit.className = "placement-edit";
      edit.textContent = "✎";
      edit.setAttribute("aria-label", "Edit placement");
      edit.title = "Edit placement";
      item.append(edit);
    }

    item.addEventListener("mousemove", (event) => {
      const slot = getSlotFromBinderGridEvent(event, binderGrid, grid);
      if (slot) {
        setHoveredSlot({ pageId: page.id, row: slot.row, col: slot.col });
      }
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("dragover");
      const hovered = state.hoveredSlot;
      if (hovered?.pageId === page.id) {
        clearHoveredSlot(hovered.pageId, hovered.row, hovered.col);
      }
    });

    item.addEventListener("dragover", (event) => {
      if (!state.draggedCardResult && !state.draggedCardAssetId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      const slot = getSlotFromBinderGridEvent(event, binderGrid, grid);
      if (slot) {
        setHoveredSlot({ pageId: page.id, row: slot.row, col: slot.col });
        item.classList.add("dragover");
      }
    });

    item.addEventListener("drop", async (event) => {
      if (!state.draggedCardResult && !state.draggedCardAssetId) return;
      event.preventDefault();
      event.stopPropagation();
      item.classList.remove("dragover");
      const slot = getSlotFromBinderGridEvent(event, binderGrid, grid);
      if (!slot) {
        clearDraggedCardDragState();
        setStatus("Drop on a card slot");
        return;
      }

      const card = state.draggedCardResult;
      const cardAssetId = state.draggedCardAssetId;
      clearDraggedCardDragState();
      const cardAsset = cardAssetId
        ? getCard(cardAssetId)
        : await importTcgdexCardArt(card, {
            statusElement: els.cardSearchStatus,
            renderAfterImport: false,
          });
      if (cardAsset) {
        await placeCardAtSlot(cardAsset.id, page.id, slot.row, slot.col);
      }
    });

    item.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (event.target.closest(".placement-trash")) {
        deletePlacement(page.id, placement.id);
        return;
      }

      if (event.target.closest(".placement-edit")) {
        if (placementIsCard) {
          return;
        }
        openPlacementEditModal(page.id, placement.id);
        return;
      }

      if (event.target.closest(".placement-view-art")) {
        openCardArtModal(image);
        return;
      }

      if (event.target.closest(".placement-owned-toggle")) {
        setCardOwned(image.id, !isCardOwned(image));
        return;
      }

      if (state.pendingImagePlacement) {
        const slot = getSlotFromBinderGridEvent(event, binderGrid, grid);
        if (slot) {
          await placePendingImage(page.id, slot.row, slot.col);
        } else {
          setStatus("Click inside a card slot to place the image");
        }
        return;
      }

      if (state.placementClipboard) {
        const slot = getSlotFromBinderGridEvent(event, binderGrid, grid);
        if (slot) {
          await pastePlacementClipboardAtSlot(page.id, slot.row, slot.col, placement.id);
          return;
        }

        setStatus("Click inside a card slot to paste");
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

function createPlacementPreviewBlock(placement, grid, layout, options = {}) {
  const image = options.image || getImage(placement.imageId);
  if (!image) return null;

  const item = document.createElement("div");
  const isCard = options.isCard || isCardAssetId(placement.imageId);
  item.className = [
    "placement",
    "clipboard-preview",
    options.previewClass || "",
    isCard ? "card-placement" : "",
    isCard && !isCardOwned(image) ? "not-owned-card" : "",
    placementFits(placement, grid.rows, grid.cols) ? "" : "invalid",
  ]
    .filter(Boolean)
    .join(" ");
  item.style.gridRow = `${placement.row + 1} / span ${placement.rowSpan}`;
  item.style.gridColumn = `${placement.col + 1} / span ${placement.colSpan}`;

  item.append(createPlacementImageLayer(image, placement, layout, null, { forceCard: isCard }));
  return item;
}

function createPlacementImageLayer(image, placement, layout, segment = null, options = {}) {
  const imageLayer = document.createElement("span");
  const placementIsCard = options.forceCard || isCardPlacement(placement);
  imageLayer.className = `placement-image-layer${placementIsCard ? " card-image-layer" : ""}`;
  const frameRatio = getPlacementAspect(placement.colSpan, placement.rowSpan, layout);
  const layerSize = placementIsCard
    ? getCardPhysicalLayerPercentSize(placement, layout)
    : getPlacementLayerPercentSize(image, frameRatio);

  if (segment) {
    const fullDimensions = getPlacementDimensions(placement.colSpan, placement.rowSpan, layout);
    const segmentDimensions = getPlacementDimensions(segment.colSpan, segment.rowSpan, layout);
    const offsetX = segment.sourceCol * (layout.pocketWidth + layout.gapX);
    const offsetY = segment.sourceRow * (layout.pocketHeight + layout.gapY);

    imageLayer.style.left = `${((fullDimensions.width / 2 - offsetX) / segmentDimensions.width) * 100}%`;
    imageLayer.style.top = `${((fullDimensions.height / 2 - offsetY) / segmentDimensions.height) * 100}%`;
    imageLayer.style.width = `${(fullDimensions.width * layerSize.width) / segmentDimensions.width}%`;
    imageLayer.style.height = `${(fullDimensions.height * layerSize.height) / segmentDimensions.height}%`;
  } else {
    imageLayer.style.width = `${layerSize.width}%`;
    imageLayer.style.height = `${layerSize.height}%`;
  }

  const img = document.createElement("img");
  img.src = getAssetImageSrc(image);
  img.alt = image.name || "";
  img.style.transform = cropToTransform(placement.crop);
  if (placementIsCard) {
    const cardFace = document.createElement("span");
    cardFace.className = "placement-card-face";
    cardFace.append(img);
    imageLayer.append(cardFace);
  } else {
    imageLayer.append(img);
  }
  return imageLayer;
}

function cropToTransform(crop) {
  const safeCrop = normalizeCrop(crop);
  // Crop edits are non-destructive: the original image source stays intact and CSS clips the view.
  return `translate(${safeCrop.x}%, ${safeCrop.y}%) rotate(${safeCrop.rotate}deg) scale(${safeCrop.scale})`;
}

async function placePendingImage(pageId, row, col) {
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

  const overlapPlan = await confirmPlacementOverlapPlan(page, nextPlacement, { allowLayerOnImages: true });
  if (!overlapPlan) {
    return;
  }

  applyOverlapLayerChoice(page, nextPlacement, overlapPlan);
  removePlannedOverlaps(page, overlapPlan);
  page.placements.push(nextPlacement);
  state.selectedPlacementId = nextPlacement.id;
  state.pendingImagePlacement = null;
  saveProject("Image placed", { modifiedPageId: page.id, placedAssetId: nextPlacement.imageId });
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

function isCardAssetId(imageId) {
  return state.project.cards.some((card) => card.id === imageId);
}

function isCardOwned(cardOrImageId) {
  const card = typeof cardOrImageId === "string" ? getCard(cardOrImageId) : cardOrImageId;
  return !card || card.owned !== false;
}

function isCardPlacement(placement) {
  return isCardAssetId(placement?.imageId);
}

function isImagePlacement(placement) {
  return Boolean(getImage(placement?.imageId)) && !isCardPlacement(placement);
}

function getPlacementsInRenderOrder(page) {
  return page.placements
    .map((placement, index) => ({ placement, index }))
    .sort((a, b) => getPlacementLayer(a.placement, a.index) - getPlacementLayer(b.placement, b.index) || a.index - b.index)
    .map((entry) => entry.placement);
}

function findPlacementAtSlot(page, row, col) {
  return getPlacementsInRenderOrder(page)
    .slice()
    .reverse()
    .find((placement) => placementCoversSlot(placement, row, col)) || null;
}

function placementCoversSlot(placement, row, col) {
  return (
    row >= placement.row &&
    row < placement.row + placement.rowSpan &&
    col >= placement.col &&
    col < placement.col + placement.colSpan
  );
}

function getPlacementLayer(placement, index = 0) {
  const explicitLayer = normalizePlacementLayer(placement?.layer);
  if (explicitLayer !== null) {
    return explicitLayer;
  }

  return index + (isCardPlacement(placement) ? 10000 : 0);
}

function getSegmentedPlacementRenderEntries(page) {
  const orderedPlacements = getPlacementsInRenderOrder(page);
  const orderedEntries = orderedPlacements.map((placement, renderIndex) => ({
    placement,
    image: getImage(placement.imageId),
    isCard: isCardPlacement(placement),
    renderIndex,
  }));

  return orderedEntries.flatMap((entry, index) => {
    if (!entry.image || !hasAssetImage(entry.image)) return [];
    if (entry.isCard || !isImagePlacement(entry.placement)) {
      return [{ ...entry, segment: null, segmentIndex: 0, segmentCount: 1 }];
    }

    const higherPlacements = orderedEntries
      .slice(index + 1)
      .map((candidate) => candidate.placement)
      .filter((placement) => placementsOverlap(placement, entry.placement));
    const segments = getVisiblePlacementSegments(entry.placement, higherPlacements);

    if (!segments.length) {
      return [];
    }

    return segments.map((segment, segmentIndex) => ({
      ...entry,
      segment,
      segmentIndex,
      segmentCount: segments.length,
    }));
  });
}

function getVisiblePlacementSegments(placement, blockers) {
  const rows = placement.rowSpan;
  const cols = placement.colSpan;
  const visible = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));

  blockers.forEach((blocker) => {
    const rowStart = Math.max(placement.row, blocker.row);
    const rowEnd = Math.min(placement.row + placement.rowSpan, blocker.row + blocker.rowSpan);
    const colStart = Math.max(placement.col, blocker.col);
    const colEnd = Math.min(placement.col + placement.colSpan, blocker.col + blocker.colSpan);

    for (let row = rowStart; row < rowEnd; row += 1) {
      for (let col = colStart; col < colEnd; col += 1) {
        visible[row - placement.row][col - placement.col] = false;
      }
    }
  });

  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const segments = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!visible[row][col] || visited[row][col]) continue;

      let colSpan = 1;
      while (col + colSpan < cols && visible[row][col + colSpan] && !visited[row][col + colSpan]) {
        colSpan += 1;
      }

      let rowSpan = 1;
      while (row + rowSpan < rows) {
        let canExtend = true;
        for (let scanCol = col; scanCol < col + colSpan; scanCol += 1) {
          if (!visible[row + rowSpan][scanCol] || visited[row + rowSpan][scanCol]) {
            canExtend = false;
            break;
          }
        }
        if (!canExtend) break;
        rowSpan += 1;
      }

      for (let markRow = row; markRow < row + rowSpan; markRow += 1) {
        for (let markCol = col; markCol < col + colSpan; markCol += 1) {
          visited[markRow][markCol] = true;
        }
      }

      segments.push({
        row: placement.row + row,
        col: placement.col + col,
        rowSpan,
        colSpan,
        sourceRow: row,
        sourceCol: col,
      });
    }
  }

  return segments;
}

async function confirmPlacementOverlapPlan(page, nextPlacement, options = {}) {
  const ignoredIds = new Set(options.ignoredPlacementIds || []);
  const overlapping = page.placements.filter(
    (placement) => !ignoredIds.has(placement.id) && placementsOverlap(placement, nextPlacement),
  );
  if (options.allowLayerOnImages && overlapping.length) {
    const choice = await requestImageOverlapChoice(overlapping);
    if (choice === "cancel") {
      return null;
    }
    if (choice === "replace") {
      return {
        replaceOverlaps: overlapping,
        overlapping,
      };
    }
    return {
      replaceOverlaps: [],
      overlapping,
      layerChoice: choice,
    };
  }

  const canLayerOnImages = options.allowLayerOnImages || (options.allowCardOnImages && isCardPlacement(nextPlacement));
  const layeredImageOverlaps = canLayerOnImages ? overlapping.filter(isImagePlacement) : [];
  const replaceOverlaps = canLayerOnImages
    ? overlapping.filter((placement) => !isImagePlacement(placement))
    : overlapping;

  if (layeredImageOverlaps.length) {
    const assetKind = isCardPlacement(nextPlacement) ? "card" : "image";
    const replaceText = replaceOverlaps.length
      ? ` This will also replace ${formatPlacementCount(replaceOverlaps.length, "overlapping placement")}.`
      : "";
    if (
      !window.confirm(
        `Place this ${assetKind} on top of ${formatPlacementCount(layeredImageOverlaps.length, "image placement")}? This breaks the lower image into binder-page segments.${replaceText}`,
      )
    ) {
      return null;
    }
  } else if (
    replaceOverlaps.length &&
    !window.confirm(`Replace ${formatPlacementCount(replaceOverlaps.length, "overlapping placement")}?`)
  ) {
    return null;
  }

  return { replaceOverlaps };
}

function applyOverlapLayerChoice(page, nextPlacement, overlapPlan) {
  if (!overlapPlan?.layerChoice || !overlapPlan.overlapping?.length) {
    return;
  }

  const overlapLayers = overlapPlan.overlapping.map((placement) =>
    getPlacementLayer(placement, page.placements.indexOf(placement)),
  );
  if (overlapPlan.layerChoice === "overlap") {
    nextPlacement.layer = Math.max(...overlapLayers) + 1;
  } else if (overlapPlan.layerChoice === "underlap") {
    nextPlacement.layer = Math.min(...overlapLayers) - 1;
  }
}

function formatPlacementCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function removePlannedOverlaps(page, overlapPlan) {
  const removeIds = new Set(overlapPlan.replaceOverlaps.map((placement) => placement.id));
  if (!removeIds.size) return;
  page.placements = page.placements.filter((placement) => !removeIds.has(placement.id));
}

function getSlotFromBinderGridEvent(event, binderGrid, grid) {
  const bounds = binderGrid.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;

  const relativeX = event.clientX - bounds.left;
  const relativeY = event.clientY - bounds.top;
  if (relativeX < 0 || relativeY < 0 || relativeX > bounds.width || relativeY > bounds.height) {
    return null;
  }

  const layout = getProjectLayout();
  const gridDimensions = getGridDimensions(grid, layout);
  const gapX = ((layout.gapX || 0) / gridDimensions.width) * bounds.width;
  const gapY = ((layout.gapY || 0) / gridDimensions.height) * bounds.height;
  const slotWidth = (bounds.width - gapX * (grid.cols - 1)) / grid.cols;
  const slotHeight = (bounds.height - gapY * (grid.rows - 1)) / grid.rows;
  const stepX = slotWidth + gapX;
  const stepY = slotHeight + gapY;
  const col = clampInteger(Math.floor(relativeX / stepX), 0, grid.cols - 1, 0);
  const row = clampInteger(Math.floor(relativeY / stepY), 0, grid.rows - 1, 0);
  const withinSlotX = relativeX - col * stepX;
  const withinSlotY = relativeY - row * stepY;
  const gapTolerance = 4;

  if (withinSlotX > slotWidth + gapTolerance || withinSlotY > slotHeight + gapTolerance) {
    return null;
  }

  return { row, col };
}

function setCardPlacementClipboard(cardAsset) {
  if (!cardAsset) return false;

  state.placementClipboard = {
    mode: "copy",
    sourcePageId: null,
    sourcePlacementId: null,
    assetName: cardAsset.name,
    placement: {
      imageId: cardAsset.id,
      rowSpan: 1,
      colSpan: 1,
      crop: { ...DEFAULT_CROP },
    },
  };
  state.selectedCardId = cardAsset.id;
  setStatus(`Copied ${cardAsset.name}. Click a target slot to paste.`);
  renderCardLibrary();
  renderCardInsertPrompt();
  return true;
}

function clearPlacementClipboard(message = "Clipboard cleared") {
  state.placementClipboard = null;
  state.hoveredSlot = null;
  setStatus(message);
  renderAll();
}

function copySelectedPlacement(mode = "copy") {
  const page = getCurrentPage();
  const placement = getSelectedPlacement();
  const asset = placement ? getImage(placement.imageId) : null;
  if (!page || !placement || !asset) {
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

function getClipboardSourcePlacement(clipboard = state.placementClipboard) {
  if (!clipboard?.sourcePageId || !clipboard.sourcePlacementId) {
    return null;
  }

  const sourcePage = state.project.pages.find((page) => page.id === clipboard.sourcePageId);
  const sourcePlacement = sourcePage?.placements.find((placement) => placement.id === clipboard.sourcePlacementId);
  return sourcePage && sourcePlacement ? { sourcePage, sourcePlacement } : null;
}

function swapClipboardIntoSlot(targetPageId, row, col, targetPlacementId = null) {
  const source = getClipboardSourcePlacement();
  const targetPage = state.project.pages.find((page) => page.id === targetPageId);
  if (!source || !targetPage) {
    clearPlacementClipboard("Nothing to swap");
    return false;
  }

  const { sourcePage, sourcePlacement } = source;
  const sourceOriginal = { row: sourcePlacement.row, col: sourcePlacement.col };
  if (sourcePage === targetPage && sourceOriginal.row === row && sourceOriginal.col === col) {
    clearPlacementClipboard("Swap cancelled");
    return true;
  }

  const nextSourcePlacement = {
    ...sourcePlacement,
    row,
    col,
  };
  const targetPlacements = getSwapTargetPlacements(targetPage, nextSourcePlacement, targetPlacementId)
    .filter((placement) => placement.id !== sourcePlacement.id);
  if (!targetPlacements.length) {
    return false;
  }

  if (
    targetPlacements.length > 1 &&
    targetPlacements.some((placement) => !placementContains(nextSourcePlacement, placement))
  ) {
    setStatus("Swap blocked by partial target overlap");
    return false;
  }

  const nextTargetPlacements = targetPlacements.map((placement) => ({
    placement,
    nextPlacement: {
      ...placement,
      row: sourceOriginal.row + (placement.row - row),
      col: sourceOriginal.col + (placement.col - col),
    },
  }));
  const grid = getProjectGrid();
  if (
    !placementFits(nextSourcePlacement, grid.rows, grid.cols) ||
    nextTargetPlacements.some(({ nextPlacement }) => !placementFits(nextPlacement, grid.rows, grid.cols))
  ) {
    setStatus("Swap blocked by binder bounds");
    return false;
  }

  const ignoredIds = new Set([sourcePlacement.id, ...targetPlacements.map((placement) => placement.id)]);
  const sourceWouldCollide = placementCollidesOnPage(targetPage, nextSourcePlacement, ignoredIds);
  const targetsWouldCollide = nextTargetPlacements.some(({ nextPlacement }) =>
    placementCollidesOnPage(sourcePage, nextPlacement, ignoredIds),
  );
  if (sourceWouldCollide || targetsWouldCollide) {
    setStatus("Swap blocked by overlapping placement");
    return false;
  }

  if (sourcePage !== targetPage) {
    preserveExplicitLayerForMove(sourcePage, sourcePlacement);
    targetPlacements.forEach((placement) => preserveExplicitLayerForMove(targetPage, placement));
    sourcePage.placements = sourcePage.placements.filter((placement) => placement.id !== sourcePlacement.id);
    targetPage.placements = targetPage.placements.filter((placement) => !ignoredIds.has(placement.id));
    sourcePlacement.row = row;
    sourcePlacement.col = col;
    nextTargetPlacements.forEach(({ placement, nextPlacement }) => {
      placement.row = nextPlacement.row;
      placement.col = nextPlacement.col;
    });
    targetPage.placements.push(sourcePlacement);
    sourcePage.placements.push(...targetPlacements);
  } else {
    sourcePlacement.row = row;
    sourcePlacement.col = col;
    nextTargetPlacements.forEach(({ placement, nextPlacement }) => {
      placement.row = nextPlacement.row;
      placement.col = nextPlacement.col;
    });
  }

  state.currentPageId = targetPage.id;
  state.selectedPlacementId = sourcePlacement.id;
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  state.hoveredSlot = null;
  saveProject(`${targetPlacements.length + 1} placements swapped`, { modifiedPageId: targetPage.id });
  renderAll();
  return true;
}

function preserveExplicitLayerForMove(page, placement) {
  if (normalizePlacementLayer(placement.layer) !== null) {
    return;
  }

  placement.layer = getPlacementLayer(placement, page.placements.indexOf(placement));
}

function placementCollidesOnPage(page, candidate, ignoredIds = new Set()) {
  return page.placements.some(
    (placement) => !ignoredIds.has(placement.id) && placementsOverlap(placement, candidate),
  );
}

function getSwapTargetPlacements(page, footprint, targetPlacementId = null) {
  const targets = new Map();
  for (let row = footprint.row; row < footprint.row + footprint.rowSpan; row += 1) {
    for (let col = footprint.col; col < footprint.col + footprint.colSpan; col += 1) {
      const placement = findPlacementAtSlot(page, row, col);
      if (placement) {
        targets.set(placement.id, placement);
      }
    }
  }

  if (targetPlacementId) {
    const clickedPlacement = page.placements.find((placement) => placement.id === targetPlacementId);
    if (clickedPlacement && placementsOverlap(clickedPlacement, footprint)) {
      targets.set(clickedPlacement.id, clickedPlacement);
    }
  }

  return [...targets.values()];
}

function placementContains(container, placement) {
  return (
    placement.row >= container.row &&
    placement.col >= container.col &&
    placement.row + placement.rowSpan <= container.row + container.rowSpan &&
    placement.col + placement.colSpan <= container.col + container.colSpan
  );
}

async function pastePlacementClipboardAtSlot(pageId, row, col, targetPlacementId = null) {
  const clipboard = state.placementClipboard;
  if (!clipboard) {
    setStatus("Nothing to paste");
    return false;
  }

  if (clipboard.sourcePlacementId) {
    const swapped = swapClipboardIntoSlot(pageId, row, col, targetPlacementId);
    if (swapped || !state.placementClipboard) {
      return swapped;
    }
  }

  return pastePlacementClipboard(pageId, row, col);
}

async function pastePlacementClipboard(pageId, row, col) {
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

  const overlapPlan = await confirmPlacementOverlapPlan(page, nextPlacement, {
    allowLayerOnImages: true,
    ignoredPlacementIds:
      clipboard.mode === "cut" && clipboard.sourcePageId === page.id ? [clipboard.sourcePlacementId] : [],
  });
  if (!overlapPlan) {
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

  applyOverlapLayerChoice(page, nextPlacement, overlapPlan);
  removePlannedOverlaps(page, overlapPlan);
  page.placements.push(nextPlacement);
  state.currentPageId = page.id;
  state.selectedPlacementId = nextPlacement.id;
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  saveProject(`${clipboard.mode === "cut" ? "Moved" : "Pasted"} ${asset.name}`, {
    modifiedPageId: page.id,
    placedAssetId: nextPlacement.imageId,
  });
  renderAll();
  return true;
}

function getAssetKind(asset) {
  return isCardAssetId(asset?.id) ? "card" : "image";
}

function deletePlacement(pageId, placementId, { confirmDelete = true } = {}) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  const placement = page?.placements.find((candidate) => candidate.id === placementId);
  if (!page || !placement) return false;

  const asset = getImage(placement.imageId);
  const assetKind = getAssetKind(asset);
  if (
    confirmDelete &&
    assetKind !== "card" &&
    !window.confirm(`Delete this ${assetKind} from the layout?`)
  ) {
    return false;
  }

  page.placements = page.placements.filter((candidate) => candidate.id !== placement.id);
  if (state.selectedPlacementId === placement.id) {
    state.selectedPlacementId = null;
  }
  state.currentPageId = page.id;
  saveProject(`${assetKind === "card" ? "Card" : "Image"} deleted from layout`, { modifiedPageId: page.id });
  renderAll();
  return true;
}

function deleteSelectedPlacement() {
  const page = getCurrentPage();
  if (!page || !state.selectedPlacementId) return;

  deletePlacement(page.id, state.selectedPlacementId);
}

function enqueueImageFileImport(importTask) {
  const queuedImport = state.imageFileImportQueue.then(importTask, importTask);
  state.imageFileImportQueue = queuedImport.catch(() => null);
  return queuedImport;
}

async function importImageFiles(files, fallbackName = "image") {
  const queuedFiles = Array.from(files || []);
  const persistenceToken = state.projectPersistenceToken;
  return enqueueImageFileImport(() => importImageFileBatch(queuedFiles, fallbackName, persistenceToken));
}

async function importImageFileBatch(files, fallbackName, persistenceToken) {
  if (persistenceToken !== state.projectPersistenceToken) {
    return;
  }

  const imageFiles = files.filter((file) => file?.type?.startsWith("image/"));
  if (!imageFiles.length) {
    setStatus("No image files found");
    return;
  }

  const importItems = [];
  for (const file of imageFiles) {
    if (persistenceToken !== state.projectPersistenceToken) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (persistenceToken !== state.projectPersistenceToken) {
        return;
      }

      const fallbackIndex = state.project.images.length + state.imageImportItems.length + importItems.length + 1;
      const dimensions = await getDataUrlImageDimensions(dataUrl);
      if (persistenceToken !== state.projectPersistenceToken) {
        return;
      }

      importItems.push({
        originalName: file.name || `${fallbackName}-${fallbackIndex}.png`,
        name: stripImageExtension(file.name) || titleCaseFallbackName(fallbackName, fallbackIndex),
        dataUrl,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
        crop: { ...DEFAULT_CROP },
      });
    } catch (error) {
      console.warn("Could not import image.", error);
    }
  }

  if (!importItems.length) {
    setStatus("Image import failed");
    return;
  }

  if (persistenceToken !== state.projectPersistenceToken) {
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
  els.imageImportSaveButton.disabled = state.imageImportSaving;
  els.imageImportSkipButton.disabled = state.imageImportSaving;
  if (!item) {
    els.imageImportPreviewImage.removeAttribute("src");
    return;
  }

  els.imageImportCount.textContent = `Image ${state.imageImportIndex + 1} of ${state.imageImportItems.length}`;
  setImageImportPreviewSize(item);
  els.imageImportPreviewImage.src = item.dataUrl;
  els.imageImportPreviewImage.alt = item.name || item.originalName;
  if (document.activeElement !== els.imageImportNameInput) {
    els.imageImportNameInput.value = item.name;
  }
  syncImageImportCropControls();
  applyImageImportPreviewCrop();
  window.setTimeout(() => {
    const activeElement = document.activeElement;
    const shouldFocus =
      !els.imageImportWizard.hidden &&
      (!activeElement || activeElement === document.body || !els.imageImportWizard.contains(activeElement));
    if (shouldFocus) {
      els.imageImportNameInput.focus();
      els.imageImportNameInput.select();
    }
  }, 0);
}

function setImageImportPreviewSize(item) {
  const ratio =
    Number.isFinite(item?.width / item?.height) && item.width > 0 && item.height > 0 ? item.width / item.height : 0.716;
  const stageWidth = Math.round(Math.min(680, Math.max(300, window.innerWidth - 96)));
  const stageHeight = Math.round(Math.min(460, Math.max(240, window.innerHeight * 0.46)));
  let frameWidth = stageWidth;
  let frameHeight = frameWidth / ratio;
  if (frameHeight > stageHeight) {
    frameHeight = stageHeight;
    frameWidth = frameHeight * ratio;
  }

  els.imageImportPreview.style.width = `${Math.round(frameWidth)}px`;
  els.imageImportPreview.style.height = `${Math.round(frameHeight)}px`;
}

function updateImageImportCrop(key, value) {
  const item = getCurrentImageImportItem();
  if (!item) return;

  setCurrentImageImportCrop({
    ...normalizeCrop(item.crop),
    [key]: key === "rotate" ? Number(value) : Number(value),
  });
}

function setCurrentImageImportCrop(crop) {
  const item = getCurrentImageImportItem();
  if (!item) return;

  item.crop = normalizeCrop(crop);
  syncImageImportCropControls();
  applyImageImportPreviewCrop();
}

function syncImageImportCropControls() {
  const crop = normalizeCrop(getCurrentImageImportItem()?.crop);
  els.imageImportScaleInput.value = crop.scale;
  els.imageImportXInput.value = crop.x;
  els.imageImportYInput.value = crop.y;
  els.imageImportRotateInput.value = crop.rotate;
}

function applyImageImportPreviewCrop() {
  const item = getCurrentImageImportItem();
  if (!item) return;

  els.imageImportPreviewImage.style.transform = cropToTransform(item.crop);
}

async function importCurrentWizardImage() {
  if (state.imageImportSavePromise) {
    return state.imageImportSavePromise;
  }

  const item = getCurrentImageImportItem();
  if (!item) return false;

  state.imageImportSaving = true;
  els.imageImportSaveButton.disabled = true;
  els.imageImportSkipButton.disabled = true;
  const persistenceToken = state.projectPersistenceToken;
  const savePromise = (async () => {
    try {
      const dataUrl = await createImportedImageDataUrl(item);
      if (persistenceToken !== state.projectPersistenceToken || !state.imageImportItems.includes(item)) {
        return false;
      }

      const image = {
        id: createId(),
        name: (item.name || "").trim() || stripImageExtension(item.originalName) || "Imported Image",
        dataUrl,
        source: "upload",
      };

      state.project.images.push(image);
      if (item.width && item.height) {
        state.imageNaturalSizes.set(image.id, { width: item.width, height: item.height });
      }
      state.selectedImageId = image.id;
      saveProject(`Imported ${image.name}`);
      await flushIndexedDbSaveQueue();
      if (persistenceToken !== state.projectPersistenceToken || !state.imageImportItems.includes(item)) {
        return false;
      }

      advanceImageImportWizard();
      return true;
    } catch (error) {
      console.warn("Could not finish image import.", error);
      setStatus("Image import failed");
      return false;
    } finally {
      if (state.imageImportSavePromise === savePromise) {
        state.imageImportSavePromise = null;
        state.imageImportSaving = false;
        renderAll();
      }
    }
  })();
  state.imageImportSavePromise = savePromise;
  return savePromise;
}

async function createImportedImageDataUrl(item) {
  const crop = normalizeCrop(item.crop);
  if (isDefaultCrop(crop)) {
    return item.dataUrl;
  }

  const image = await loadCanvasImage(item.dataUrl);
  const maxSide = 1800;
  const outputScale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * outputScale));
  const height = Math.max(1, Math.round(image.naturalHeight * outputScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width / 2 + (crop.x / 100) * width, height / 2 + (crop.y / 100) * height);
  ctx.rotate((crop.rotate * Math.PI) / 180);
  ctx.scale(crop.scale, crop.scale);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  return canvas.toDataURL("image/png");
}

function isDefaultCrop(crop) {
  const safeCrop = normalizeCrop(crop);
  return (
    safeCrop.scale === DEFAULT_CROP.scale &&
    safeCrop.x === DEFAULT_CROP.x &&
    safeCrop.y === DEFAULT_CROP.y &&
    safeCrop.rotate === DEFAULT_CROP.rotate
  );
}

async function getDataUrlImageDimensions(dataUrl) {
  try {
    const image = await loadCanvasImage(dataUrl);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch (error) {
    console.warn("Could not read image dimensions.", error);
    return null;
  }
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
    const rawProject = JSON.parse(text);
    const nextProject = normalizeProject(rawProject);
    nextProject.setupComplete = true;
    logProjectImportDiagnostics(rawProject, nextProject, {
      fileName: file.name,
      rawJson: text,
    });
    if (!window.confirm("Replace the current project with this JSON file?")) {
      return;
    }

    state.project = nextProject;
    state.currentPageId = state.project.pages[0].id;
    state.lastModifiedPageId = state.currentPageId;
    state.lastPlacedAssetId = getInferredLastPlacedAssetId(state.project, state.lastModifiedPageId);
    state.selectedImageId = state.project.images[0]?.id || null;
    state.selectedCardId = state.project.cards[0]?.id || null;
    clearProjectHistoryTransientState();
    resetProjectPersistenceState();
    saveProject("Project imported", { resetHistory: true });
    renderAll();
    queueTcgdexCardStorageSlimming();
    try {
      state.indexedDbSaveRequest = {
        message: "Project imported",
        options: { quiet: false, reason: "json-import" },
      };
      const persisted = await flushIndexedDbSaveQueue();
      if (persisted) {
        await refreshLocalProjectChoices();
      } else {
        setStatus("Project imported; autosave unavailable");
      }
    } catch (storageError) {
      console.warn("Could not persist imported project to IndexedDB.", storageError);
      state.indexedDbLastError = storageError;
      renderProjectControls();
      setStatus("Project imported; autosave unavailable");
    }
  } catch (error) {
    console.warn("Could not import project JSON.", error);
    setStatus("Project JSON import failed");
  }
}

async function exportFromModal(format) {
  saveExportSettingsFromControls({ closeModal: false, statusMessage: "" });
  const allSettings = getExportSettings();
  const settings = format === "pdf" ? allSettings.pdf : allSettings.png;
  if (format === "png") {
    const pages = getCurrentSpreadPages();
    if (!pages.length) {
      setStatus("No visible pages to export");
      return;
    }

    closeExportSettingsModal();
    await exportCurrentPagePng({ settings, pages });
    return;
  }

  const pageSelection = getExportPageSelection(settings);
  if (pageSelection.error) {
    setStatus(pageSelection.error);
    els.pdfExportPageRangeInput.focus();
    return;
  }
  if (!pageSelection.pages.length) {
    setStatus("No pages to export");
    return;
  }
  if (!getProjectPdfCutouts(settings, pageSelection).length) {
    setStatus("No matching cutouts to export");
    return;
  }

  closeExportSettingsModal();
  await exportCutSheetPdf({ settings, pageSelection });
}

async function exportCurrentPagePng(options = {}) {
  const settings = normalizePngExportSettings(options.settings || getExportSettings().png);
  const pages = options.pages || getCurrentSpreadPages();
  if (!pages.length) {
    setStatus("No visible pages to export");
    return;
  }

  els.exportPngButton.disabled = true;
  setStatus("Rendering PNG");

  try {
    const canvas = await renderSpreadToCanvas(pages, settings);
    const url = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(getSpreadExportName(pages))}.png`;
    anchor.click();
    setStatus("PNG exported");
  } catch (error) {
    console.warn("Could not export PNG.", error);
    setStatus("PNG export failed");
  } finally {
    els.exportPngButton.disabled = false;
  }
}

async function exportCutSheetPdf(options = {}) {
  const settings = normalizePdfExportSettings(options.settings || getExportSettings().pdf);
  const pageSelection = options.pageSelection || getExportPageSelection(settings);
  if (pageSelection.error) {
    openExportSettingsModal();
    setStatus(pageSelection.error);
    return;
  }

  const cutouts = getProjectPdfCutouts(settings, pageSelection);
  if (!cutouts.length) {
    setStatus("No matching cutouts to export");
    return;
  }

  els.exportPdfButton.disabled = true;
  setStatus("Rendering cut PDF");

  try {
    const packedPages = await packPdfCutouts(cutouts);
    const pdfBlob = buildCutSheetPdf(packedPages);
    downloadBlob(pdfBlob, `${safeFileName(state.project.name || "michi-binder")}-cut-sheets.pdf`);
    setStatus("Cut PDF exported");
  } catch (error) {
    console.warn("Could not export cut PDF.", error);
    setStatus("Cut PDF export failed");
  } finally {
    els.exportPdfButton.disabled = false;
  }
}

function getProjectPdfCutouts(settings = getExportSettings().pdf, pageSelection = getExportPageSelection(settings)) {
  const pdfSettings = normalizePdfExportSettings(settings);
  const layout = getProjectLayout();
  const cutouts = [];
  const selectedPageIndexes = new Set(pageSelection.pageIndexes);

  state.project.pages.forEach((page, pageIndex) => {
    if (!selectedPageIndexes.has(pageIndex)) return;

    const pageNumber = getPageNumber(page);
    getSegmentedPlacementRenderEntries(page).forEach((entry) => {
      const isNeededCard = entry.isCard && !isCardOwned(entry.image);
      const includeCard = entry.isCard && (pdfSettings.includeAllCards || (pdfSettings.includeNeededCards && isNeededCard));
      if (!includeCard && !isImagePlacement(entry.placement)) return;

      const visiblePlacement = entry.segment || entry.placement;
      const fullDimensions = getPlacementDimensions(entry.placement.colSpan, entry.placement.rowSpan, layout);
      const visibleDimensions = getPlacementDimensions(visiblePlacement.colSpan, visiblePlacement.rowSpan, layout);
      const sourceOffsetX = entry.segment ? entry.segment.sourceCol * (layout.pocketWidth + layout.gapX) : 0;
      const sourceOffsetY = entry.segment ? entry.segment.sourceRow * (layout.pocketHeight + layout.gapY) : 0;
      const segmentText = entry.segmentCount > 1 ? ` segment ${entry.segmentIndex + 1}/${entry.segmentCount}` : "";
      const cardText = isNeededCard ? " needed card" : "";
      const titleText = pdfSettings.includePageTitles ? ` ${page.title || `Page ${pageNumber}`}` : "";

      cutouts.push({
        id: `${page.id}-${entry.placement.id}-${entry.segmentIndex}`,
        image: entry.image,
        crop: normalizeCrop(entry.placement.crop),
        muted: isNeededCard && pdfSettings.printNeededCardsGreyscale,
        pageNumber,
        row: visiblePlacement.row,
        col: visiblePlacement.col,
        rowSpan: visiblePlacement.rowSpan,
        colSpan: visiblePlacement.colSpan,
        widthMm: visibleDimensions.width,
        heightMm: visibleDimensions.height,
        fullWidthMm: fullDimensions.width,
        fullHeightMm: fullDimensions.height,
        sourceOffsetX,
        sourceOffsetY,
        labelBase: `P${pageNumber}${titleText} R${visiblePlacement.row + 1} C${visiblePlacement.col + 1} ${visiblePlacement.colSpan}x${visiblePlacement.rowSpan}${segmentText}${cardText}`,
      });
    });
  });

  return cutouts;
}

async function packPdfCutouts(cutouts) {
  const printableWidth = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;
  const printableHeight = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2;
  const maxTileHeight = printableHeight - PDF_LABEL_GAP_MM - PDF_LABEL_HEIGHT_MM;
  const imageCache = new Map();
  const pages = [{ items: [] }];
  let currentPage = pages[0];
  let cursorX = PDF_MARGIN_MM;
  let cursorY = PDF_MARGIN_MM;
  let rowHeight = 0;

  for (const cutout of cutouts) {
    const tiles = splitPdfCutout(cutout, printableWidth, maxTileHeight);
    for (const [tileIndex, tile] of tiles.entries()) {
      const label = tiles.length > 1 ? `${cutout.labelBase} tile ${tileIndex + 1}/${tiles.length}` : cutout.labelBase;
      const itemWidth = tile.widthMm;
      const itemHeight = tile.heightMm + PDF_LABEL_GAP_MM + PDF_LABEL_HEIGHT_MM;

      if (cursorX > PDF_MARGIN_MM && cursorX + itemWidth > PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM) {
        cursorX = PDF_MARGIN_MM;
        cursorY += rowHeight + PDF_CUTOUT_SPACING_MM;
        rowHeight = 0;
      }

      if (cursorY > PDF_MARGIN_MM && cursorY + itemHeight > PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM) {
        currentPage = { items: [] };
        pages.push(currentPage);
        cursorX = PDF_MARGIN_MM;
        cursorY = PDF_MARGIN_MM;
        rowHeight = 0;
      }

      currentPage.items.push({
        xMm: cursorX,
        yMm: cursorY,
        widthMm: tile.widthMm,
        heightMm: tile.heightMm,
        label: truncatePdfLabel(label, tile.widthMm),
        image: await renderPdfCutoutTile(cutout, tile, imageCache),
      });

      cursorX += itemWidth + PDF_CUTOUT_SPACING_MM;
      rowHeight = Math.max(rowHeight, itemHeight);
    }
  }

  return pages.filter((page) => page.items.length);
}

function splitPdfCutout(cutout, maxWidthMm, maxHeightMm) {
  const tiles = [];
  for (let offsetY = 0; offsetY < cutout.heightMm - 0.001; offsetY += maxHeightMm) {
    const heightMm = Math.min(maxHeightMm, cutout.heightMm - offsetY);
    for (let offsetX = 0; offsetX < cutout.widthMm - 0.001; offsetX += maxWidthMm) {
      const widthMm = Math.min(maxWidthMm, cutout.widthMm - offsetX);
      tiles.push({ offsetX, offsetY, widthMm, heightMm });
    }
  }
  return tiles;
}

async function renderPdfCutoutTile(cutout, tile, imageCache) {
  if (!imageCache.has(cutout.image.id)) {
    imageCache.set(cutout.image.id, await loadCanvasImage(getAssetImageSrc(cutout.image)));
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(tile.widthMm * PDF_IMAGE_PX_PER_MM));
  canvas.height = Math.max(1, Math.round(tile.heightMm * PDF_IMAGE_PX_PER_MM));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pxPerMmX = canvas.width / tile.widthMm;
  const pxPerMmY = canvas.height / tile.heightMm;
  drawPdfCutoutImage(ctx, imageCache.get(cutout.image.id), cutout.crop, {
    x: -(cutout.sourceOffsetX + tile.offsetX) * pxPerMmX,
    y: -(cutout.sourceOffsetY + tile.offsetY) * pxPerMmY,
    width: cutout.fullWidthMm * pxPerMmX,
    height: cutout.fullHeightMm * pxPerMmY,
  }, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  }, { muted: cutout.muted });

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return {
    bytes: dataUrlToBytes(dataUrl),
    pixelWidth: canvas.width,
    pixelHeight: canvas.height,
  };
}

function drawPdfCutoutImage(ctx, image, crop, fullBounds, visibleBounds, options = {}) {
  const safeCrop = normalizeCrop(crop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height);
  ctx.clip();

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = fullBounds.width / fullBounds.height;
  let drawWidth = fullBounds.width;
  let drawHeight = fullBounds.height;
  if (imageRatio > targetRatio) {
    drawHeight = fullBounds.height;
    drawWidth = fullBounds.height * imageRatio;
  } else {
    drawWidth = fullBounds.width;
    drawHeight = fullBounds.width / imageRatio;
  }

  ctx.translate(
    fullBounds.x + fullBounds.width / 2 + (safeCrop.x / 100) * drawWidth,
    fullBounds.y + fullBounds.height / 2 + (safeCrop.y / 100) * drawHeight,
  );
  ctx.rotate((safeCrop.rotate * Math.PI) / 180);
  ctx.scale(safeCrop.scale, safeCrop.scale);
  if (options.fit === "card-scale") {
    roundRectPath(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, Math.min(drawWidth, drawHeight) * 0.048);
    ctx.clip();
  }
  if (options.muted) {
    ctx.filter = "grayscale(1) opacity(0.45)";
  }
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function buildCutSheetPdf(pages) {
  const builder = createPdfBuilder();
  const catalogId = builder.reserveObject();
  const pagesId = builder.reserveObject();
  const pageIds = [];
  const pageWidthPt = mmToPdfPoint(PDF_PAGE_WIDTH_MM);
  const pageHeightPt = mmToPdfPoint(PDF_PAGE_HEIGHT_MM);

  pages.forEach((page) => {
    const imageRefs = [];
    let content = "0.35 w\n0 0 0 RG\n0 0 0 rg\n";

    page.items.forEach((item, index) => {
      const imageName = `Im${index + 1}`;
      const imageId = builder.addStream(
        `<< /Type /XObject /Subtype /Image /Width ${item.image.pixelWidth} /Height ${item.image.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        item.image.bytes,
      );
      imageRefs.push({ name: imageName, id: imageId });

      const x = mmToPdfPoint(item.xMm);
      const y = pageHeightPt - mmToPdfPoint(item.yMm + item.heightMm);
      const width = mmToPdfPoint(item.widthMm);
      const height = mmToPdfPoint(item.heightMm);
      content += `q\n${pdfNumber(width)} 0 0 ${pdfNumber(height)} ${pdfNumber(x)} ${pdfNumber(y)} cm\n/${imageName} Do\nQ\n`;
      content += `${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S\n`;

      const labelY = pageHeightPt - mmToPdfPoint(item.yMm + item.heightMm + PDF_LABEL_GAP_MM + 3.2);
      content += `BT\n/F1 7 Tf\n${pdfNumber(x)} ${pdfNumber(labelY)} Td\n(${escapePdfText(item.label)}) Tj\nET\n`;
    });

    const contentId = builder.addStream("<<", asciiToBytes(content));
    const xObjects = imageRefs.map((ref) => `/${ref.name} ${ref.id} 0 R`).join(" ");
    const pageId = builder.addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pdfNumber(pageWidthPt)} ${pdfNumber(pageHeightPt)}] /Resources << /XObject << ${xObjects} >> /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });

  builder.setObject(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
  );
  builder.setObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  return builder.toBlob();
}

function createPdfBuilder() {
  const objects = [];

  function reserveObject() {
    objects.push(null);
    return objects.length;
  }

  function setObject(id, content) {
    objects[id - 1] = content instanceof Uint8Array ? content : asciiToBytes(content);
  }

  function addObject(content) {
    const id = reserveObject();
    setObject(id, content);
    return id;
  }

  function addStream(dictionaryStart, streamBytes) {
    const dictionary = `${dictionaryStart} /Length ${streamBytes.length} >>\nstream\n`;
    return addObject(concatBytes([asciiToBytes(dictionary), streamBytes, asciiToBytes("\nendstream")]));
  }

  function toBlob() {
    const chunks = [asciiToBytes("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets = [0];
    let length = chunks[0].length;

    objects.forEach((object, index) => {
      if (!object) {
        throw new Error(`Missing PDF object ${index + 1}`);
      }
      offsets.push(length);
      const header = asciiToBytes(`${index + 1} 0 obj\n`);
      const footer = asciiToBytes("\nendobj\n");
      chunks.push(header, object, footer);
      length += header.length + object.length + footer.length;
    });

    const xrefOffset = length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index < offsets.length; index += 1) {
      xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    chunks.push(asciiToBytes(xref));
    return new Blob(chunks, { type: "application/pdf" });
  }

  return { reserveObject, setObject, addObject, addStream, toBlob };
}

function truncatePdfLabel(label, widthMm) {
  const maxChars = Math.max(12, Math.floor(widthMm / 1.9));
  return label.length > maxChars ? `${label.slice(0, Math.max(0, maxChars - 3))}...` : label;
}

function mmToPdfPoint(value) {
  return value * PDF_POINTS_PER_MM;
}

function pdfNumber(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]/g, " ");
}

function asciiToBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function concatBytes(chunks) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getSpreadExportName(pages) {
  if (pages.length === 1) {
    return pages[0].title || "binder-page-1";
  }
  return `pages-${pages.map((page) => getPageNumber(page)).join("-")}`;
}

async function renderSpreadToCanvas(pages, settings = getExportSettings().png) {
  const grid = getProjectGrid();
  const layout = getProjectLayout();
  const exportSettings = normalizePngExportSettings(settings);
  const exportScale = 180 / DEFAULT_PROJECT_LAYOUT.pocketWidth;
  const slotWidth = layout.pocketWidth * exportScale;
  const slotHeight = layout.pocketHeight * exportScale;
  const gapX = layout.gapX * exportScale;
  const gapY = layout.gapY * exportScale;
  const padding = 28;
  const outerPadding = 28;
  const spreadGap = 26;
  const titleHeight = exportSettings.includePageTitles ? 68 : 0;
  const spineWidth = 28;
  const spineGap = 18;
  const gridWidth = grid.cols * slotWidth + (grid.cols - 1) * gapX;
  const gridHeight = grid.rows * slotHeight + (grid.rows - 1) * gapY;
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
      gapX,
      gapY,
      padding,
      titleHeight,
      spineWidth,
      spineGap,
      gridWidth,
      gridHeight,
      layout,
      includePageTitles: exportSettings.includePageTitles,
      printNeededCardsGreyscale: exportSettings.printNeededCardsGreyscale,
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
    gapX,
    gapY,
    padding,
    titleHeight,
    spineWidth,
    spineGap,
    gridHeight,
    layout,
    includePageTitles,
    printNeededCardsGreyscale,
  } = metrics;
  const pageNumber = getPageNumber(page);
  const spineOnRight = pageNumber > 1 && pageNumber % 2 === 0;

  if (includePageTitles) {
    ctx.fillStyle = "#20242a";
    ctx.font = "700 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapCanvasText(ctx, `Page ${pageNumber}: ${page.title || `Page ${pageNumber}`}`, pageX + pageWidth / 2, pageY + titleHeight / 2, pageWidth - 28, 32);
  }

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
      const x = gridX + col * (slotWidth + gapX);
      const y = gridY + row * (slotHeight + gapY);
      drawPocket(ctx, x, y, slotWidth, slotHeight);
    }
  }

  for (const entry of getSegmentedPlacementRenderEntries(page)) {
    if (!imageCache.has(entry.image.id)) {
      imageCache.set(entry.image.id, await loadCanvasImage(getAssetImageSrc(entry.image)));
    }

    const fullBounds = getCanvasPlacementBounds(entry.placement, gridX, gridY, metrics);
    const visibleBounds = entry.segment
      ? getCanvasPlacementBounds(entry.segment, gridX, gridY, metrics)
      : fullBounds;
    drawPlacementSegment(
      ctx,
      imageCache.get(entry.image.id),
      entry.placement.crop,
      fullBounds,
      visibleBounds,
      {
        fit: entry.isCard ? "card-scale" : "cover",
        cardLayerScale: entry.isCard ? getCardPhysicalLayerScale(entry.placement, layout) : null,
        muted: entry.isCard && !isCardOwned(entry.image) && printNeededCardsGreyscale,
        rounded: entry.isCard && isCardOwned(entry.image),
      },
    );
  }
}

function getCanvasPlacementBounds(placement, gridX, gridY, metrics) {
  const { slotWidth, slotHeight, gapX, gapY } = metrics;
  return {
    x: gridX + placement.col * (slotWidth + gapX),
    y: gridY + placement.row * (slotHeight + gapY),
    width: placement.colSpan * slotWidth + (placement.colSpan - 1) * gapX,
    height: placement.rowSpan * slotHeight + (placement.rowSpan - 1) * gapY,
  };
}

function drawPocket(ctx, x, y, width, height) {
  roundRectPath(ctx, x, y, width, height, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.075)";
  ctx.fill();
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.025)");
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPlacementSegment(ctx, image, crop, fullBounds, visibleBounds, options = {}) {
  const safeCrop = normalizeCrop(crop);
  if (options.rounded) {
    roundRectPath(ctx, visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height, 7);
  } else {
    ctx.beginPath();
    ctx.rect(visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height);
  }
  ctx.save();
  ctx.clip();
  if (options.fit !== "card-scale") {
    ctx.fillStyle = "#ece7dc";
    ctx.fillRect(visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height);
  }

  // The PNG exporter mirrors the browser preview by fitting the image into a clipped
  // rectangle, then applying the saved zoom/position/rotation from the original placement.
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = fullBounds.width / fullBounds.height;
  const fitScale = options.fit === "card-scale"
    ? options.cardLayerScale || { width: 1, height: 1 }
    : getCoverImageScale(imageRatio, targetRatio);
  const drawWidth = fullBounds.width * fitScale.width;
  const drawHeight = fullBounds.height * fitScale.height;

  if (options.fit === "card-scale") {
    const faceX = fullBounds.x + fullBounds.width / 2 - drawWidth / 2;
    const faceY = fullBounds.y + fullBounds.height / 2 - drawHeight / 2;
    const imageFitScale = getContainImageScale(imageRatio, drawWidth / drawHeight);
    const imageDrawWidth = drawWidth * imageFitScale.width;
    const imageDrawHeight = drawHeight * imageFitScale.height;

    ctx.save();
    roundRectPath(ctx, faceX, faceY, drawWidth, drawHeight, Math.min(drawWidth, drawHeight) * 0.048);
    ctx.clip();
    ctx.translate(
      faceX + drawWidth / 2 + (safeCrop.x / 100) * imageDrawWidth,
      faceY + drawHeight / 2 + (safeCrop.y / 100) * imageDrawHeight,
    );
    ctx.rotate((safeCrop.rotate * Math.PI) / 180);
    ctx.scale(safeCrop.scale, safeCrop.scale);
    if (options.muted) {
      ctx.filter = "grayscale(1) opacity(0.45)";
    }
    ctx.drawImage(image, -imageDrawWidth / 2, -imageDrawHeight / 2, imageDrawWidth, imageDrawHeight);
    ctx.restore();
    ctx.restore();
    return;
  }

  ctx.translate(
    fullBounds.x + fullBounds.width / 2 + (safeCrop.x / 100) * drawWidth,
    fullBounds.y + fullBounds.height / 2 + (safeCrop.y / 100) * drawHeight,
  );
  ctx.rotate((safeCrop.rotate * Math.PI) / 180);
  ctx.scale(safeCrop.scale, safeCrop.scale);
  if (options.muted) {
    ctx.filter = "grayscale(1) opacity(0.45)";
  }
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  ctx.strokeStyle = "rgba(55, 61, 67, 0.35)";
  ctx.lineWidth = 1;
  if (options.rounded) {
    roundRectPath(ctx, visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height, 7);
    ctx.stroke();
  } else {
    ctx.strokeRect(visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height);
  }
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (typeof src === "string" && src && !src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
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
