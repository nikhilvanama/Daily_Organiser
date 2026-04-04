// Category model — represents a user-defined label for organizing tasks and wishlist items.
// Categories are displayed as colored dots in the sidebar and as filter options in forms.
export interface Category {
  id: string; // Unique identifier for the category
  name: string; // Display name shown in sidebar, dropdowns, and item tags
  color: string; // Hex color string used for the dot indicator and tag styling
  icon: string | null; // Optional emoji or icon — reserved for future use in the UI
  userId: string; // Foreign key to the owning user (categories are per-user)
  createdAt: string; // ISO timestamp of creation
  updatedAt: string; // ISO timestamp of last modification
}

// DTO for creating a new category — only name is required
export interface CreateCategoryDto {
  name: string; // Required: the display name for the category
  color?: string; // Optional hex color — defaults to green (#10b981) in the form
  icon?: string; // Optional icon/emoji
}
