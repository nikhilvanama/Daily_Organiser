// Import Injectable to register this class in NestJS dependency injection container
// Import OnModuleInit lifecycle hook to initialize Firebase connection when the app starts
import { Injectable, OnModuleInit } from '@nestjs/common';
// Import Firebase Admin SDK to interact with Firebase Realtime Database server-side (uses service account credentials, not client-side auth)
import * as admin from 'firebase-admin';
// Import path module to resolve the absolute file path to the Firebase service account key JSON file
import * as path from 'path';

// @Injectable() marks this service for dependency injection so it can be used in tasks, goals, wishlist, categories, dashboard, auth, and users services
@Injectable()
// Implements OnModuleInit to automatically connect to Firebase Realtime Database when the NestJS app bootstraps
export class FirebaseService implements OnModuleInit {
  // Holds the initialized Firebase Admin app instance used to access all Firebase services
  private app: admin.app.App;
  // Holds the Firebase Realtime Database instance used for all CRUD operations across the Daily Organizer app
  private _db: admin.database.Database;

  onModuleInit() {
    let serviceAccount: any;

    // In production (Render), the service account key is stored as a JSON string in an env variable
    // In development, it's loaded from a local file
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
      serviceAccount = require(serviceAccountPath);
    }

    const dbUrl = process.env.FIREBASE_DATABASE_URL || 'https://taskmanagement-ce2c2-default-rtdb.firebaseio.com';

    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: dbUrl,
    });

    // Get a reference to the Firebase Realtime Database from the initialized app
    this._db = this.app.database();
    // Log confirmation that the database connection was established successfully
    console.log('Firebase Realtime Database connected');
  }

  // Getter to expose the raw database instance for advanced queries if needed by other services
  get db(): admin.database.Database {
    return this._db;
  }

  // Returns a Firebase database reference for a given path (e.g., "tasks/abc123", "users/xyz"), used for direct read/write operations
  ref(path: string): admin.database.Reference {
    return this._db.ref(path);
  }

  // Creates a new record at the given path with an auto-generated push key, adding id and timestamps; used by all feature services to insert new records
  async push<T extends object>(path: string, data: T): Promise<T & { id: string }> {
    // Generate a new child location under the path with a unique Firebase push key
    const ref = this._db.ref(path).push();
    // Extract the auto-generated key to use as the record's unique identifier
    const id = ref.key!;
    // Spread the incoming data and add id, createdAt, and updatedAt timestamps for tracking record lifecycle
    const record = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    // Write the complete record to Firebase at the generated reference location
    await ref.set(record);
    // Return the saved record including the generated id so the caller can use it immediately
    return record as T & { id: string };
  }

  // Retrieves a single record by path (e.g., "tasks/abc123"); returns null if the record does not exist
  async get<T>(path: string): Promise<T | null> {
    // Fetch a snapshot of the data at the specified path from Firebase
    const snapshot = await this._db.ref(path).get();
    // If the snapshot has data return it, otherwise return null to indicate the record was not found
    return snapshot.exists() ? snapshot.val() : null;
  }

  // Retrieves all records under a collection path (e.g., "tasks") as an array; used to fetch all tasks, goals, wishlist items, etc. for filtering
  async getList<T>(path: string): Promise<T[]> {
    // Fetch a snapshot of all children under the given collection path
    const snapshot = await this._db.ref(path).get();
    // If no data exists at this path, return an empty array instead of null
    if (!snapshot.exists()) return [];
    // Firebase stores collections as objects keyed by id; convert to an array of values for easier iteration and filtering
    const data = snapshot.val();
    return Object.values(data) as T[];
  }

  // Updates specific fields of an existing record at the given path, automatically setting the updatedAt timestamp
  async update(path: string, data: Record<string, any>): Promise<void> {
    // Merge the provided fields with a fresh updatedAt timestamp and write them to Firebase (does not overwrite unmentioned fields)
    await this._db.ref(path).update({ ...data, updatedAt: new Date().toISOString() });
  }

  // Deletes a record entirely from the given path; used when removing tasks, goals, milestones, mini-goals, wishlist items, or categories
  async remove(path: string): Promise<void> {
    // Remove the entire node at the specified path from the Firebase Realtime Database
    await this._db.ref(path).remove();
  }
}
