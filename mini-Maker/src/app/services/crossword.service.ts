import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CrosswordCell {
  value: string;
  isBlack: boolean;
  isEditable: boolean;
  row: number;
  col: number;
}

export interface CrosswordData {
  grid: string[][];
  clues?: {
    across: string[];
    down: string[];
  };
}

export interface GridSolutionRequest {
  grid: string[][];
}

export interface GridSolutionResponse {
  solutions: string[][][];
  solution_count: number;
}

export interface WordPosition {
  start: [number, number];
  end: [number, number];
}

export interface GetWordsResponse {
  words: [number, number][][]; // Array of [[start_row, start_col], [end_row, end_col]]
  word_count: number;
}

export interface PatternMatchResponse {
  matches: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CrosswordService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getCrossword(): Observable<CrosswordData> {
    // Replace with your actual backend endpoint
    return this.http.get<CrosswordData>(`${this.apiUrl}/crossword`);
  }

  findGridSolutions(grid: string[][]): Observable<GridSolutionResponse> {
    // Replace empty strings with underscores in the grid
    const processedGrid = grid.map(row =>
      row.map(cell => cell === '' ? '_' : cell)
    );
    const request: GridSolutionRequest = { grid: processedGrid };
    return this.http.post<GridSolutionResponse>(`${this.apiUrl}/find_grid_solutions`, request);
  }

  getWordsFromGrid(grid: string[][]): Observable<GetWordsResponse> {
    const request = { grid };
    return this.http.post<GetWordsResponse>(`${this.apiUrl}/get_words`, request);
  }

  getPatternMatch(pattern: string): Observable<PatternMatchResponse> {
    const request = {pattern: pattern}
    return this.http.post<PatternMatchResponse>(`${this.apiUrl}/match_pattern`, request);
  }

  parseGrid(grid: string[][]): CrosswordCell[][] {
    return grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        value: cell === '_' ? '' : cell,
        isBlack: cell === '+',
        isEditable: cell === '_',
        row: rowIndex,
        col: colIndex
      }))
    );
  }
} 