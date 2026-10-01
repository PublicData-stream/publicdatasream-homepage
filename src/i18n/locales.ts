import { English, type Messages } from './en.ts'

export interface LanguageDefinition {
  Code: string;
  NativeName: string;
  Direction: 'ltr' | 'rtl';
  Messages: Messages;
}

/** Add a complete dictionary here to publish another language. */
export const PublishedLanguages: LanguageDefinition[] = [
  { Code: 'en', NativeName: 'English', Direction: 'ltr', Messages: English },
]
