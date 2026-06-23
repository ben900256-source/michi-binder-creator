const STORAGE_KEY = "michiBinderCreator.project.v1";
const CURRENT_PAGE_KEY = "michiBinderCreator.currentPageId.v1";
const TCGDEX_CARDS_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const INDEXED_DB_NAME = "michiBinderCreator";
const INDEXED_DB_STORE = "projects";
const INDEXED_DB_CURRENT_PROJECT_ID = "current";
const SIDEBAR_WIDTH_KEY = "michiBinderCreator.sidebarWidth.v1";
const EXPORT_SETTINGS_KEY = "michiBinderCreator.exportSettings.v1";
const BINDER_ZOOM_MIN = 0.05;
const BINDER_ZOOM_MAX = 2;
const SIDEBAR_WIDTH_MIN = 240;
const SIDEBAR_WIDTH_MAX = 560;
const DEFAULT_PROJECT_LAYOUT = {
  pocketWidth: 63,
  pocketHeight: 88,
  gapX: 3.5,
  gapY: 3.5,
};
const PDF_PAGE_WIDTH_MM = 215.9;
const PDF_PAGE_HEIGHT_MM = 279.4;
const PDF_MARGIN_MM = 10;
const PDF_CUTOUT_SPACING_MM = 4;
const PDF_LABEL_HEIGHT_MM = 6;
const PDF_LABEL_GAP_MM = 1.5;
const PDF_IMAGE_PX_PER_MM = 6;
const PDF_POINTS_PER_MM = 72 / 25.4;
const CARD_SEARCH_PAGE_SIZE = 24;

const DEFAULT_CROP = {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
};

const DEFAULT_EXPORT_SETTINGS = {
  pageRange: "",
  includePageTitles: true,
  includeAllCards: false,
  includeNeededCards: true,
  printNeededCardsGreyscale: true,
};

