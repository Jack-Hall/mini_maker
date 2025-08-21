import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrosswordService, GetWordsResponse, GridSolutionResponse, PatternMatchResponse } from '../../services/crossword.service';

interface Clue {
  start_index: [number, number];
  direction: 'horizontal' | 'vertical';
  length: number;
  clue: string;
}

interface WordPosition {
  start: [number, number];
  end: [number, number];
  direction: 'horizontal' | 'vertical';
  length: number;
  text: string;
}

interface SelectedWord {
  position: WordPosition;
  text: string;
}

@Component({
  selector: 'app-puzzle-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './puzzle-creator.component.html',
  styleUrl: './puzzle-creator.component.css'
})
export class PuzzleCreatorComponent {
  private readonly crosswordService = inject(CrosswordService);
  
  protected readonly grid = signal<string[][]>(
    Array(5).fill(null).map(() => Array(5).fill(''))
  );
  protected readonly detectedWords = signal<[number, number][][]>([]);
  protected readonly horizontalWords = computed<[number, number][][]>(() => {
    let horizontal_words = this.detectedWords();
    horizontal_words = horizontal_words.filter((word) => {
     return word[0][0] == word[1][0]
    })

    return horizontal_words

  })
  protected readonly verticalWords = computed<[number, number][][]>(() => {
    let verticalWords = this.detectedWords();
    verticalWords = verticalWords.filter((word) => {
     return word[0][1] == word[1][1]
    })
    return verticalWords

  })

  constructor() {
    // Initial word detection when component loads
    setTimeout(() => this.updateWordsFromGrid(), 100);
  }

  protected readonly isEditing = signal(false);
  protected readonly selectedCell = signal<{row: number, col: number} | null>(null);
  protected readonly activeDirection = signal<'horizontal' | 'vertical'>('horizontal');
  protected readonly activeCell = signal<{ row: number; col: number } | null>(null);
  protected readonly clues = signal<Clue[]>([]);
  protected readonly editingClue = signal<Clue | null>(null);
  protected readonly isUpdatingWords = signal(false);
  protected readonly isFindingSolutions = signal(false);
  protected readonly foundSolutions = signal<string[][][]>([]);
  protected readonly allSolutions = signal<string[][][]>([]);
  protected readonly selectedWords = signal<SelectedWord[]>([]);
  protected readonly solutionError = signal<string | null>(null);
  protected readonly currentWordPosition = signal<WordPosition | null>(null);
  protected readonly showWordSuggestions = signal(false);
  protected readonly patternMatches = signal<string[]>([]);
  protected readonly showPatternMatches = signal(false);
  protected readonly isLoadingPatterns = signal(false);
  
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

  protected readonly filteredSolutions = computed<string[][][]>(() => {
    const selected = this.selectedWords();
    const allSolutions = this.allSolutions();
    
    if (selected.length === 0) {
      return allSolutions;
    }
    
    return allSolutions.filter(solution => {
      return selected.every(selectedWord => {
        const actualWord = this.extractWordFromSolution(solution, selectedWord.position);
        return actualWord === selectedWord.text;
      });
    });
  });

  protected readonly availableWords = computed<string[]>(() => {
    const wordPos = this.currentWordPosition();
    const allSolutions = this.allSolutions();
    
    if (!wordPos || allSolutions.length === 0) {
      return [];
    }
    
    const words = new Set<string>();
    
    for (const solution of allSolutions) {
      const word = this.extractWordFromSolution(solution, wordPos);
      if (word && word.length === wordPos.length) {
        words.add(word);
      }
    }
    
    return Array.from(words).sort();
  });

  protected readonly shouldShowPatternMatches = computed<boolean>(() => {
    const selectedWord = this.getSelectedWord();
    if (!selectedWord || selectedWord.length < 2) {
      return false;
    }
    
    const filledLetters = selectedWord.split('').filter(char => char !== '_').length;
    const missingLetters = selectedWord.split('').filter(char => char === '_').length;
    
    // Show if at least 1 letter is filled and 3 or fewer letters are missing
    return filledLetters >= 1 && missingLetters <= 3 && missingLetters > 0;
  });

  protected onCellClick(row: number, col: number): void {
    this.selectedCell.set({ row, col });
    this.activeCell.set({ row, col });
    this.isEditing.set(true);
    this.updateCurrentWordPosition(row, col);
    this.checkAndLoadPatternMatches();
  }

