import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  CrosswordData,
  CrosswordCell,
  GridSolutionResponse,
  GetWordsResponse,
  PatternMatchResponse
} from '../../app/services/crossword.service';

@Injectable()
export class MockCrosswordService {
  // Control mock behavior
  shouldFailGetWords = false;
  shouldFailFindSolutions = false;
  shouldFailPatternMatch = false;
  getWordsDelay = 0;
  findSolutionsDelay = 0;
  patternMatchDelay = 0;

  getCrossword(): Observable<CrosswordData> {
    const mockData: CrosswordData = {
      grid: [
        ['C', 'A', 'T', '#', '#'],
        ['O', '_', '_', '#', '#'],
        ['D', '_', '_', '#', '#'],
        ['#', '#', '#', '#', '#'],
        ['#', '#', '#', '#', '#']
      ],
      clues: {
        across: ['1. Feline pet', '4. Placeholder clue'],
        down: ['1. Programming term', '2. Placeholder clue']
      }
    };
    return of(mockData);
  }

  findGridSolutions(grid: string[][]): Observable<GridSolutionResponse> {
    if (this.shouldFailFindSolutions) {
      return throwError(() => new Error('Failed to find solutions'));
    }

    const mockResponse: GridSolutionResponse = {
      solutions: [
        [
          ['C', 'A', 'T', '#', '#'],
          ['O', 'L', 'D', '#', '#'],
          ['D', 'E', 'R', '#', '#'],
          ['#', '#', '#', '#', '#'],
          ['#', '#', '#', '#', '#']
        ],
        [
          ['C', 'A', 'R', '#', '#'],
          ['O', 'L', 'D', '#', '#'],
          ['D', 'E', 'W', '#', '#'],
          ['#', '#', '#', '#', '#'],
          ['#', '#', '#', '#', '#']
        ]
      ],
      solution_count: 2
    };

    const response$ = of(mockResponse);
    return this.findSolutionsDelay > 0 
      ? response$.pipe(delay(this.findSolutionsDelay))
      : response$;
  }

  getWordsFromGrid(grid: string[][]): Observable<GetWordsResponse> {
    if (this.shouldFailGetWords) {
      return throwError(() => new Error('Failed to get words'));
    }

    const mockResponse: GetWordsResponse = {
      words: [
        [[0, 0], [0, 2]], // Horizontal word: CAT
        [[1, 0], [1, 2]], // Horizontal word: row 1
        [[0, 0], [2, 0]], // Vertical word: COD
        [[0, 1], [2, 1]]  // Vertical word: column 1
      ],
      word_count: 4
    };

    const response$ = of(mockResponse);
    return this.getWordsDelay > 0 
      ? response$.pipe(delay(this.getWordsDelay))
      : response$;
  }

  getPatternMatch(pattern: string): Observable<PatternMatchResponse> {
    if (this.shouldFailPatternMatch) {
      return throwError(() => new Error('Failed to get pattern matches'));
    }

    // Generate mock matches based on pattern
    const mockMatches = this.generateMockMatches(pattern);
    const mockResponse: PatternMatchResponse = {
      matches: mockMatches
    };

    const response$ = of(mockResponse);
    return this.patternMatchDelay > 0 
      ? response$.pipe(delay(this.patternMatchDelay))
      : response$;
  }

  parseGrid(grid: string[][]): CrosswordCell[][] {
    return grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        value: cell === '_' ? '' : cell,
        isBlack: cell === '+' || cell === '#',
        isEditable: cell === '_' || (cell !== '+' && cell !== '#'),
        row: rowIndex,
        col: colIndex
      }))
    );
  }

  private generateMockMatches(pattern: string): string[] {
    const length = pattern.length;
    const mockWords: { [key: number]: string[] } = {
      3: ['CAT', 'DOG', 'BAT', 'COD', 'OLD', 'NEW'],
      4: ['CODE', 'DATA', 'TEST', 'WORD', 'GRID'],
      5: ['HELLO', 'WORLD', 'PUZZLE', 'GAMES', 'SOLVE']
    };

    const baseWords = mockWords[length] || ['WORD'];
    
    // Filter words that match the pattern
    return baseWords.filter(word => {
      if (word.length !== pattern.length) return false;
      
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] !== '_' && pattern[i] !== word[i]) {
          return false;
        }
      }
      return true;
    }).slice(0, 10); // Limit to 10 matches
  }

  // Test utility methods
  reset(): void {
    this.shouldFailGetWords = false;
    this.shouldFailFindSolutions = false;
    this.shouldFailPatternMatch = false;
    this.getWordsDelay = 0;
    this.findSolutionsDelay = 0;
    this.patternMatchDelay = 0;
  }

  setFailureMode(operation: 'getWords' | 'findSolutions' | 'patternMatch', shouldFail: boolean): void {
    switch (operation) {
      case 'getWords':
        this.shouldFailGetWords = shouldFail;
        break;
      case 'findSolutions':
        this.shouldFailFindSolutions = shouldFail;
        break;
      case 'patternMatch':
        this.shouldFailPatternMatch = shouldFail;
        break;
    }
  }

  setDelay(operation: 'getWords' | 'findSolutions' | 'patternMatch', delayMs: number): void {
    switch (operation) {
      case 'getWords':
        this.getWordsDelay = delayMs;
        break;
      case 'findSolutions':
        this.findSolutionsDelay = delayMs;
        break;
      case 'patternMatch':
        this.patternMatchDelay = delayMs;
        break;
    }
  }
}
