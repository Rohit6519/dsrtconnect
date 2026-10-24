// Minimal shared DB typing placeholder.
// Keep this non-empty so imports never break the app.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      [_ in string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [_ in string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [_ in string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
  }
}

export type Tables<T extends string> = any