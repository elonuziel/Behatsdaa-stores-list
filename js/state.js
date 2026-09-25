/**
 * Application State Container
 */

export const state = {
  // Navigation & Page Sizes
  currentTab: 'stores',
  STORES_PAGE_SIZE: 60,
  storesVisibleCount: 60,
  DEALS_PAGE_SIZE: 60,
  dealsVisibleCount: 60,
  BILLING_PAGE_SIZE: 60,
  billingVisibleCount: 60,

  // Stores (Rechargeable Cards)
  storeData: null,
  allStores: [],
  availableCards: [],
  currentCard: 'all',
  currentCategory: 'all',
  searchQuery: '',
  storesSearchInDesc: false,
  currentSort: 'discount-desc',
  currentView: localStorage.getItem('behatsdaa_view') || 'grid',

  // Deals & Vouchers
  dealsData: null,
  allDeals: [],
  availableTags: [],
  currentDealTag: 'all',
  currentDealCategory: 'all',
  dealsSearchQuery: '',
  dealsSearchInDesc: false,
  currentDealSort: 'discount-desc',
  currentDealMaxPrice: 'all',

  // Billing Discounts
  billingData: null,
  allBillingStores: [],
  availableBillingCities: [],
  availableBillingCategories: [],
  currentBillingCity: 'all',
  currentBillingCategory: 'all',
  billingSearchQuery: '',
  billingSearchInDesc: false,
  currentBillingSort: 'discount-desc',

  // Active Modals & Loading Flags
  activeModalStore: null,
  activeModalBillingStore: null,
  storesLoaded: false,
  dealsLoaded: false,
  billingLoaded: false,
};

if (window.location.hash === '#deals') state.currentTab = 'deals';
else if (window.location.hash === '#billing') state.currentTab = 'billing';
