import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-puzzle-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './puzzle-creator.component.html',
  styleUrl: './puzzle-creator.component.css'
})
export class PuzzleCreatorComponent {
  protected readonly grid = signal<string[][]>(
    Array(5).fill(null).map(() => Array(5).fill(''))
  );

  protected readonly isEditing = signal(false);
  protected readonly selectedCell = signal<{row: number, col: number} | null>(null);
  protected readonly activeDirection = signal<'horizontal' | 'vertical'>('horizontal');
  protected readonly activeCell = signal<{ row: number; col: number } | null>(null);

  protected onCellClick(row: number, col: number): void {
    this.selectedCell.set({ row, col });
    this.activeCell.set({ row, col });
    this.isEditing.set(true);
  }

  protected onCellRightClick(row: number, col: number, event: MouseEvent): void {
    event.preventDefault();
    const currentGrid = this.grid();
    const currentValue = currentGrid[row][col];
    currentGrid[row][col] = currentValue === '#' ? '' : '#';
    this.grid.set([...currentGrid]);
  }

  protected onCellFocus(row: number, col: number): void {
    this.activeCell.set({ row, col });
    this.selectedCell.set({ row, col });
  }

  protected onCellInput(row: number, col: number, value: string): void {
    const currentGrid = this.grid();
    if (currentGrid[row] && value.length <= 1) {
      if (currentGrid[row][col] === '#') return; // Don't edit black cells
      currentGrid[row][col] = value.toUpperCase() || '';
      this.grid.set([...currentGrid]);
      
      // Auto-advance to next cell
      if (value && this.shouldAdvanceToNextCell(row, col)) {
        this.focusNextCell(row, col);
      }
    }
  }

