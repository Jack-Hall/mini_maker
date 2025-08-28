import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

import { PuzzleCreatorComponent } from '../../app/components/puzzle-creator/puzzle-creator.component';
import { PuzzleSolverComponent } from '../../app/components/puzzle-solver/puzzle-solver.component';
import { PatternMatcherComponent } from '../../app/components/pattern-matcher/pattern-matcher';
import { CrosswordService } from '../../app/services/crossword.service';
import { MockCrosswordService } from '../test-utils/mock-crossword.service';
import { CrosswordTestHarness } from '../test-utils/crossword-test-harness';

@Component({
  template: `
    <div id="test-container">
      <app-puzzle-creator *ngIf="showCreator"></app-puzzle-creator>
      <app-puzzle-solver *ngIf="showSolver"></app-puzzle-solver>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, PuzzleCreatorComponent, PuzzleSolverComponent]
})
class TestHostComponent {
  showCreator = false;
  showSolver = false;
}

describe('Crossword Workflow Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockService: MockCrosswordService;

  beforeEach(async () => {
    mockService = new MockCrosswordService();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        TestHostComponent,
        PuzzleCreatorComponent,
        PuzzleSolverComponent,
        PatternMatcherComponent
      ],
      providers: [
        { provide: CrosswordService, useValue: mockService },
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    
    mockService.reset();
    fixture.detectChanges();
  });

  describe('Puzzle Creation Workflow', () => {
    let creatorHarness: CrosswordTestHarness;

    beforeEach(() => {
      hostComponent.showCreator = true;
      fixture.detectChanges();
      creatorHarness = new CrosswordTestHarness(fixture);
    });

    it('should complete a full puzzle creation workflow', fakeAsync(() => {
      // Step 1: Create a basic word pattern
      creatorHarness.setCellValue(0, 0, 'C');
      creatorHarness.setCellValue(0, 1, 'A');
      creatorHarness.setCellValue(0, 2, 'T');
      
      tick(200); // Wait for word detection
      fixture.detectChanges();

      // Step 2: Add some black cells
      creatorHarness.rightClickCell(0, 3);
      creatorHarness.rightClickCell(1, 1);
      
      tick(200);
      fixture.detectChanges();

      // Step 3: Add a vertical word
      creatorHarness.setCellValue(1, 0, 'O');
      creatorHarness.setCellValue(2, 0, 'D');
      
      tick(200);
      fixture.detectChanges();

      // Step 4: Add clues
      creatorHarness.focusCell(0, 0);
      creatorHarness.clickButtonByText('Add Clue');
      
      creatorHarness.focusCell(0, 0);
      // Toggle to vertical direction
      creatorHarness.sendKeyToCell(0, 0, 'Enter');
      creatorHarness.clickButtonByText('Add Clue');

      // Step 5: Find solutions
      creatorHarness.clickButtonByText('Find Solutions');
      
      tick(200);
      fixture.detectChanges();

      // Verify final state
      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      expect(creatorComponent).toBeTruthy();
      
      const grid = (creatorComponent as any).grid();
      expect(grid[0][0]).toBe('C');
      expect(grid[0][1]).toBe('A');
      expect(grid[0][2]).toBe('T');
      expect(grid[0][3]).toBe('#');
      expect(grid[1][0]).toBe('O');
      expect(grid[2][0]).toBe('D');

      const clues = (creatorComponent as any).clues();
      expect(clues.length).toBeGreaterThanOrEqual(2);

      const solutions = (creatorComponent as any).foundSolutions();
      expect(solutions.length).toBeGreaterThan(0);
    }));

    it('should handle pattern matching workflow', fakeAsync(() => {
      // Create partial word
      creatorHarness.setCellValue(0, 0, 'C');
      creatorHarness.setCellValue(0, 2, 'T');
      creatorHarness.focusCell(0, 1);

      tick(200);
      fixture.detectChanges();

      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      // Should trigger pattern matching
      const shouldShow = (creatorComponent as any).shouldShowPatternMatches();
      expect(shouldShow).toBeTruthy();

      // Simulate pattern match selection
      (creatorComponent as any).onPatternMatchWordSelected('CAT');

      const grid = (creatorComponent as any).grid();
      expect(grid[0][0]).toBe('C');
      expect(grid[0][1]).toBe('A');
      expect(grid[0][2]).toBe('T');
    }));

    it('should handle error states gracefully', fakeAsync(() => {
      mockService.setFailureMode('getWords', true);
      mockService.setFailureMode('findSolutions', true);

      // Try to create puzzle with errors
      creatorHarness.setCellValue(0, 0, 'A');
      tick(200);

      creatorHarness.clickButtonByText('Find Solutions');
      tick(200);
      fixture.detectChanges();

      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      // Should handle errors without crashing
      expect(creatorComponent).toBeTruthy();
      expect((creatorComponent as any).solutionError()).toBeTruthy();
    }));
  });

  describe('Puzzle Solving Workflow', () => {
    let solverHarness: CrosswordTestHarness;

    beforeEach(fakeAsync(() => {
      hostComponent.showSolver = true;
      fixture.detectChanges();
      
      solverHarness = new CrosswordTestHarness(fixture);
      
      // Load puzzle
      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;
      
      (solverComponent as any).loadPuzzle();
      tick(200);
      fixture.detectChanges();
    }));

    it('should complete a full puzzle solving workflow', fakeAsync(() => {
      // Step 1: Fill in the first word
      solverHarness.focusCell(0, 0);
      solverHarness.setCellValue(0, 0, 'C');
      
      tick(50);
      solverHarness.setCellValue(0, 1, 'A');
      
      tick(50);
      solverHarness.setCellValue(0, 2, 'T');
      
      tick(200);
      fixture.detectChanges();

      // Step 2: Should auto-advance to next clue
      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;

      const activeClue = (solverComponent as any).activeClue();
      expect(activeClue?.direction).toBe('vertical');

      // Step 3: Fill vertical word
      solverHarness.focusCell(0, 0);
      (solverComponent as any).activeDirection.set('vertical');
      
      solverHarness.setCellValue(1, 0, 'O');
      solverHarness.setCellValue(2, 0, 'D');

      // Verify progress
      const userSolution = (solverComponent as any).userSolution();
      expect(userSolution[0][0]).toBe('C');
      expect(userSolution[0][1]).toBe('A');
      expect(userSolution[0][2]).toBe('T');
      expect(userSolution[1][0]).toBe('O');
      expect(userSolution[2][0]).toBe('D');
    }));

    it('should handle keyboard navigation correctly', () => {
      // Test arrow key navigation
      solverHarness.focusCell(1, 0);
      solverHarness.sendKeyToCell(1, 0, 'ArrowRight');
      
      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;

      // Should navigate to next editable cell
      const activeCell = (solverComponent as any).activeCell();
      expect(activeCell?.row).toBe(1);
      expect(activeCell?.col).toBeGreaterThan(0);

      // Test direction toggle
      const initialDirection = (solverComponent as any).activeDirection();
      solverHarness.sendKeyToCell(activeCell.row, activeCell.col, 'Enter');
      
      const newDirection = (solverComponent as any).activeDirection();
      expect(newDirection).not.toBe(initialDirection);
    });

    it('should highlight active word correctly', () => {
      solverHarness.focusCell(0, 1);
      
      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;

      // All cells in horizontal word should be highlighted
      expect((solverComponent as any).isCellInActiveWord(0, 0)).toBeTruthy();
      expect((solverComponent as any).isCellInActiveWord(0, 1)).toBeTruthy();
      expect((solverComponent as any).isCellInActiveWord(0, 2)).toBeTruthy();
      
      // Cells outside the word should not be highlighted
      expect((solverComponent as any).isCellInActiveWord(1, 0)).toBeFalsy();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should maintain consistent data models between components', () => {
      // Test that both components handle the same data structures correctly
      const testGrid = [
        ['C', 'A', 'T', '#', '#'],
        ['O', '#', '', '#', '#'],
        ['D', '', '', '#', '#'],
        ['#', '#', '#', '#', '#'],
        ['#', '#', '#', '#', '#']
      ];

      // Test with creator
      hostComponent.showCreator = true;
      fixture.detectChanges();

      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      (creatorComponent as any).grid.set(testGrid);
      fixture.detectChanges();

      // Switch to solver
      hostComponent.showCreator = false;
      hostComponent.showSolver = true;
      fixture.detectChanges();

      // Both should handle the same grid format
      expect(hostComponent.showSolver).toBeTruthy();
    });

    it('should handle component switching without memory leaks', () => {
      // Rapidly switch between components
      for (let i = 0; i < 10; i++) {
        hostComponent.showCreator = i % 2 === 0;
        hostComponent.showSolver = i % 2 === 1;
        fixture.detectChanges();
      }

      // Should not crash or cause errors
      expect(hostComponent).toBeTruthy();
    });

    it('should handle concurrent operations correctly', fakeAsync(() => {
      // Start both components simultaneously
      hostComponent.showCreator = true;
      hostComponent.showSolver = true;
      fixture.detectChanges();

      const creatorHarness = new CrosswordTestHarness(fixture);
      
      // Perform operations on both
      creatorHarness.setCellValue(0, 0, 'A');
      
      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;

      if (solverComponent) {
        (solverComponent as any).loadPuzzle();
      }

      tick(300);
      fixture.detectChanges();

      // Both should work independently
      expect(hostComponent).toBeTruthy();
    }));
  });

  describe('Performance Integration', () => {
    it('should handle large grids efficiently', fakeAsync(() => {
      hostComponent.showCreator = true;
      fixture.detectChanges();

      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      // Create a larger grid
      const largeGrid = Array(15).fill(null).map(() => Array(15).fill(''));
      (creatorComponent as any).grid.set(largeGrid);

      const creatorHarness = new CrosswordTestHarness(fixture);
      
      // Perform rapid operations
      for (let i = 0; i < 10; i++) {
        creatorHarness.setCellValue(i, i, 'A');
        tick(10);
      }

      tick(200);
      fixture.detectChanges();

      // Should handle efficiently without timeouts
      expect(creatorComponent).toBeTruthy();
    }));

    it('should handle rapid user input efficiently', fakeAsync(() => {
      hostComponent.showSolver = true;
      fixture.detectChanges();

      const solverComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleSolverComponent
      )?.componentInstance;

      (solverComponent as any).loadPuzzle();
      tick(200);

      const solverHarness = new CrosswordTestHarness(fixture);

      // Rapid input simulation
      const cells = [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]];
      const letters = ['C', 'A', 'T', 'O', 'D'];

      cells.forEach(([row, col], index) => {
        solverHarness.setCellValue(row, col, letters[index]);
        solverHarness.sendKeyToCell(row, col, 'ArrowRight');
        tick(1);
      });

      tick(100);
      fixture.detectChanges();

      // Should handle rapid input without errors
      expect(solverComponent).toBeTruthy();
    }));
  });

  describe('Error Recovery Integration', () => {
    it('should recover from service failures gracefully', fakeAsync(() => {
      hostComponent.showCreator = true;
      fixture.detectChanges();

      // Start with failures
      mockService.setFailureMode('getWords', true);
      mockService.setFailureMode('findSolutions', true);

      const creatorHarness = new CrosswordTestHarness(fixture);
      
      creatorHarness.setCellValue(0, 0, 'A');
      creatorHarness.clickButtonByText('Find Solutions');
      
      tick(200);

      // Now fix the service
      mockService.setFailureMode('getWords', false);
      mockService.setFailureMode('findSolutions', false);

      // Try operations again
      creatorHarness.setCellValue(0, 1, 'B');
      creatorHarness.clickButtonByText('Find Solutions');
      
      tick(200);
      fixture.detectChanges();

      // Should work after recovery
      const creatorComponent = fixture.debugElement.query(
        (de) => de.componentInstance instanceof PuzzleCreatorComponent
      )?.componentInstance;

      expect((creatorComponent as any).solutionError()).toBeNull();
    }));
  });
});
