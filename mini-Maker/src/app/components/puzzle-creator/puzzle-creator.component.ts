import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Clue {
  start_index: [number, number];
  direction: 'horizontal' | 'vertical';
  length: number;
  clue: string;
}

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
  protected readonly clues = signal<Clue[]>([]);
  protected readonly editingClue = signal<Clue | null>(null);
  
  protected readonly acrossClues = computed<Clue[]>(() => 
    this.clues().filter(clue => clue.direction === 'horizontal')
  );
  
  protected readonly downClues = computed<Clue[]>(() => 
    this.clues().filter(clue => clue.direction === 'vertical')
  );
  
  protected readonly activeClue = computed<Clue | null>(() => {
    const active = this.activeCell();
    const dir = this.activeDirection();
    if (!active) return null;
    
    return this.clues().find(clue => {
      if (clue.direction !== dir) return false;
      const [sr, sc] = clue.start_index;
      if (dir === 'horizontal') {
        return sr === active.row && active.col >= sc && active.col < sc + clue.length;
      } else {
        return sc === active.col && active.row >= sr && active.row < sr + clue.length;
      }
    }) || null;
  });

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
      
      let advanced = false;
      // Auto-advance to next cell
      if (value && this.shouldAdvanceToNextCell(row, col)) {
        this.focusNextCell(row, col);
        advanced = true;
      }
      
      // If we didn't advance and there's an active clue, check if word is complete
      if (!advanced) {
        const clue = this.activeClue();
        if (clue && this.isClueComplete(clue)) {
          this.focusFirstCellOfNextClue(clue);
        }
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

  // Clue editing methods
  protected startEditingClue(clue: Clue): void {
    this.editingClue.set(clue);
  }

  protected stopEditingClue(): void {
    this.editingClue.set(null);
  }

  protected updateClue(clue: Clue, newText: string): void {
    const currentClues = this.clues();
    const clueIndex = currentClues.findIndex(c => 
      c.direction === clue.direction &&
      c.start_index[0] === clue.start_index[0] &&
      c.start_index[1] === clue.start_index[1]
    );
    
    if (clueIndex >= 0) {
      currentClues[clueIndex] = { ...clue, clue: newText };
      this.clues.set([...currentClues]);
    }
    
    this.stopEditingClue();
  }

  protected isEditingClue(clue: Clue): boolean {
    const editing = this.editingClue();
    if (!editing) return false;
    return (
      editing.direction === clue.direction &&
      editing.start_index[0] === clue.start_index[0] &&
      editing.start_index[1] === clue.start_index[1]
    );
  }

  protected isClueActive(clue: Clue): boolean {
    const ac = this.activeClue();
    if (!ac) return false;
    return (
      ac.direction === clue.direction &&
      ac.length === clue.length &&
      ac.start_index[0] === clue.start_index[0] &&
      ac.start_index[1] === clue.start_index[1]
    );
  }

  protected addClue(): void {
    const active = this.activeCell();
    const direction = this.activeDirection();
    if (!active) return;

    const length = this.getWordLength(active.row, active.col, direction);
    if (length < 2) return; // Need at least 2 letters for a word

    const newClue: Clue = {
      start_index: [active.row, active.col],
      direction,
      length,
      clue: 'Enter clue here'
    };

    // Check if clue already exists
    const existingClue = this.clues().find(c => 
      c.direction === direction &&
      c.start_index[0] === active.row &&
      c.start_index[1] === active.col
    );

    if (!existingClue) {
      this.clues.set([...this.clues(), newClue]);
    }
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

  private getWordLength(row: number, col: number, direction: 'horizontal' | 'vertical'): number {
    const grid = this.grid();
    let length = 0;
    
    if (direction === 'horizontal') {
      // Find start of word
      let startCol = col;
      while (startCol - 1 >= 0 && grid[row][startCol - 1] !== '#') startCol--;
      
      // Count length
      let currentCol = startCol;
      while (currentCol < grid[row].length && grid[row][currentCol] !== '#') {
        length++;
        currentCol++;
      }
    } else {
      // Find start of word
      let startRow = row;
      while (startRow - 1 >= 0 && grid[startRow - 1][col] !== '#') startRow--;
      
      // Count length
      let currentRow = startRow;
      while (currentRow < grid.length && grid[currentRow][col] !== '#') {
        length++;
        currentRow++;
      }
    }
    
    return length;
  }

  private getClueCells(clue: Clue): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = [];
    const [startRow, startCol] = clue.start_index;
    for (let i = 0; i < clue.length; i++) {
      const row = clue.direction === 'horizontal' ? startRow : startRow + i;
      const col = clue.direction === 'horizontal' ? startCol + i : startCol;
      cells.push({ row, col });
    }
    return cells;
  }

  private isClueComplete(clue: Clue): boolean {
    const grid = this.grid();
    const cells = this.getClueCells(clue);
    for (const { row, col } of cells) {
      const val = grid[row]?.[col];
      if (!val || val === '' || val === '#') return false;
    }
    return true;
  }

  private getOrderedCluesByDirection(direction: 'horizontal' | 'vertical'): Clue[] {
    const filtered = this.clues().filter((c) => c.direction === direction);
    return [...filtered].sort((a, b) => {
      const [ar, ac] = a.start_index;
      const [br, bc] = b.start_index;
      if (ar !== br) return ar - br;
      return ac - bc;
    });
  }

  private findNextClue(current: Clue): Clue | null {
    const currentDirection = current.direction;
    const list = this.getOrderedCluesByDirection(currentDirection);
    const idx = list.findIndex(
      (c) =>
        c.direction === current.direction &&
        c.length === current.length &&
        c.start_index[0] === current.start_index[0] &&
        c.start_index[1] === current.start_index[1]
    );
    if (idx >= 0 && idx + 1 < list.length) {
      return list[idx + 1];
    }
    // wrap to the other direction's first clue
    const other = this.getOrderedCluesByDirection(currentDirection === 'horizontal' ? 'vertical' : 'horizontal');
    return other.length > 0 ? other[0] : null;
  }

  private findNextUnfilledCellInClue(clue: Clue): { row: number; col: number } | null {
    const grid = this.grid();
    const cells = this.getClueCells(clue);
    for (const { row, col } of cells) {
      const val = grid[row]?.[col];
      if (!val || val === '' || val === ' ') {
        return { row, col };
      }
    }
    return null; // All cells filled
  }

  private focusFirstCellOfClue(clue: Clue): void {
    const [row, col] = clue.start_index;
    this.activeDirection.set(clue.direction);
    this.activeCell.set({ row, col });
    setTimeout(() => {
      const el = document.querySelector(`[data-row='${row}'][data-col='${col}']`) as HTMLInputElement | null;
      if (el) el.focus();
    }, 0);
  }

  private focusFirstCellOfNextClue(current: Clue): void {
    const next = this.findNextClue(current);
    if (next) {
      const unfilledCell = this.findNextUnfilledCellInClue(next);
      if (unfilledCell) {
        this.activeDirection.set(next.direction);
        this.activeCell.set(unfilledCell);
        setTimeout(() => {
          const el = document.querySelector(`[data-row='${unfilledCell.row}'][data-col='${unfilledCell.col}']`) as HTMLInputElement | null;
          if (el) el.focus();
        }, 0);
      } else {
        // If next clue is complete, try the one after that
        this.focusFirstCellOfNextClue(next);
      }
    }
  }
} 