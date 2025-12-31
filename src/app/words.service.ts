import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { shuffle } from './array.utils';

interface LigaditoConfig {
  type: string;
  categories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class WordsService {
  private wordsCache: Map<string, Observable<string[]>> = new Map();
  private categories: string[] = [
    'animales',
    'profesiones',
    'acciones',
    'emociones',
    'partes-del-cuerpo',
    'casa',
    'deportes',
    'comida',
    'objetos',
    'ligadito'
  ];

  constructor(private http: HttpClient) {}

  getCategories(): string[] {
    return this.categories;
  }

  getWords(category: string): Observable<string[]> {
    // Check if already cached
    if (this.wordsCache.has(category)) {
      return this.wordsCache.get(category)!.pipe(
        map(words => shuffle([...words]))
      );
    }

    // Load words from JSON file
    const url = `assets/words/${category}.json`;
    
    // Handle special "ligadito" category that combines all others
    if (category === 'ligadito') {
      const ligaditoObservable = this.http.get<LigaditoConfig>(url).pipe(
        switchMap(config => {
          if (config.type === 'combined' && config.categories) {
            // Load all categories and combine them
            const categoryObservables = config.categories.map(cat =>
              this.http.get<string[]>(`assets/words/${cat}.json`)
            );
            
            return forkJoin(categoryObservables).pipe(
              map(allWords => {
                const combined: string[] = [];
                allWords.forEach(words => combined.push(...words));
                return combined;
              })
            );
          }
          return of([]);
        }),
        shareReplay(1)
      );

      this.wordsCache.set(category, ligaditoObservable);
      return ligaditoObservable.pipe(
        map(words => shuffle([...words]))
      );
    }

    // Load regular category
    const wordsObservable = this.http.get<string[]>(url).pipe(
      shareReplay(1)
    );

    this.wordsCache.set(category, wordsObservable);
    return wordsObservable.pipe(
      map(words => shuffle([...words]))
    );
  }
}
