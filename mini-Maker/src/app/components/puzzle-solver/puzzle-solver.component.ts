import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


interface Clue {
  start_index: [number, number]
  direction: "horizontal" | "vertical"
  length: number
  clue: string
}
interface CrosswordGrid {
  grid: string[][];
  clues: Clue[];
}

@Component({
  selector: 'app-puzzle-solver',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './puzzle-solver.component.html',
  styleUrl: './puzzle-solver.component.css'
})
export class PuzzleSolverComponent {
  private readonly http = inject(HttpClient);
  
  protected readonly puzzle = signal<CrosswordGrid | null>(null);
  protected readonly across_clues = computed<Clue[]>(() => this.get_across_clues(this.puzzle()));
  protected readonly down_clues = computed<Clue[]>(() => this.get_down_clues(this.puzzle()));
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly userSolution = signal<string[][]>([]);
  protected readonly activeDirection = signal<'horizontal' | 'vertical'>('horizontal');
  protected readonly activeCell = signal<{ row: number; col: number } | null>(null);
  protected readonly editingClue = signal<Clue | null>(null);
  protected readonly activeClue = computed<Clue | null>(() => {
    const p = this.puzzle();
    const active = this.activeCell();
    const dir = this.activeDirection();
    if (!p || !active) return null;
    const row = active.row;
    const col = active.col;
    const matched = p.clues.find((clue) => {
      if (clue.direction !== dir) return false;
      const [sr, sc] = clue.start_index;
      if (dir === 'horizontal') {
        return sr === row && col >= sc && col < sc + clue.length;
      } else {
        return sc === col && row >= sr && row < sr + clue.length;
      }
    });
    return matched ?? null;
  });


  get_across_clues(grid: CrosswordGrid | null){
    if(!grid){
      return []
    }
    return grid.clues.filter((clue: Clue)=> clue.direction=='horizontal')

  }
  get_down_clues(grid: CrosswordGrid| null){
    if(!grid){
      return []
    }
    return grid.clues.filter((clue: Clue)=> clue.direction=='vertical')

  }
  protected loadPuzzle(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.http.get<CrosswordGrid>('/api/play')
      .subscribe({
        next: (data) => {
          console.log(data)
          this.puzzle.set(data);
          this.initializeUserSolution(data.grid);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load puzzle. Please try again.');
          this.loading.set(false);
        }
      });
  }

  private initializeUserSolution(grid: string[][]): void {
    const solution: string[][] = [];
    for (let i = 0; i < grid.length; i++) {
      solution[i] = [];
      for (let j = 0; j < grid[i].length; j++) {
        solution[i][j] = grid[i][j] === '#' ? '#' : '';
      }
    }
    this.userSolution.set(solution);
  }

  protected onCellInput(row: number, col: number, value: string): void {
    const currentSolution = this.userSolution();
    if (currentSolution[row] && currentSolution[row][col] !== '#') {
      currentSolution[row][col] = value.toUpperCase();
      this.userSolution.set([...currentSolution]);
      let advanced = false;
      if (value && this.shouldAdvanceToNextCell(row, col)) {
        this.focusNextCell(row, col);
        advanced = true;
      }

      if (!advanced) {
        const clue = this.activeClue();
        if (clue && this.isClueComplete(clue)) {
          this.focusFirstCellOfNextClue(clue);
        }
      }
    }
  }

  protected onCellFocus(row: number, col: number): void {
    this.activeCell.set({ row, col });
  }

  protected onCellKeydown(row: number, col: number, event: KeyboardEvent): void {
    const key = event.key;
    if (key === 'Enter') {
      event.preventDefault();
      this.toggleDirection();
      return;
    }

    if (key === 'Backspace') {
      const solution = this.userSolution();
      const value = solution[row]?.[col] ?? '';
      if (!value) {
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

  protected isActiveCell(row: number, col: number): boolean {
    const active = this.activeCell();
    return !!active && active.row === row && active.col === col;
  }

  protected isCellInActiveWord(row: number, col: number): boolean {
    const active = this.activeCell();
    const grid = this.userSolution();
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

  private isEditable(row: number, col: number): boolean {
    const grid = this.userSolution();
    return grid[row]?.[col] !== '#';
  }

  private shouldAdvanceToNextCell(row: number, col: number): boolean {
    const direction = this.activeDirection();
    const grid = this.userSolution();
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
    const grid = this.userSolution();
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
    const grid = this.userSolution();
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
    const grid = this.userSolution();
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
    const grid = this.userSolution();
    const cells = this.getClueCells(clue);
    for (const { row, col } of cells) {
      const val = grid[row]?.[col];
      if (!val || val === '#') return false;
    }
    return true;
  }

  private getOrderedCluesByDirection(direction: 'horizontal' | 'vertical'): Clue[] {
    const p = this.puzzle();
    if (!p) return [];
    const filtered = p.clues.filter((c) => c.direction === direction);
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
    const grid = this.userSolution();
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

  protected getClueNumber(row: number, col: number): number | null {
    // This would be implemented based on the actual clue numbering logic
    // For now, return null to indicate no clue number
    return null;
  }
} 