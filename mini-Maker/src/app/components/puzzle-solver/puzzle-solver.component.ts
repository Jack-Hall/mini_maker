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
  protected readonly across_clues = computed<Clue[]>(()  => this.get_across_clues(this.puzzle()))
  protected readonly down_clues = computed<Clue[]>(()  => this.get_across_clues(this.puzzle()))
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly userSolution = signal<string[][]>([]);


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
    }
  }

  protected getClueNumber(row: number, col: number): number | null {
    // This would be implemented based on the actual clue numbering logic
    // For now, return null to indicate no clue number
    return null;
  }
} 