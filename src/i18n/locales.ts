import { English, type Messages } from './en.ts'
import { Korean } from './ko.ts'

export interface LanguageDefinition {
  Code: string;
  NativeName: string;
  Direction: 'ltr' | 'rtl';
  Messages: Messages;
}

/** Add a complete dictionary here to publish another language. */
export const PublishedLanguages: LanguageDefinition[] = [
  { Code: 'en', NativeName: 'English', Direction: 'ltr', Messages: English },
  { Code: 'ko', NativeName: '한국어', Direction: 'ltr', Messages: Korean },
]