  protected onCellKeydown(row: number, col: number, event: KeyboardEvent): void {
    const key = event.key;
    
    if (key === 'Enter') {
      event.preventDefault();
      this.toggleDirection();
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      const currentGrid = this.grid();
      const currentValue = currentGrid[row][col];
      
      if (key === 'Delete' && event.ctrlKey) {
        // Ctrl+Delete toggles black cell
        event.preventDefault();
        currentGrid[row][col] = currentValue === '#' ? '' : '#';
        this.grid.set([...currentGrid]);
        return;
      }
      
      if (key === 'Backspace' && !currentValue) {
        event.preventDefault();
        this.focusPreviousCell(row, col);
        return;
      }
    }

    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      this.navigateToCell(row, col, key);
    }
  }

  protected savePuzzle(): void {
    // TODO: Implement puzzle saving functionality
    console.log('Saving puzzle:', this.grid());
    alert('Puzzle creator functionality coming soon!');
  }

  protected clearGrid(): void {
    const emptyGrid = this.grid().map(row => 
      row.map(() => '')
    );
    this.grid.set(emptyGrid);
  }

  protected isActiveCell(row: number, col: number): boolean {
    const active = this.activeCell();
    return !!active && active.row === row && active.col === col;
  }

  protected isCellInActiveWord(row: number, col: number): boolean {
    const active = this.activeCell();
    const grid = this.grid();
    if (!active || grid.length === 0) return false;

    if (this.activeDirection() === 'horizontal') {
      let startCol = active.col;
      while (startCol - 1 >= 0 && grid[active.row][startCol - 1] !== '#') startCol--;
      let endCol = active.col;
      while (endCol + 1 < grid[active.row].length && grid[active.row][endCol + 1] !== '#') endCol++;
      return row === active.row && col >= startCol && col <= endCol && grid[row][col] !== '#';
    } else {
      let startRow = active.row;
      while (startRow - 1 >= 0 && grid[startRow - 1][active.col] !== '#') startRow--;
      let endRow = active.row;
      while (endRow + 1 < grid.length && grid[endRow + 1][active.col] !== '#') endRow++;
      return col === active.col && row >= startRow && row <= endRow && grid[row][col] !== '#';
    }
  }

  protected toggleDirection(): void {
    const current = this.activeDirection();
    this.activeDirection.set(current === 'horizontal' ? 'vertical' : 'horizontal');
  }

  protected getCellClass(row: number, col: number): string {
    const cell = this.grid()[row][col];
    const classes: string[] = ['editor-cell'];
    
    if (cell === '#') {
      classes.push('blocked');
    } else {
      if (this.isCellInActiveWord(row, col)) classes.push('highlighted');
      if (this.isActiveCell(row, col)) classes.push('active');
    }
    
    if (this.selectedCell()?.row === row && this.selectedCell()?.col === col) {
      classes.push('selected');
    }
    
    return classes.join(' ');
  }

  private isEditable(row: number, col: number): boolean {
    const grid = this.grid();
    return grid[row]?.[col] !== '#';
  }

  private shouldAdvanceToNextCell(row: number, col: number): boolean {
    const direction = this.activeDirection();
    const grid = this.grid();
    if (direction === 'horizontal') {
      let c = col + 1;
      while (c < grid[row].length) {
        if (grid[row][c] !== '#') return true;
        if (grid[row][c] === '#') return false;
        c++;
      }
      return false;
    } else {
      let r = row + 1;
      while (r < grid.length) {
        if (grid[r][col] !== '#') return true;
        if (grid[r][col] === '#') return false;
        r++;
      }
      return false;
    }
  }

  private focusNextCell(row: number, col: number): void {
    const grid = this.grid();
    const direction = this.activeDirection();
    let targetRow = row;
    let targetCol = col;

    if (direction === 'horizontal') {
      targetCol++;
      while (targetCol < grid[targetRow].length) {
        if (this.isEditable(targetRow, targetCol)) break;
        if (grid[targetRow][targetCol] === '#') return;
        targetCol++;
      }
    } else {
      targetRow++;
      while (targetRow < grid.length) {
        if (this.isEditable(targetRow, targetCol)) break;
        if (grid[targetRow][targetCol] === '#') return;
        targetRow++;
      }
    }

    if (
      targetRow >= 0 &&
      targetRow < grid.length &&
      targetCol >= 0 &&
      targetCol < grid[0].length &&
      this.isEditable(targetRow, targetCol)
    ) {
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement | null;
        if (nextInput) nextInput.focus();
        this.activeCell.set({ row: targetRow, col: targetCol });
      }, 10);
    }
  }

  private focusPreviousCell(row: number, col: number): void {
    const grid = this.grid();
    const direction = this.activeDirection();
    let targetRow = row;
    let targetCol = col;

    if (direction === 'horizontal') {
      targetCol--;
      while (targetCol >= 0) {
        if (this.isEditable(targetRow, targetCol)) break;
        if (grid[targetRow][targetCol] === '#') return;
        targetCol--;
      }
    } else {
      targetRow--;
      while (targetRow >= 0) {
        if (this.isEditable(targetRow, targetCol)) break;
        if (grid[targetRow][targetCol] === '#') return;
        targetRow--;
      }
    }

    if (
      targetRow >= 0 &&
      targetRow < grid.length &&
      targetCol >= 0 &&
      targetCol < grid[0].length &&
      this.isEditable(targetRow, targetCol)
    ) {
      const prevInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement | null;
      if (prevInput) prevInput.focus();
      this.activeCell.set({ row: targetRow, col: targetCol });
    }
  }

  private navigateToCell(row: number, col: number, directionKey: string): void {
    const grid = this.grid();
    let targetRow = row;
    let targetCol = col;

    switch (directionKey) {
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

    while (
      targetRow >= 0 &&
      targetRow < grid.length &&
      targetCol >= 0 &&
      targetCol < grid[0].length
    ) {
      if (this.isEditable(targetRow, targetCol)) {
        const targetInput = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLInputElement | null;
        if (targetInput) targetInput.focus();
        this.activeCell.set({ row: targetRow, col: targetCol });
        break;
      }

      if (directionKey === 'ArrowUp') targetRow--;
      else if (directionKey === 'ArrowDown') targetRow++;
      else if (directionKey === 'ArrowLeft') targetCol--;
      else if (directionKey === 'ArrowRight') targetCol++;

      if (targetRow < 0 || targetRow >= grid.length || targetCol < 0 || targetCol >= grid[0].length) {
        break;
      }
    }
  }
} 