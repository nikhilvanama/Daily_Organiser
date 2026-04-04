// Import Injectable to register this service in NestJS dependency injection
// Import NotFoundException when a requested category does not exist
// Import ForbiddenException to block access when a user tries to modify another user's category
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// Import FirebaseService to perform CRUD operations on categories in the Firebase Realtime Database
import { FirebaseService } from '../prisma/firebase.service';
// Import CreateCategoryDto which defines and validates the fields for creating a new category (name, color, icon)
import { CreateCategoryDto } from './dto/create-category.dto';
// Import UpdateCategoryDto which extends CreateCategoryDto with all fields optional for partial updates
import { UpdateCategoryDto } from './dto/update-category.dto';
// Import randomUUID to generate unique IDs for categories
import { randomUUID } from 'crypto';

// @Injectable() marks this class as a NestJS service that can be injected into CategoriesController
@Injectable()
export class CategoriesService {
  // Inject FirebaseService to perform database operations on the 'categories' collection
  constructor(private firebase: FirebaseService) {}

  // Retrieves all categories for the authenticated user, sorted alphabetically by name
  async findAll(userId: string) {
    // Fetch all categories from the 'categories' collection in Firebase
    const all = await this.firebase.getList<any>('categories');
    // Filter to only include categories belonging to the authenticated user, then sort alphabetically by name
    return all.filter((c: any) => c.userId === userId).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  // Creates a new category for the authenticated user with an optional color and icon
  async create(userId: string, dto: CreateCategoryDto) {
    // Generate a unique UUID for the new category
    const id = randomUUID();
    // Build the complete category record; defaults color to indigo (#6366f1) if not provided
    const category = { id, ...dto, color: dto.color ?? '#6366f1', userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    // Write the category record to Firebase at categories/{id}
    await this.firebase.ref(`categories/${id}`).set(category);
    // Return the newly created category
    return category;
  }

  // Updates an existing category with the provided fields (partial update)
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    // Verify the category exists and belongs to the authenticated user before allowing modifications
    await this.ensureOwnership(userId, id);
    // Apply the partial update to the category in Firebase (FirebaseService adds updatedAt automatically)
    await this.firebase.update(`categories/${id}`, dto);
    // Return the fully updated category record from Firebase
    return this.firebase.get(`categories/${id}`);
  }

  // Deletes a category from the database after verifying ownership
  async remove(userId: string, id: string) {
    // Verify the category exists and belongs to the authenticated user before deletion
    await this.ensureOwnership(userId, id);
    // Remove the category record from Firebase permanently
    await this.firebase.remove(`categories/${id}`);
    // Return a confirmation object indicating successful deletion
    return { deleted: true };
  }

  // Private helper that verifies a category exists and belongs to the specified user; throws exceptions if not
  private async ensureOwnership(userId: string, id: string) {
    // Fetch the category from Firebase by its ID
    const cat = await this.firebase.get<any>(`categories/${id}`);
    // If the category does not exist, throw a 404 Not Found error
    if (!cat) throw new NotFoundException('Category not found');
    // If the category belongs to a different user, throw a 403 Forbidden error
    if (cat.userId !== userId) throw new ForbiddenException();
    // Return the category data so callers can use it without an extra database read
    return cat;
  }
}
