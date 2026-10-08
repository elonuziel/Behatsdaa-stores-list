const assert = require("assert");
const app = require("../app.js");

// Mock Element helper
function createMockElement(id) {
  const listeners = {};
  const classList = new Set();
  return {
    id,
    value: "",
    classList: {
      add: (cls) => classList.add(cls),
      remove: (cls) => classList.delete(cls),
      contains: (cls) => classList.has(cls)
    },
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    dispatchEvent: (event, eventData = {}) => {
      if (listeners[event]) {
        listeners[event].forEach((fn) => fn(eventData));
      }
    }
  };
}

console.log("Running UI & Event Listener Tests...");

// Test setupSearch
{
  const searchInput = createMockElement("searchInput");
  const clearSearchBtn = createMockElement("clearSearchBtn");
  clearSearchBtn.classList.add("hidden");

  app.setElements({ searchInput, clearSearchBtn });
  app.setupSearch();

  // Simulate typing in search
  searchInput.dispatchEvent("input", { target: { value: "Shufersal" } });
  assert.strictEqual(app.getSearchQuery(), "Shufersal");
  assert.strictEqual(clearSearchBtn.classList.contains("hidden"), false);

  // Simulate clear search click
  clearSearchBtn.dispatchEvent("click");
  assert.strictEqual(app.getSearchQuery(), "");
  assert.strictEqual(clearSearchBtn.classList.contains("hidden"), true);
  console.log("  ✓ setupSearch test passed");
}

// Test setupFilters
{
  const categoryFilter = createMockElement("categoryFilter");
  const walletFilter = createMockElement("walletFilter");
  const sortSelect = createMockElement("sortSelect");

  app.setElements({ categoryFilter, walletFilter, sortSelect });
  app.setupFilters();

  categoryFilter.dispatchEvent("change", { target: { value: "Electronics" } });
  assert.strictEqual(app.getSelectedCategory(), "Electronics");

  walletFilter.dispatchEvent("change", { target: { value: "card-2809" } });
  assert.strictEqual(app.getSelectedWallet(), "card-2809");

  sortSelect.dispatchEvent("change", { target: { value: "discount_desc" } });
  assert.strictEqual(app.getSortBy(), "discount_desc");
  console.log("  ✓ setupFilters test passed");
}

// Test setupModals
{
  const closeModalBtn = createMockElement("closeModalBtn");
  const modalOverlay = createMockElement("modalOverlay");

  app.setElements({ closeModalBtn, modalOverlay });
  app.setupModals();

  closeModalBtn.dispatchEvent("click");
  assert.strictEqual(modalOverlay.classList.contains("hidden"), true);
  console.log("  ✓ setupModals test passed");
}

// Test setupEventListeners combined
{
  app.setupEventListeners();
  console.log("  ✓ setupEventListeners test passed");
}

console.log("All UI tests passed successfully!");
