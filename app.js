/**
 * Main Web Application State & Event Setup
 */

let searchQuery = "";
let selectedCategory = "all";
let selectedWallet = "all";
let sortBy = "default";

let items = [];
let filteredItems = [];

let searchInput = null;
let clearSearchBtn = null;
let categoryFilter = null;
let walletFilter = null;
let sortSelect = null;
let closeModalBtn = null;
let modalOverlay = null;
let resultsContainer = null;

function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.add("hidden");
  }
}

function filterAndRender() {
  filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesWallet = selectedWallet === "all" || item.walletId === selectedWallet;

    return matchesSearch && matchesCategory && matchesWallet;
  });

  if (sortBy === "discount_desc") {
    filteredItems.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
  } else if (sortBy === "price_asc") {
    filteredItems.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  renderResults();
}

function renderResults() {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = "";
  filteredItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = item.title || item.name;
    resultsContainer.appendChild(card);
  });
}

// Search input setup
function setupSearch() {
  if (!searchInput && typeof document !== "undefined") {
    searchInput = document.getElementById("searchInput");
    clearSearchBtn = document.getElementById("clearSearchBtn");
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (searchQuery) {
        if (clearSearchBtn) clearSearchBtn.classList.remove("hidden");
      } else {
        if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
      }
      filterAndRender();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchQuery = "";
      clearSearchBtn.classList.add("hidden");
      filterAndRender();
    });
  }
}

// Filter controls setup
function setupFilters() {
  if (typeof document !== "undefined") {
    if (!categoryFilter) categoryFilter = document.getElementById("categoryFilter");
    if (!walletFilter) walletFilter = document.getElementById("walletFilter");
    if (!sortSelect) sortSelect = document.getElementById("sortSelect");
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", (e) => {
      selectedCategory = e.target.value;
      filterAndRender();
    });
  }

  if (walletFilter) {
    walletFilter.addEventListener("change", (e) => {
      selectedWallet = e.target.value;
      filterAndRender();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      filterAndRender();
    });
  }
}

// Modal controls setup
function setupModals() {
  if (typeof document !== "undefined") {
    if (!closeModalBtn) closeModalBtn = document.getElementById("closeModalBtn");
    if (!modalOverlay) modalOverlay = document.getElementById("modalOverlay");
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      closeModal();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    });
  }
}

// Combined Event Listeners Setup
function setupEventListeners() {
  setupSearch();
  setupFilters();
  setupModals();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setupEventListeners,
    setupSearch,
    setupFilters,
    setupModals,
    filterAndRender,
    renderResults,
    closeModal,
    getSearchQuery: () => searchQuery,
    getSelectedCategory: () => selectedCategory,
    getSelectedWallet: () => selectedWallet,
    getSortBy: () => sortBy,
    getFilteredItems: () => filteredItems,
    setItems: (newItems) => { items = newItems; },
    setElements: (elements) => {
      if (elements.searchInput !== undefined) searchInput = elements.searchInput;
      if (elements.clearSearchBtn !== undefined) clearSearchBtn = elements.clearSearchBtn;
      if (elements.categoryFilter !== undefined) categoryFilter = elements.categoryFilter;
      if (elements.walletFilter !== undefined) walletFilter = elements.walletFilter;
      if (elements.sortSelect !== undefined) sortSelect = elements.sortSelect;
      if (elements.closeModalBtn !== undefined) closeModalBtn = elements.closeModalBtn;
      if (elements.modalOverlay !== undefined) modalOverlay = elements.modalOverlay;
      if (elements.resultsContainer !== undefined) resultsContainer = elements.resultsContainer;
    }
  };
}
