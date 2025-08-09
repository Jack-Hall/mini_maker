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

@Injectable({
  providedIn: 'root'
})
export class CrosswordService {
  private readonly http = inject(HttpClient);

  getCrossword(): Observable<CrosswordData> {
    // Replace with your actual backend endpoint
    return this.http.get<CrosswordData>('/api/crossword');
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