// One project object drives the whole app and is serialized directly to localStorage/JSON.
const state = {
  project: loadProject(),
  currentPageId: localStorage.getItem(CURRENT_PAGE_KEY),
  selectedImageId: null,
  selectedCardId: null,
  selectedPlacementId: null,
  setupInitialized: false,
  projectSetupRequested: false,
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
  imageSearchQuery: "",
  imageImportItems: [],
  imageImportIndex: 0,
  pendingCardSlot: null,
  placementClipboard: null,
  draggedCardResult: null,
  draggedCardAssetId: null,
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
  imageOverlapCancelButton: document.querySelector("#imageOverlapCancelButton"),
  helpButton: document.querySelector("#helpButton"),
  helpModal: document.querySelector("#helpModal"),
  helpCloseButton: document.querySelector("#helpCloseButton"),
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
  settingsPocketWidthInput: document.querySelector("#settingsPocketWidthInput"),
  settingsPocketHeightInput: document.querySelector("#settingsPocketHeightInput"),
  settingsGapXInput: document.querySelector("#settingsGapXInput"),
  settingsGapYInput: document.querySelector("#settingsGapYInput"),
  settingsAutoSaveInput: document.querySelector("#settingsAutoSaveInput"),
  menuAutoSaveInput: document.querySelector("#menuAutoSaveInput"),
  newProjectButton: document.querySelector("#newProjectButton"),
  newPageButton: document.querySelector("#newPageButton"),
  deleteProjectButton: document.querySelector("#deleteProjectButton"),
  saveLocalButton: document.querySelector("#saveLocalButton"),
  loadLocalButton: document.querySelector("#loadLocalButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  importJsonButton: document.querySelector("#importJsonButton"),
  importJsonInput: document.querySelector("#importJsonInput"),
  exportSettingsButton: document.querySelector("#exportSettingsButton"),
  exportSettingsModal: document.querySelector("#exportSettingsModal"),
  exportSettingsForm: document.querySelector("#exportSettingsForm"),
  exportSettingsCancelButton: document.querySelector("#exportSettingsCancelButton"),
  exportPageRangeInput: document.querySelector("#exportPageRangeInput"),
  exportIncludeTitlesInput: document.querySelector("#exportIncludeTitlesInput"),
  exportIncludeAllCardsInput: document.querySelector("#exportIncludeAllCardsInput"),
  exportIncludeNeededCardsInput: document.querySelector("#exportIncludeNeededCardsInput"),
  exportNeededGreyscaleInput: document.querySelector("#exportNeededGreyscaleInput"),
  exportPngButton: document.querySelector("#exportPngButton"),
  exportPdfButton: document.querySelector("#exportPdfButton"),
  statusText: document.querySelector("#statusText"),
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

function loadExportSettings() {
  try {
    return normalizeExportSettings(JSON.parse(localStorage.getItem(EXPORT_SETTINGS_KEY) || "null"));
  } catch (error) {
    console.warn("Could not load export settings.", error);
    return { ...DEFAULT_EXPORT_SETTINGS };
  }
}

function normalizeExportSettings(settings) {
  return {
    pageRange: typeof settings?.pageRange === "string" ? settings.pageRange : DEFAULT_EXPORT_SETTINGS.pageRange,
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
      ? input.cards.filter((card) => card && typeof card.dataUrl === "string").map(normalizeCardAsset)
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
    localAutoSave: input.localAutoSave !== false,
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

  localStorage.setItem(CURRENT_PAGE_KEY, state.currentPageId);
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
  state.pendingCardSlot = null;
  state.placementClipboard = null;
  state.draggedCardResult = null;
  state.draggedCardAssetId = null;
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
  state.indexedDbSavedAt = null;
  state.indexedDbSavePending = false;
}

function ensureProjectId(project = state.project) {
  if (!project.id) {
    project.id = createId();
  }
  return project.id;
}

function startNewProject({ confirm = true } = {}) {
  if (confirm && !window.confirm("Create a new project? Export or Save Local first if you need the current one.")) {
    return;
  }

  state.project = createDefaultProject();
  state.currentPageId = state.project.pages[0].id;
  resetTransientProjectState();
  state.projectSetupRequested = true;
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
    ensureProjectId();
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

function openProjectSettingsModal() {
  const layout = getProjectLayout();
  els.settingsPocketWidthInput.value = layout.pocketWidth;
  els.settingsPocketHeightInput.value = layout.pocketHeight;
  els.settingsGapXInput.value = layout.gapX;
  els.settingsGapYInput.value = layout.gapY;
  els.settingsAutoSaveInput.checked = state.project.localAutoSave === true;
  els.projectSettingsModal.hidden = false;
  window.setTimeout(() => {
    els.settingsPocketWidthInput.focus();
  }, 0);
}

function closeProjectSettingsModal() {
  els.projectSettingsModal.hidden = true;
}

function openExportSettingsModal() {
  syncExportSettingsControls();
  els.exportSettingsModal.hidden = false;
  window.setTimeout(() => {
    els.exportPageRangeInput.focus();
  }, 0);
}

function closeExportSettingsModal() {
  els.exportSettingsModal.hidden = true;
}

function syncExportSettingsControls() {
  const settings = normalizeExportSettings(state.exportSettings);
  els.exportPageRangeInput.value = settings.pageRange;
  els.exportIncludeTitlesInput.checked = settings.includePageTitles;
  els.exportIncludeAllCardsInput.checked = settings.includeAllCards;
  els.exportIncludeNeededCardsInput.checked = settings.includeNeededCards;
  els.exportNeededGreyscaleInput.checked = settings.printNeededCardsGreyscale;
  updateExportSettingsControlState();
}

function saveExportSettingsFromControls() {
  state.exportSettings = normalizeExportSettings({
    pageRange: els.exportPageRangeInput.value.trim(),
    includePageTitles: els.exportIncludeTitlesInput.checked,
    includeAllCards: els.exportIncludeAllCardsInput.checked,
    includeNeededCards: els.exportIncludeNeededCardsInput.checked,
    printNeededCardsGreyscale: els.exportNeededGreyscaleInput.checked,
  });
  persistExportSettings();
  closeExportSettingsModal();
  setStatus("Export settings saved");
}

function updateExportSettingsControlState() {
  els.exportNeededGreyscaleInput.disabled =
    !els.exportIncludeAllCardsInput.checked && !els.exportIncludeNeededCardsInput.checked;
}

function getExportSettings() {
  state.exportSettings = normalizeExportSettings(state.exportSettings);
  return state.exportSettings;
}

function getExportPageSelection(settings = getExportSettings()) {
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
  state.project.layout = normalizeProjectLayout({
    pocketWidth: els.settingsPocketWidthInput.value,
    pocketHeight: els.settingsPocketHeightInput.value,
    gapX: els.settingsGapXInput.value,
    gapY: els.settingsGapYInput.value,
  });
  state.project.localAutoSave = els.settingsAutoSaveInput.checked;
  closeProjectSettingsModal();
  saveProject("Project settings updated");
  if (state.project.localAutoSave) {
    saveProjectToIndexedDb("Project settings updated");
  }
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

function openLocalProjectPicker() {
  els.localProjectPicker.hidden = false;
  window.setTimeout(() => {
    els.localProjectList.querySelector("button")?.focus();
  }, 0);
}

function closeLocalProjectPicker() {
  els.localProjectPicker.hidden = true;
}

function renderLocalProjectPicker() {
  els.localProjectList.replaceChildren();
  if (!state.localProjectChoices.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No local projects";
    els.localProjectList.append(empty);
    return;
  }

  state.localProjectChoices.forEach((record) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "local-project-item";
    const savedText = record.savedAt ? new Date(record.savedAt).toLocaleString() : "Unknown save time";
    button.innerHTML = `<span></span><small></small>`;
    button.querySelector("span").textContent = record.name || "Untitled Binder";
    button.querySelector("small").textContent = savedText;
    button.addEventListener("click", () => {
      loadLocalProject(record.id);
    });
    els.localProjectList.append(button);
  });
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
    resetTransientProjectState();
    state.indexedDbSavedAt = record.savedAt || null;
    saveProjectToLocalStorageBestEffort();
    await putIndexedDbRecord(db, {
      id: INDEXED_DB_CURRENT_PROJECT_ID,
      currentProjectId: ensureProjectId(),
      savedAt: record.savedAt || new Date().toISOString(),
    });
    db.close();
    closeLocalProjectPicker();
    setStatus(`Loaded ${state.project.name || "local project"}`);
    renderAll();
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
    const projectId = ensureProjectId();
    const projectCopy = JSON.parse(JSON.stringify(state.project));
    projectCopy.id = projectId;
    await putIndexedDbRecord(db, {
      id: projectId,
      name: projectCopy.name || "Untitled Binder",
      savedAt,
      currentPageId: state.currentPageId,
      project: projectCopy,
    });
    await putIndexedDbRecord(db, {
      id: INDEXED_DB_CURRENT_PROJECT_ID,
      currentProjectId: projectId,
      savedAt,
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
  if (!state.project.localAutoSave) {
    if (state.indexedDbAutoSaveTimer) {
      window.clearTimeout(state.indexedDbAutoSaveTimer);
      state.indexedDbAutoSaveTimer = null;
    }
    return;
  }

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
    await refreshLocalProjectChoices({ openWhenAvailable: true });
  } catch (error) {
    console.warn("Could not load IndexedDB project.", error);
  }
}

async function refreshLocalProjectChoices({ openWhenAvailable = false } = {}) {
  const db = await openProjectDatabase();
  await migrateLegacyCurrentProjectRecord(db);
  const records = await getIndexedDbProjectRecords(db);
  db.close();
  state.localProjectChoices = records;
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
    .filter((record) => record?.id !== INDEXED_DB_CURRENT_PROJECT_ID && record?.project)
    .map((record) => ({
      id: record.id,
      name: record.project?.name || record.name || "Untitled Binder",
      savedAt: record.savedAt || null,
      currentPageId: record.currentPageId || record.project?.pages?.[0]?.id || null,
      project: record.project,
    }))
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
}

function getAllIndexedDbRecords(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).getAll();
    request.addEventListener("success", () => resolve(request.result || []));
    request.addEventListener("error", () => reject(request.error));
  });
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
    state.projectSetupRequested = false;
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
  els.projectSettingsButton.addEventListener("click", () => {
    closeProjectMenuModal();
    openProjectSettingsModal();
  });
  els.projectSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProjectSettings();
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
  els.loadLocalButton.addEventListener("click", async () => {
    closeProjectMenuModal();
    try {
      const records = await refreshLocalProjectChoices();
      if (records.length) {
        openLocalProjectPicker();
      } else {
        setStatus("No local projects found");
      }
    } catch (error) {
      console.warn("Could not list local projects.", error);
      setStatus("Local project list failed");
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

  els.exportJsonButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    exportProjectJson();
  });
  els.importJsonButton.addEventListener("click", (event) => {
    closeProjectMenuModal();
    els.importJsonInput.click();
  });
  els.importJsonInput.addEventListener("change", importProjectJson);
  els.exportSettingsButton.addEventListener("click", openExportSettingsModal);
  els.exportSettingsCancelButton.addEventListener("click", closeExportSettingsModal);
  els.exportSettingsModal.addEventListener("click", (event) => {
    if (event.target === els.exportSettingsModal) {
      closeExportSettingsModal();
    }
  });
  els.exportSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveExportSettingsFromControls();
  });
  els.exportIncludeAllCardsInput.addEventListener("change", updateExportSettingsControlState);
  els.exportIncludeNeededCardsInput.addEventListener("change", updateExportSettingsControlState);
  els.exportPngButton.addEventListener("click", exportCurrentPagePng);
  els.exportPdfButton.addEventListener("click", exportCutSheetPdf);

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

function renderAll() {
  ensureCurrentPage();
  renderSetupControls();
  renderProjectControls();
  renderPageList();
  applySidebarWidth();
  renderBinderViewControls();
  renderCardSearchControls();
  renderCardLibrary();
  renderImageLibrary();
  renderBinder();
  renderImagePlacementModal();
  renderImageImportWizard();
  renderCardInsertPrompt();
}

function renderProjectControls() {
  const grid = getProjectGrid();
  const layout = getProjectLayout();
  els.projectSetup.hidden = state.project.setupComplete || !state.projectSetupRequested;
  els.projectNameInput.value = state.project.name;
  els.projectBinderSummary.textContent =
    `Binder: ${grid.rows} rows x ${grid.cols} columns, pockets ${formatLayoutNumber(layout.pocketWidth)} x ${formatLayoutNumber(layout.pocketHeight)}, gaps ${formatLayoutNumber(layout.gapX)} x ${formatLayoutNumber(layout.gapY)}`;
  els.saveLocalButton.disabled = state.indexedDbSavePending;
  els.menuAutoSaveInput.checked = state.project.localAutoSave === true;
  els.localSaveSummary.textContent = getLocalSaveSummary();
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
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", card.name || "TCGdex card");
      event.dataTransfer.setData("application/x-michi-card-id", card.id || "");
      result.classList.add("dragging");
    });
    result.addEventListener("dragend", () => {
      state.draggedCardResult = null;
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
      owned: true,
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
    item.querySelector("img").src = card.dataUrl;
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
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", card.name || "Imported card");
      event.dataTransfer.setData("application/x-michi-card-asset-id", card.id);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      state.draggedCardAssetId = null;
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

  saveProject("Image deleted");
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
      `This image overlaps ${formatPlacementCount(overlappingPlacements.length, "existing placement")}. Choose whether the new image should sit over or under the existing layout.`;
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

  state.imagePlacementDraft.colSpan = clampInteger(els.placementColsInput.value, 1, 8, 1);
  state.imagePlacementDraft.rowSpan = clampInteger(els.placementRowsInput.value, 1, 8, 1);
  renderImagePlacementModal();
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
  img.src = image.dataUrl;
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

function getPlacementLayerPercentSize(image, frameRatio) {
  const scale = getCoverImageScale(getImageRatio(image, frameRatio), frameRatio);
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

function getImageRatio(image, fallbackRatio) {
  const naturalSize = ensureImageNaturalSize(image);
  return naturalSize ? naturalSize.width / naturalSize.height : fallbackRatio;
}

function ensureImageNaturalSize(image) {
  if (!image?.id || !image.dataUrl) return null;

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
  probe.src = image.dataUrl;
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
  if (changed && (state.pendingImagePlacement || state.placementClipboard)) {
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
  if (state.pendingImagePlacement || state.placementClipboard) {
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
  saveProject("Card placed");
  renderAll();
  return true;
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
        state.draggedCardResult = null;
        state.draggedCardAssetId = null;
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
        setStatus("Drop on a card slot");
        return;
      }

      const card = state.draggedCardResult;
      const cardAssetId = state.draggedCardAssetId;
      state.draggedCardResult = null;
      state.draggedCardAssetId = null;
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

function createPlacementPreviewBlock(placement, grid, layout) {
  const image = getImage(placement.imageId);
  if (!image) return null;

  const item = document.createElement("div");
  const isCard = isCardAssetId(placement.imageId);
  item.className = [
    "placement",
    "clipboard-preview",
    isCard ? "card-placement" : "",
    isCard && !isCardOwned(image) ? "not-owned-card" : "",
    placementFits(placement, grid.rows, grid.cols) ? "" : "invalid",
  ]
    .filter(Boolean)
    .join(" ");
  item.style.gridRow = `${placement.row + 1} / span ${placement.rowSpan}`;
  item.style.gridColumn = `${placement.col + 1} / span ${placement.colSpan}`;

  item.append(createPlacementImageLayer(image, placement, layout));
  return item;
}

function createPlacementImageLayer(image, placement, layout, segment = null) {
  const imageLayer = document.createElement("span");
  imageLayer.className = "placement-image-layer";
  const frameRatio = getPlacementAspect(placement.colSpan, placement.rowSpan, layout);
  const layerSize = getPlacementLayerPercentSize(image, frameRatio);

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
  img.src = image.dataUrl;
  img.alt = image.name || "";
  img.style.transform = cropToTransform(placement.crop);
  imageLayer.append(img);
  return imageLayer;
}

function cropToTransform(crop) {
  const safeCrop = normalizeCrop(crop);
  // Crop edits are non-destructive: the original data URL stays intact and CSS clips the view.
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
    if (!entry.image) return [];
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
  const nextIsImage = isImagePlacement(nextPlacement);
  if (nextIsImage && options.allowLayerOnImages && overlapping.length) {
    const choice = await requestImageOverlapChoice(overlapping);
    if (choice === "cancel") {
      return null;
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
    setStatus("Select a placed item first");
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
  saveProject(`${targetPlacements.length + 1} placements swapped`);
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
  saveProject(`${clipboard.mode === "cut" ? "Moved" : "Pasted"} ${asset.name}`);
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
      const dimensions = await getDataUrlImageDimensions(dataUrl);
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
  const item = getCurrentImageImportItem();
  if (!item) return;

  els.imageImportSaveButton.disabled = true;
  els.imageImportSkipButton.disabled = true;
  try {
    const dataUrl = await createImportedImageDataUrl(item);
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
    advanceImageImportWizard();
  } catch (error) {
    console.warn("Could not finish image import.", error);
    setStatus("Image import failed");
  } finally {
    els.imageImportSaveButton.disabled = false;
    els.imageImportSkipButton.disabled = false;
  }
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
  const settings = getExportSettings();
  const pageSelection = getExportPageSelection(settings);
  if (pageSelection.error) {
    openExportSettingsModal();
    setStatus(pageSelection.error);
    return;
  }
  const pages = pageSelection.pages;
  if (!pages.length) {
    setStatus("No pages to export");
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

async function exportCutSheetPdf() {
  const settings = getExportSettings();
  const pageSelection = getExportPageSelection(settings);
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

function getProjectPdfCutouts(settings = getExportSettings(), pageSelection = getExportPageSelection(settings)) {
  const layout = getProjectLayout();
  const cutouts = [];
  const selectedPageIndexes = new Set(pageSelection.pageIndexes);

  state.project.pages.forEach((page, pageIndex) => {
    if (!selectedPageIndexes.has(pageIndex)) return;

    const pageNumber = getPageNumber(page);
    getSegmentedPlacementRenderEntries(page).forEach((entry) => {
      const isNeededCard = entry.isCard && !isCardOwned(entry.image);
      const includeCard = entry.isCard && (settings.includeAllCards || (settings.includeNeededCards && isNeededCard));
      if (!includeCard && !isImagePlacement(entry.placement)) return;

      const visiblePlacement = entry.segment || entry.placement;
      const fullDimensions = getPlacementDimensions(entry.placement.colSpan, entry.placement.rowSpan, layout);
      const visibleDimensions = getPlacementDimensions(visiblePlacement.colSpan, visiblePlacement.rowSpan, layout);
      const sourceOffsetX = entry.segment ? entry.segment.sourceCol * (layout.pocketWidth + layout.gapX) : 0;
      const sourceOffsetY = entry.segment ? entry.segment.sourceRow * (layout.pocketHeight + layout.gapY) : 0;
      const segmentText = entry.segmentCount > 1 ? ` segment ${entry.segmentIndex + 1}/${entry.segmentCount}` : "";
      const cardText = isNeededCard ? " needed card" : "";
      const titleText = settings.includePageTitles ? ` ${page.title || `Page ${pageNumber}`}` : "";

      cutouts.push({
        id: `${page.id}-${entry.placement.id}-${entry.segmentIndex}`,
        image: entry.image,
        crop: normalizeCrop(entry.placement.crop),
        muted: isNeededCard && settings.printNeededCardsGreyscale,
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
    imageCache.set(cutout.image.id, await loadCanvasImage(cutout.image.dataUrl));
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

async function renderSpreadToCanvas(pages, settings = getExportSettings()) {
  const grid = getProjectGrid();
  const layout = getProjectLayout();
  const exportSettings = normalizeExportSettings(settings);
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
      imageCache.set(entry.image.id, await loadCanvasImage(entry.image.dataUrl));
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
  ctx.fillStyle = "#ece7dc";
  ctx.fillRect(visibleBounds.x, visibleBounds.y, visibleBounds.width, visibleBounds.height);

  // The PNG exporter mirrors the browser preview by drawing a cover-fit image into
  // a clipped rectangle, then applying the saved zoom/position/rotation from the
  // original placement. Segments stay aligned as pieces of the same full image.
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
