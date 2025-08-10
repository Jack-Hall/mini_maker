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
  protected readonly grid = signal<string[][]>([
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y']
  ]);

  protected readonly isEditing = signal(false);
  protected readonly selectedCell = signal<{row: number, col: number} | null>(null);

  protected onCellClick(row: number, col: number): void {
    this.selectedCell.set({ row, col });
    this.isEditing.set(true);
  }

  protected onCellInput(row: number, col: number, value: string): void {
    const currentGrid = this.grid();
    if (currentGrid[row] && value.length <= 1) {
      currentGrid[row][col] = value.toUpperCase() || ' ';
      this.grid.set([...currentGrid]);
    }
  }

  protected savePuzzle(): void {
    // TODO: Implement puzzle saving functionality
    console.log('Saving puzzle:', this.grid());
    alert('Puzzle creator functionality coming soon!');
  }

  protected clearGrid(): void {
    const emptyGrid = this.grid().map(row => 
      row.map(() => ' ')
    );
    this.grid.set(emptyGrid);
  }
} 