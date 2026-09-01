// Zustand store: saved entry templates and the categories they file into.
//
// Global, not per-lorebook — a scaffold you can only use in the book you made
// it in is not a template (Phase 12, locked decision 6). Nothing here touches
// localStorage; `use-templates.js` persists after every mutation, the way
// `use-lorebook.js` does for a book that is not the active one.
import { create } from 'zustand';

export const useTemplatesStore = create((set) => ({
  templates:  [],
  categories: [],

  setAll: ({ templates, categories }) =>
    set({ templates: templates ?? [], categories: categories ?? [] }),

  addTemplate: (template) =>
    set((state) => ({ templates: [template, ...state.templates] })),

  updateTemplate: (id, patch) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t),
    })),

  removeTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

  setCategories: (categories) => set({ categories }),

  // Deleting a category must not take its templates with it — they fall back to
  // uncategorized, the same way a deleted folder leaves its entries top-level
  // rather than deleting them.
  removeCategory: (id, remainingCategories) =>
    set((state) => ({
      categories: remainingCategories,
      templates: state.templates.map((t) =>
        t.categoryId === id ? { ...t, categoryId: null } : t),
    })),
}));
