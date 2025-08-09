import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrosswordService, CrosswordCell, CrosswordData } from '../../services/crossword.service';

@Component({
  selector: 'app-crossword',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crossword.component.html',
  styleUrl: './crossword.component.css'
})
export class CrosswordComponent implements OnInit {
  private readonly crosswordService = inject(CrosswordService);
  
  protected readonly crosswordGrid = signal<CrosswordCell[][]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCrossword();
  }

   loadCrossword(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // For demo purposes, using mock data
    // In production, use: this.crosswordService.getCrossword()
    const mockData: CrosswordData = {
      grid: [
        ['+', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '+']
      ]
    };

    setTimeout(() => {
      this.crosswordGrid.set(this.crosswordService.parseGrid(mockData.grid));
      this.isLoading.set(false);
    }, 500);
  }

  protected onCellInput(cell: CrosswordCell, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();
    
    if (value.length <= 1 && /^[A-Z]?$/.test(value)) {
      cell.value = value;
      
      // Auto-advance to next cell
      if (value && this.shouldAdvanceToNextCell(cell)) {
        this.focusNextCell(cell);
      }
    }
  }

  protected onCellKeydown(cell: CrosswordCell, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !cell.value) {
      event.preventDefault();
      this.focusPreviousCell(cell);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
               event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.navigateToCell(cell, event.key);
    }
  }

  private shouldAdvanceToNextCell(cell: CrosswordCell): boolean {
    const grid = this.crosswordGrid();
    const nextCol = cell.col + 1;
    return nextCol < grid[cell.row].length && grid[cell.row][nextCol].isEditable;
  }

  private focusNextCell(currentCell: CrosswordCell): void {
    const grid = this.crosswordGrid();
    const nextCol = currentCell.col + 1;
    
    if (nextCol < grid[currentCell.row].length && grid[currentCell.row][nextCol].isEditable) {
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${currentCell.row}"][data-col="${nextCol}"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 10);
    }
  }

  private focusPreviousCell(currentCell: CrosswordCell): void {
    const grid = this.crosswordGrid();
    const prevCol = currentCell.col - 1;
    
    if (prevCol >= 0 && grid[currentCell.row][prevCol].isEditable) {
      const prevInput = document.querySelector(`[data-row="${currentCell.row}"][data-col="${prevCol}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  private navigateToCell(currentCell: CrosswordCell, direction: string): void {
    const grid = this.crosswordGrid();
    let targetRow = currentCell.row;
    let targetCol = currentCell.col;

    switch (direction) {
      case 'ArrowUp':
        targetRow = Math.max(0, targetRow - 1);
        break;
      case 'ArrowDown':
        targetRow = Math.min(grid.length - 1, targetRow + 1);
        break;
      case 'ArrowLeft':
        targetCol = Math.max(0, targetCol - 1);
        break;
      case 'ArrowRight':
        targetCol = Math.min(grid[0].length - 1, targetCol + 1);
        break;
    }

    // Find the next editable cell in that direction
    while (targetRow < grid.length && targetCol < grid[0].length) {
      if (grid[targetRow][targetCol].isEditable) {
        const targetInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement;
        if (targetInput) targetInput.focus();
        break;
      }
      
      // Move in the direction
      if (direction === 'ArrowUp') targetRow--;
      else if (direction === 'ArrowDown') targetRow++;
      else if (direction === 'ArrowLeft') targetCol--;
      else if (direction === 'ArrowRight') targetCol++;
      
      // Bounds check
      if (targetRow < 0 || targetRow >= grid.length || targetCol < 0 || targetCol >= grid[0].length) {
        break;
      }
    }
  }

  protected getCellClass(cell: CrosswordCell): string {
    if (cell.isBlack) return 'black-cell';
    if (cell.isEditable) return 'editable-cell';
    return 'filled-cell';
  }

  protected clearPuzzle(): void {
    const grid = this.crosswordGrid();
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.isEditable) {
          cell.value = '';
        }
      });
    });
    this.crosswordGrid.set([...grid]);
  }
} 