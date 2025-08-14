import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrosswordService, CrosswordCell, CrosswordData, GridSolutionResponse } from '../../services/crossword.service';

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
  protected readonly solutions = signal<string[][][]>([]);
  protected readonly isFindingSolutions = signal(false);
  protected readonly activeDirection = signal<'across' | 'down'>('across');
  protected readonly activeCell = signal<{ row: number; col: number } | null>(null);

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
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_'],
        ['_', '_', '_', '_', '_']
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
      
      // Auto-advance to next cell in the current direction
      if (value && this.shouldAdvanceToNextCell(cell)) {
        this.focusNextCell(cell);
      }
    }
  }

  protected onCellKeydown(cell: CrosswordCell, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.toggleDirection();
      return;
    }

    if (event.key === 'Backspace' && !cell.value) {
      event.preventDefault();
      this.focusPreviousCell(cell);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
               event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.navigateToCell(cell, event.key);
    }
  }

  protected onCellFocus(cell: CrosswordCell): void {
    this.activeCell.set({ row: cell.row, col: cell.col });
  }

  private shouldAdvanceToNextCell(cell: CrosswordCell): boolean {
    const grid = this.crosswordGrid();
    const direction = this.activeDirection();
    if (direction === 'across') {
      let c = cell.col + 1;
      while (c < grid[cell.row].length) {
        if (grid[cell.row][c].isEditable) return true;
        if (grid[cell.row][c].isBlack) return false;
        c++;
      }
      return false;
    } else {
      let r = cell.row + 1;
      while (r < grid.length) {
        if (grid[r][cell.col].isEditable) return true;
        if (grid[r][cell.col].isBlack) return false;
        r++;
      }
      return false;
    }
  }

  private focusNextCell(currentCell: CrosswordCell): void {
    const grid = this.crosswordGrid();
    const direction = this.activeDirection();
    let targetRow = currentCell.row;
    let targetCol = currentCell.col;

    if (direction === 'across') {
      targetCol++;
      while (targetCol < grid[targetRow].length) {
        if (grid[targetRow][targetCol].isEditable) break;
        if (grid[targetRow][targetCol].isBlack) return;
        targetCol++;
      }
    } else {
      targetRow++;
      while (targetRow < grid.length) {
        if (grid[targetRow][targetCol].isEditable) break;
        if (grid[targetRow][targetCol].isBlack) return;
        targetRow++;
      }
    }

    if (
      targetRow >= 0 &&
      targetRow < grid.length &&
      targetCol >= 0 &&
      targetCol < grid[0].length &&
      grid[targetRow][targetCol].isEditable
    ) {
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
        this.activeCell.set({ row: targetRow, col: targetCol });
      }, 10);
    }
  }

  private focusPreviousCell(currentCell: CrosswordCell): void {
    const grid = this.crosswordGrid();
    const direction = this.activeDirection();
    let targetRow = currentCell.row;
    let targetCol = currentCell.col;

    if (direction === 'across') {
      targetCol--;
      while (targetCol >= 0) {
        if (grid[targetRow][targetCol].isEditable) break;
        if (grid[targetRow][targetCol].isBlack) return;
        targetCol--;
      }
    } else {
      targetRow--;
      while (targetRow >= 0) {
        if (grid[targetRow][targetCol].isEditable) break;
        if (grid[targetRow][targetCol].isBlack) return;
        targetRow--;
      }
    }

    if (
      targetRow >= 0 &&
      targetRow < grid.length &&
      targetCol >= 0 &&
      targetCol < grid[0].length &&
      grid[targetRow][targetCol].isEditable
    ) {
      const prevInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
      this.activeCell.set({ row: targetRow, col: targetCol });
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
        this.activeCell.set({ row: targetRow, col: targetCol });
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
    if (cell.isEditable) {
      const classes: string[] = ['editable-cell'];
      if (this.isCellInActiveWord(cell)) classes.push('highlighted-cell');
      if (this.isActiveCell(cell)) classes.push('active-cell');
      return classes.join(' ');
    }
    return 'filled-cell';
  }

  protected isActiveCell(cell: CrosswordCell): boolean {
    const active = this.activeCell();
    return !!active && active.row === cell.row && active.col === cell.col;
  }

  protected isCellInActiveWord(cell: CrosswordCell): boolean {
    const active = this.activeCell();
    if (!active) return false;

    const grid = this.crosswordGrid();
    const direction = this.activeDirection();

    if (direction === 'across') {
      // find word boundaries horizontally at active.row
      let startCol = active.col;
      while (startCol - 1 >= 0 && !grid[active.row][startCol - 1].isBlack) {
        startCol--;
      }
      let endCol = active.col;
      while (endCol + 1 < grid[active.row].length && !grid[active.row][endCol + 1].isBlack) {
        endCol++;
      }
      return cell.row === active.row && cell.col >= startCol && cell.col <= endCol && !grid[cell.row][cell.col].isBlack;
    } else {
      // down
      let startRow = active.row;
      while (startRow - 1 >= 0 && !grid[startRow - 1][active.col].isBlack) {
        startRow--;
      }
      let endRow = active.row;
      while (endRow + 1 < grid.length && !grid[endRow + 1][active.col].isBlack) {
        endRow++;
      }
      return cell.col === active.col && cell.row >= startRow && cell.row <= endRow && !grid[cell.row][cell.col].isBlack;
    }
  }

  protected toggleDirection(): void {
    const current = this.activeDirection();
    this.activeDirection.set(current === 'across' ? 'down' : 'across');
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
    this.solutions.set([]);
  }

  protected findSolutions(): void {
    this.isFindingSolutions.set(true);
    this.error.set(null);

    // Convert the crossword grid to the format expected by the API
    const grid = this.crosswordGrid();
    const apiGrid = grid.map(row => 
      row.map(cell => {
        if (cell.isBlack) return '+';
        return cell.value || '_';
      })
    );

    this.crosswordService.findGridSolutions(apiGrid).subscribe({
      next: (response: GridSolutionResponse) => {
        this.solutions.set(response.solutions);
        this.isFindingSolutions.set(false);
        console.log(`Found ${response.solution_count} solutions`);
      },
      error: (err) => {
        this.error.set(`Error finding solutions: ${err.message}`);
        this.isFindingSolutions.set(false);
        console.error('Error finding solutions:', err);
      }
    });
  }

  protected applySolution(solutionIndex: number): void {
    const solution = this.solutions()[solutionIndex];
    if (!solution) return;

    const grid = this.crosswordGrid();
    solution.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (grid[rowIndex] && grid[rowIndex][colIndex] && grid[rowIndex][colIndex].isEditable) {
          grid[rowIndex][colIndex].value = cell;
        }
      });
    });
    this.crosswordGrid.set([...grid]);
  }
} 