  protected onCellRightClick(row: number, col: number, event: MouseEvent): void {
    event.preventDefault();
    const currentGrid = this.grid();
    const currentValue = currentGrid[row][col];
    currentGrid[row][col] = currentValue === '#' ? '' : '#';
    this.grid.set([...currentGrid]);
    
    // Immediately refresh words and clues locally, then update via API
    this.immediateWordRefresh();
    this.updateWordsFromGrid();
  }

  protected onCellFocus(row: number, col: number): void {
    this.activeCell.set({ row, col });
    this.selectedCell.set({ row, col });
    this.updateCurrentWordPosition(row, col);
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
      
      // Check for pattern matches after input
      this.checkAndLoadPatternMatches();
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
        this.immediateWordRefresh();
        this.updateWordsFromGrid();
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


  
  protected getSelectedWord(): string {
    const cell = this.selectedCell()
    if(!cell){
      return ''
    }
    const direction = this.activeDirection()
    //find the word that intersects this cell in the correct direction
    if( direction == 'horizontal'){
      const words = this.horizontalWords();
      for(const word of words){
        if(word[0][0] == cell.row && word[0][1] <= cell.col && word[1][1] >= cell.col ){
          let pattern = ''
          for(let i = word[0][1]; i <= word[1][1]; i++){
            let char = this.grid()[word[0][0]][i] 
            console.log(`char: ${char}`)
            pattern += char != '' ? char  : '_'
          }
          return pattern
        }
      }
    }
    if( direction == 'vertical'){
      const words = this.verticalWords();
      for(const word of words){
        if(word[0][1] == cell.col && word[0][0] <= cell.row && word[1][0] >= cell.row ){
          let pattern = ''
          for(let i = word[0][0]; i <= word[1][0]; i++){
            let char = this.grid()[i][word[0][1]] 
            pattern += char != '' ? char  : '_'
          }
          return pattern
        }
      }
    }

    return ""
  }

  protected findPatternMatches(): void {
    //returns a list of words that could fit in the currently selected word. 
    const selected_word_pattern = this.getSelectedWord();
    console.log(selected_word_pattern)
    this.crosswordService.getPatternMatch(selected_word_pattern).subscribe({
      next: (response: PatternMatchResponse) => {
        console.log(`matches for current word:${response.matches}`)
        this.patternMatches.set(response.matches);
      },
      error: (e)=>{
        console.log("Error loading pattern matches:", e);
        this.patternMatches.set([]);
      }
    })
  }

  protected checkAndLoadPatternMatches(): void {
    if (this.shouldShowPatternMatches()) {
      this.isLoadingPatterns.set(true);
      this.showPatternMatches.set(true);
      
      const selectedWordPattern = this.getSelectedWord();
      if (selectedWordPattern) {
        this.crosswordService.getPatternMatch(selectedWordPattern).subscribe({
          next: (response: PatternMatchResponse) => {
            this.patternMatches.set(response.matches);
            this.isLoadingPatterns.set(false);
          },
          error: (e) => {
            console.log("Error loading pattern matches:", e);
            this.patternMatches.set([]);
            this.isLoadingPatterns.set(false);
          }
        });
      }
    } else {
      this.showPatternMatches.set(false);
      this.patternMatches.set([]);
    }
  }

  protected clearGrid(): void {
    const emptyGrid = this.grid().map(row => 
      row.map(() => '')
    );
    this.grid.set(emptyGrid);
    this.foundSolutions.set([]);
    this.allSolutions.set([]);
    this.selectedWords.set([]);
    this.solutionError.set(null);
  }

  protected findSolutions(): void {
    this.isFindingSolutions.set(true);
    this.solutionError.set(null);
    this.foundSolutions.set([]);
    this.selectedWords.set([]);

    const grid = this.grid();
    
    this.crosswordService.findGridSolutions(grid).subscribe({
      next: (response: GridSolutionResponse) => {
        this.allSolutions.set(response.solutions);
        this.foundSolutions.set(response.solutions);
        this.isFindingSolutions.set(false);
        console.log(`Found ${response.solution_count} solutions`);
      },
      error: (err) => {
        console.error('Error finding solutions:', err);
        this.solutionError.set(
          err.error?.error || 'Failed to find solutions. Please check your grid and try again.'
        );
        this.isFindingSolutions.set(false);
      }
    });
  }

  protected applySolution(solution: string[][]): void {
    this.grid.set([...solution]);
    // Refresh word detection after applying solution
    this.immediateWordRefresh();
    this.updateWordsFromGrid();
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

  private immediateWordRefresh(): void {
    // Immediate local word detection for instant UI updates
    this.fallbackWordDetection();
  }

  private updateWordsFromGrid(): void {
    const grid = this.grid();
    this.isUpdatingWords.set(true);
    
    this.crosswordService.getWordsFromGrid(grid).subscribe({
      next: (response: GetWordsResponse) => {
        this.detectedWords.set(response.words);
        this.autoGenerateClues(response.words);
        this.isUpdatingWords.set(false);
        console.log(`API word detection completed: Found ${response.words.length} words`);
      },
      error: (err) => {
        console.error('Error getting words from grid:', err);
        this.isUpdatingWords.set(false);
        // API failed, but we already have local detection from immediateWordRefresh
        console.log('Using local word detection due to API error');
      }
    });
  }

  private fallbackWordDetection(): void {
    // Local word detection - treats empty cells as potential word spaces
    const grid = this.grid();
    const words: [number, number][][] = [];
    
    console.log('Running local word detection on grid:', grid);
    
    // Detect horizontal words
    for (let row = 0; row < grid.length; row++) {
      let start = -1;
      for (let col = 0; col <= grid[row].length; col++) {
        const cell = col < grid[row].length ? grid[row][col] : '#'; // Treat end of row as black
        const isWordCell = cell !== '#'; // Any non-black cell can be part of a word
        
        if (isWordCell && start === -1) {
          start = col;
        } else if (!isWordCell && start !== -1) {
          const length = col - start;
          if (length >= 2) { // At least 2 cells
            words.push([[row, start], [row, col - 1]]);
            console.log(`Found horizontal word: row ${row}, cols ${start}-${col - 1} (length ${length})`);
          }
          start = -1;
        }
      }
    }
    
    // Detect vertical words
    for (let col = 0; col < grid[0].length; col++) {
      let start = -1;
      for (let row = 0; row <= grid.length; row++) {
        const cell = row < grid.length ? grid[row][col] : '#'; // Treat end of column as black
        const isWordCell = cell !== '#'; // Any non-black cell can be part of a word
        
        if (isWordCell && start === -1) {
          start = row;
        } else if (!isWordCell && start !== -1) {
          const length = row - start;
          if (length >= 2) { // At least 2 cells
            words.push([[start, col], [row - 1, col]]);
            console.log(`Found vertical word: col ${col}, rows ${start}-${row - 1} (length ${length})`);
          }
          start = -1;
        }
      }
    }
    
    this.detectedWords.set(words);
    this.autoGenerateClues(words);
    console.log(`Local word detection completed: Found ${words.length} words total`);
  }

  private autoGenerateClues(words: [number, number][][]): void {
    const currentClues = this.clues();
    const refreshedClues: Clue[] = [];
    
    // For each detected word, either keep existing clue or create new one
    words.forEach(word => {
      const [[startRow, startCol], [endRow, endCol]] = word;
      
      // Determine direction and length
      const isHorizontal = startRow === endRow;
      const direction = isHorizontal ? 'horizontal' : 'vertical';
      const length = isHorizontal ? (endCol - startCol + 1) : (endRow - startRow + 1);
      
      // Only create clues for words with 2+ letters
      if (length >= 2) {
        // Check if clue already exists for this position and direction
        const existingClue = currentClues.find(c => 
          c.direction === direction &&
          c.start_index[0] === startRow &&
          c.start_index[1] === startCol
        );
        
        if (existingClue) {
          // Keep existing clue but update length if it changed
          refreshedClues.push({
            ...existingClue,
            length
          });
        } else {
          // Create new clue
          refreshedClues.push({
            start_index: [startRow, startCol],
            direction,
            length,
            clue: `Enter clue for ${length}-letter ${direction} word`
          });
        }
      }
    });
    
    // Replace all clues with the refreshed list
    this.clues.set(refreshedClues);
    
    console.log(`Clues refreshed: ${refreshedClues.length} clues for ${words.length} words`);
  }



  protected getDetectedWordCount(): number {
    return this.detectedWords().length;
  }

  protected getWordsFromSolution(solution: string[][]): WordPosition[] {
    const words: WordPosition[] = [];
    
    // Find horizontal words
    for (let row = 0; row < solution.length; row++) {
      let start = -1;
      for (let col = 0; col <= solution[row].length; col++) {
        const cell = col < solution[row].length ? solution[row][col] : '#';
        const isWordCell = cell !== '#';
        
        if (isWordCell && start === -1) {
          start = col;
        } else if (!isWordCell && start !== -1) {
          const length = col - start;
          if (length >= 2) {
            const text = solution[row].slice(start, col).join('');
            words.push({
              start: [row, start],
              end: [row, col - 1],
              direction: 'horizontal',
              length,
              text
            });
          }
          start = -1;
        }
      }
    }
    
    // Find vertical words
    for (let col = 0; col < solution[0].length; col++) {
      let start = -1;
      for (let row = 0; row <= solution.length; row++) {
        const cell = row < solution.length ? solution[row][col] : '#';
        const isWordCell = cell !== '#';
        
        if (isWordCell && start === -1) {
          start = row;
        } else if (!isWordCell && start !== -1) {
          const length = row - start;
          if (length >= 2) {
            const text = solution.slice(start, row).map(r => r[col]).join('');
            words.push({
              start: [start, col],
              end: [row - 1, col],
              direction: 'vertical',
              length,
              text
            });
          }
          start = -1;
        }
      }
    }
    
    return words;
  }

  protected extractWordFromSolution(solution: string[][], position: WordPosition): string {
    const [startRow, startCol] = position.start;
    const [endRow, endCol] = position.end;
    
    if (position.direction === 'horizontal') {
      return solution[startRow].slice(startCol, endCol + 1).join('');
    } else {
      return solution.slice(startRow, endRow + 1).map(row => row[startCol]).join('');
    }
  }

  protected selectWord(word: WordPosition, solution: string[][]): void {
    const selectedWords = this.selectedWords();
    const actualText = this.extractWordFromSolution(solution, word);
    
    // Check if this word position is already selected
    const existingIndex = selectedWords.findIndex(sw => 
      sw.position.start[0] === word.start[0] && 
      sw.position.start[1] === word.start[1] &&
      sw.position.direction === word.direction
    );
    
    if (existingIndex >= 0) {
      // If selecting the same word with same text, remove it (toggle off)
      if (selectedWords[existingIndex].text === actualText) {
        const newSelected = [...selectedWords];
        newSelected.splice(existingIndex, 1);
        this.selectedWords.set(newSelected);
      } else {
        // Update the selected text
        const newSelected = [...selectedWords];
        newSelected[existingIndex] = { position: word, text: actualText };
        this.selectedWords.set(newSelected);
      }
    } else {
      // Add new selection
      this.selectedWords.set([...selectedWords, { position: word, text: actualText }]);
    }
    
    // Update filtered solutions
    this.foundSolutions.set(this.filteredSolutions());
  }

  protected isWordSelected(word: WordPosition): SelectedWord | null {
    return this.selectedWords().find(sw => 
      sw.position.start[0] === word.start[0] && 
      sw.position.start[1] === word.start[1] &&
      sw.position.direction === word.direction
    ) || null;
  }

  protected clearSelectedWords(): void {
    this.selectedWords.set([]);
    this.foundSolutions.set(this.allSolutions());
  }

  protected getWordClass(word: WordPosition, solution: string[][]): string {
    const selected = this.isWordSelected(word);
    const classes = ['solution-word'];
    
    if (selected) {
      const actualText = this.extractWordFromSolution(solution, word);
      if (selected.text === actualText) {
        classes.push('selected-word');
      } else {
        classes.push('conflicted-word');
      }
    } else {
      classes.push('selectable-word');
    }
    
    return classes.join(' ');
  }

  protected updateCurrentWordPosition(row: number, col: number): void {
    const grid = this.grid();
    const direction = this.activeDirection();
    
    // Find the word boundaries for the current cell
    const wordPos = this.findWordBoundaries(row, col, direction, grid);
    this.currentWordPosition.set(wordPos);
    
    // Show suggestions if we have solutions and the word is incomplete/empty
    if (wordPos && this.allSolutions().length > 0) {
      const currentWord = this.extractCurrentWord(wordPos, grid);
      const hasEmptyOrIncompleteWord = currentWord.includes('') || currentWord.split('').some(c => c === '');
      this.showWordSuggestions.set(hasEmptyOrIncompleteWord);
    } else {
      this.showWordSuggestions.set(false);
    }
  }

  protected findWordBoundaries(row: number, col: number, direction: 'horizontal' | 'vertical', grid: string[][]): WordPosition | null {
    if (grid[row][col] === '#') return null;
    
    let startRow = row;
    let startCol = col;
    let endRow = row;
    let endCol = col;
    
    if (direction === 'horizontal') {
      // Find start of horizontal word
      while (startCol > 0 && grid[row][startCol - 1] !== '#') {
        startCol--;
      }
      // Find end of horizontal word
      while (endCol < grid[row].length - 1 && grid[row][endCol + 1] !== '#') {
        endCol++;
      }
    } else {
      // Find start of vertical word
      while (startRow > 0 && grid[startRow - 1][col] !== '#') {
        startRow--;
      }
      // Find end of vertical word
      while (endRow < grid.length - 1 && grid[endRow + 1][col] !== '#') {
        endRow++;
      }
    }
    
    const length = direction === 'horizontal' ? (endCol - startCol + 1) : (endRow - startRow + 1);
    
    // Only return word positions for words of length 2 or more
    if (length >= 2) {
      const text = direction === 'horizontal' 
        ? grid[row].slice(startCol, endCol + 1).join('')
        : grid.slice(startRow, endRow + 1).map(r => r[col]).join('');
        
      return {
        start: [startRow, startCol],
        end: [endRow, endCol],
        direction,
        length,
        text
      };
    }
    
    return null;
  }

  protected extractCurrentWord(wordPos: WordPosition, grid: string[][]): string {
    const [startRow, startCol] = wordPos.start;
    const [endRow, endCol] = wordPos.end;
    
    if (wordPos.direction === 'horizontal') {
      return grid[startRow].slice(startCol, endCol + 1).join('');
    } else {
      return grid.slice(startRow, endRow + 1).map(row => row[startCol]).join('');
    }
  }

  protected applyWordToGrid(word: string): void {
    const wordPos = this.currentWordPosition();
    if (!wordPos) return;
    
    const grid = this.grid();
    const newGrid = [...grid.map(row => [...row])];
    
    const [startRow, startCol] = wordPos.start;
    
    for (let i = 0; i < word.length; i++) {
      if (wordPos.direction === 'horizontal') {
        newGrid[startRow][startCol + i] = word[i];
      } else {
        newGrid[startRow + i][startCol] = word[i];
      }
    }
    
    this.grid.set(newGrid);
    this.showWordSuggestions.set(false);
    
    // Refresh word detection
    this.immediateWordRefresh();
    this.updateWordsFromGrid();
  }

  protected toggleWordSuggestions(): void {
    if (this.allSolutions().length > 0 && this.currentWordPosition()) {
      this.showWordSuggestions.set(!this.showWordSuggestions());
    }
  }

  protected closeWordSuggestions(): void {
    this.showWordSuggestions.set(false);
  }

  protected applyPatternMatchToGrid(word: string): void {
    const cell = this.selectedCell();
    if (!cell) return;
    
    const direction = this.activeDirection();
    const grid = this.grid();
    const newGrid = [...grid.map(row => [...row])];
    
    // Find the word that intersects this cell in the correct direction
    if (direction === 'horizontal') {
      const words = this.horizontalWords();
      for (const wordBounds of words) {
        if (wordBounds[0][0] === cell.row && wordBounds[0][1] <= cell.col && wordBounds[1][1] >= cell.col) {
          // Apply the word to this horizontal position
          for (let i = 0; i < word.length; i++) {
            const col = wordBounds[0][1] + i;
            if (col >= 0 && col < newGrid[wordBounds[0][0]].length) {
              newGrid[wordBounds[0][0]][col] = word[i];
            }
          }
          break;
        }
      }
    } else if (direction === 'vertical') {
      const words = this.verticalWords();
      for (const wordBounds of words) {
        if (wordBounds[0][1] === cell.col && wordBounds[0][0] <= cell.row && wordBounds[1][0] >= cell.row) {
          // Apply the word to this vertical position
          for (let i = 0; i < word.length; i++) {
            const row = wordBounds[0][0] + i;
            if (row >= 0 && row < newGrid.length) {
              newGrid[row][wordBounds[0][1]] = word[i];
            }
          }
          break;
        }
      }
    }
    
    this.grid.set(newGrid);
    this.showPatternMatches.set(false);
    
    // Refresh word detection
    this.immediateWordRefresh();
    this.updateWordsFromGrid();
  }

  protected togglePatternMatches(): void {
    this.showPatternMatches.set(!this.showPatternMatches());
  }

  protected closePatternMatches(): void {
    this.showPatternMatches.set(false);
  }
} 