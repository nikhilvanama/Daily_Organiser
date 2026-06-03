// One journal entry per (user, date). The user writes a short reflection at the end of the day.

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  title: string | null;  // optional headline
  body: string;          // the reflection itself (plain text, newlines preserved)
  mood: string | null;   // optional emoji
  createdAt: string;
  updatedAt: string;
}

export interface UpsertJournalDto {
  title?: string;
  body: string;
  mood?: string;
}

// Curated mood set for the chip selector. Keeping it small forces honesty.
export const MOOD_CHOICES = ['😊', '😌', '💪', '🎯', '😐', '😔', '😴', '🤔'] as const;
