import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { PuzzleSolverComponent } from './puzzle-solver.component';
import { CrosswordTestHarness } from '../../../testing/test-utils/crossword-test-harness';
import { SAMPLE_CLUES, createTestClue } from '../../../testing/fixtures/sample-clues';

interface MockCrosswordGrid {
  grid: string[][];
  clues: Array<{
    start_index: [number, number];
    direction: 'horizontal' | 'vertical';
    length: number;
    clue: string;
  }>;
}

describe('PuzzleSolverComponent', () => {
  let component: PuzzleSolverComponent;
  let fixture: ComponentFixture<PuzzleSolverComponent>;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let harness: CrosswordTestHarness;

  const mockPuzzleData: MockCrosswordGrid = {
    grid: [
      ['', '', '', '#', '#'],
      ['', '#', '', '#', '#'],
      ['', '', '', '#', '#'],
      ['#', '#', '#', '#', '#'],
      ['#', '#', '#', '#', '#']
    ],
    clues: [
      {
        start_index: [0, 0],
        direction: 'horizontal',
        length: 3,
        clue: 'Feline pet (3)'
      },
      {
        start_index: [0, 0],
        direction: 'vertical',
        length: 3,
        clue: 'Programming term (3)'
      },
      {
        start_index: [1, 2],
        direction: 'vertical',
        length: 2,
        clue: 'Article (2)'
      }
    ]
  };

  beforeEach(async () => {
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    mockHttpClient.get.and.returnValue(of(mockPuzzleData));

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        PuzzleSolverComponent
      ],
      providers: [
        { provide: HttpClient, useValue: mockHttpClient }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PuzzleSolverComponent);
    component = fixture.componentInstance;
    harness = new CrosswordTestHarness(fixture);
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect((component as any).puzzle()).toBeNull();
      expect((component as any).loading()).toBeFalsy();
      expect((component as any).error()).toBeNull();
      expect((component as any).activeDirection()).toBe('horizontal');
      expect((component as any).activeCell()).toBeNull();
    });

    it('should have empty clue lists initially', () => {
      expect((component as any).across_clues()).toEqual([]);
      expect((component as any).down_clues()).toEqual([]);
    });
  });

  describe('Puzzle Loading', () => {
    it('should load puzzle successfully', fakeAsync(() => {
      expect((component as any).puzzle()).toBeNull();
      
      (component as any).loadPuzzle();
      
      expect((component as any).loading()).toBeTruthy();
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/play');
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).loading()).toBeFalsy();
      expect((component as any).puzzle()).toBeTruthy();
      expect((component as any).error()).toBeNull();
    }));

    it('should handle loading errors', fakeAsync(() => {
      mockHttpClient.get.and.returnValue(throwError(() => new Error('Network error')));
      
      (component as any).loadPuzzle();
      
      expect((component as any).loading()).toBeTruthy();
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).loading()).toBeFalsy();
      expect((component as any).error()).toBe('Failed to load puzzle. Please try again.');
      expect((component as any).puzzle()).toBeNull();
    }));

    it('should initialize user solution after loading puzzle', fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
      
      const userSolution = (component as any).userSolution();
      expect(userSolution).toBeTruthy();
      expect(userSolution.length).toBe(mockPuzzleData.grid.length);
      
      // Check that black cells are preserved and other cells are empty
      expect(userSolution[0][3]).toBe('#');
      expect(userSolution[0][0]).toBe('');
      expect(userSolution[1][0]).toBe('');
    }));

    it('should separate clues into across and down', fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
      
      const acrossClues = (component as any).across_clues();
      const downClues = (component as any).down_clues();
      
      expect(acrossClues.length).toBe(1); // One horizontal clue
      expect(downClues.length).toBe(2);   // Two vertical clues
      
      expect(acrossClues[0].direction).toBe('horizontal');
      expect(downClues[0].direction).toBe('vertical');
      expect(downClues[1].direction).toBe('vertical');
    }));
  });

  describe('Cell Interaction', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should handle cell input', () => {
      harness.setCellValue(0, 0, 'C');
      
      const userSolution = (component as any).userSolution();
      expect(userSolution[0][0]).toBe('C');
    });

    it('should convert lowercase input to uppercase', () => {
      harness.setCellValue(0, 0, 'c');
      
      const userSolution = (component as any).userSolution();
      expect(userSolution[0][0]).toBe('C');
    });

    it('should not allow input in black cells', () => {
      harness.setCellValue(0, 3, 'A'); // Try to input in black cell
      
      const userSolution = (component as any).userSolution();
      expect(userSolution[0][3]).toBe('#'); // Should remain black
    });

    it('should set active cell on focus', () => {
      harness.focusCell(1, 2);
      
      expect((component as any).activeCell()).toEqual({ row: 1, col: 2 });
    });

    it('should advance to next cell after input', fakeAsync(() => {
      harness.focusCell(0, 0);
      harness.setCellValue(0, 0, 'C');
      
      tick(50); // Wait for focus change
      fixture.detectChanges();
      
      // Should advance to next cell in horizontal direction
      expect((component as any).activeCell()).toEqual({ row: 0, col: 1 });
    }));

    it('should not advance when hitting black cell', () => {
      harness.focusCell(0, 2);
      harness.setCellValue(0, 2, 'T');
      
      // Next cell (0, 3) is black, so shouldn't advance
      expect((component as any).activeCell()).toEqual({ row: 0, col: 2 });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
      harness.focusCell(1, 2); // Start at an editable cell
    }));

    it('should toggle direction on Enter', () => {
      expect((component as any).activeDirection()).toBe('horizontal');
      
      harness.sendKeyToCell(1, 2, 'Enter');
      
      expect((component as any).activeDirection()).toBe('vertical');
      
      harness.sendKeyToCell(1, 2, 'Enter');
      
      expect((component as any).activeDirection()).toBe('horizontal');
    });

    it('should handle arrow key navigation', () => {
      // Test right arrow
      harness.sendKeyToCell(1, 2, 'ArrowRight');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 2 }); // Can't move right due to edge
      
      // Test left arrow
      harness.sendKeyToCell(1, 2, 'ArrowLeft');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 0 }); // Skip black cell at (1,1)
      
      // Test down arrow
      harness.focusCell(0, 0);
      harness.sendKeyToCell(0, 0, 'ArrowDown');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 0 });
      
      // Test up arrow
      harness.sendKeyToCell(1, 0, 'ArrowUp');
      expect((component as any).activeCell()).toEqual({ row: 0, col: 0 });
    });

    it('should handle backspace navigation', () => {
      // With empty cell, backspace should move to previous cell
      harness.sendKeyToCell(1, 2, 'Backspace');
      
      const expectedCol = (component as any).activeDirection() === 'horizontal' ? 0 : 2; // Skip black cell
      const expectedRow = (component as any).activeDirection() === 'horizontal' ? 1 : 0;
      expect((component as any).activeCell()).toEqual({ row: expectedRow, col: expectedCol });
    });

    it('should not navigate on backspace when cell has content', () => {
      harness.setCellValue(1, 2, 'A');
      harness.sendKeyToCell(1, 2, 'Backspace');
      
      // Should stay in same cell since it had content
      expect((component as any).activeCell()).toEqual({ row: 1, col: 2 });
    });
  });

  describe('Active Cell and Word Highlighting', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should identify active cell correctly', () => {
      harness.focusCell(0, 1);
      
      expect((component as any).isActiveCell(0, 1)).toBeTruthy();
      expect((component as any).isActiveCell(0, 0)).toBeFalsy();
      expect((component as any).isActiveCell(1, 1)).toBeFalsy();
    });

    it('should highlight cells in active word horizontally', () => {
      harness.focusCell(0, 1); // Focus in middle of horizontal word
      (component as any).activeDirection.set('horizontal');
      
      // All cells in the horizontal word should be highlighted
      expect((component as any).isCellInActiveWord(0, 0)).toBeTruthy();
      expect((component as any).isCellInActiveWord(0, 1)).toBeTruthy();
      expect((component as any).isCellInActiveWord(0, 2)).toBeTruthy();
      expect((component as any).isCellInActiveWord(0, 3)).toBeFalsy(); // Black cell
      expect((component as any).isCellInActiveWord(1, 0)).toBeFalsy(); // Different row
    });

    it('should highlight cells in active word vertically', () => {
      harness.focusCell(1, 0); // Focus in middle of vertical word
      (component as any).activeDirection.set('vertical');
      
      // All cells in the vertical word should be highlighted
      expect((component as any).isCellInActiveWord(0, 0)).toBeTruthy();
      expect((component as any).isCellInActiveWord(1, 0)).toBeTruthy();
      expect((component as any).isCellInActiveWord(2, 0)).toBeTruthy();
      expect((component as any).isCellInActiveWord(0, 1)).toBeFalsy(); // Different column
    });
  });

  describe('Clue Management', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should identify active clue based on cell position and direction', () => {
      harness.focusCell(0, 1); // Position in horizontal word
      (component as any).activeDirection.set('horizontal');
      
      const activeClue = (component as any).activeClue();
      expect(activeClue).toBeTruthy();
      expect(activeClue.start_index).toEqual([0, 0]);
      expect(activeClue.direction).toBe('horizontal');
    });

    it('should return null active clue when no clue matches', () => {
      harness.focusCell(4, 4); // Position with no associated clue
      
      const activeClue = (component as any).activeClue();
      expect(activeClue).toBeNull();
    });

    it('should correctly identify if a clue is active', () => {
      const component_any = component as any;
      harness.focusCell(0, 0);
      component_any.activeDirection.set('horizontal');
      
      const horizontalClue = mockPuzzleData.clues.find(c => c.direction === 'horizontal');
      const verticalClue = mockPuzzleData.clues.find(c => c.direction === 'vertical');
      
      expect(component_any.isClueActive(horizontalClue)).toBeTruthy();
      expect(component_any.isClueActive(verticalClue)).toBeFalsy();
    });
  });

  describe('Word Completion and Navigation', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should advance to next clue when word is completed', fakeAsync(() => {
      harness.focusCell(0, 0);
      
      // Fill the horizontal word completely
      harness.setCellValue(0, 0, 'C');
      tick(50);
      harness.setCellValue(0, 1, 'A');
      tick(50);
      harness.setCellValue(0, 2, 'T');
      tick(50);
      
      fixture.detectChanges();
      
      // Should advance to next clue (first vertical clue)
      const activeClue = (component as any).activeClue();
      expect(activeClue?.direction).toBe('vertical');
    }));

    it('should handle clue completion detection', () => {
      const component_any = component as any;
      
      // Set up user solution with complete word
      const userSolution = component_any.userSolution();
      userSolution[0][0] = 'C';
      userSolution[0][1] = 'A';
      userSolution[0][2] = 'T';
      component_any.userSolution.set([...userSolution]);
      
      const horizontalClue = mockPuzzleData.clues.find(c => c.direction === 'horizontal');
      const isComplete = component_any.isClueComplete(horizontalClue);
      
      expect(isComplete).toBeTruthy();
    });

    it('should find next unfilled cell in a clue', () => {
      const component_any = component as any;
      
      // Set up partial solution
      const userSolution = component_any.userSolution();
      userSolution[0][0] = 'C';
      userSolution[0][1] = ''; // Empty
      userSolution[0][2] = 'T';
      component_any.userSolution.set([...userSolution]);
      
      const horizontalClue = mockPuzzleData.clues.find(c => c.direction === 'horizontal');
      const nextCell = component_any.findNextUnfilledCellInClue(horizontalClue);
      
      expect(nextCell).toEqual({ row: 0, col: 1 });
    });
  });

  describe('Helper Methods', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should identify editable cells correctly', () => {
      const component_any = component as any;
      
      expect(component_any.isEditable(0, 0)).toBeTruthy();  // Empty cell
      expect(component_any.isEditable(0, 3)).toBeFalsy();   // Black cell
      expect(component_any.isEditable(1, 1)).toBeFalsy();   // Black cell
    });

    it('should determine when to advance to next cell', () => {
      const component_any = component as any;
      
      // Horizontal direction
      component_any.activeDirection.set('horizontal');
      expect(component_any.shouldAdvanceToNextCell(0, 0)).toBeTruthy();  // Can advance to (0,1)
      expect(component_any.shouldAdvanceToNextCell(0, 2)).toBeFalsy();   // Next cell is black
      
      // Vertical direction
      component_any.activeDirection.set('vertical');
      expect(component_any.shouldAdvanceToNextCell(0, 0)).toBeTruthy();  // Can advance to (1,0)
      expect(component_any.shouldAdvanceToNextCell(2, 0)).toBeFalsy();   // Next cell would be black
    });

    it('should get clue cells correctly', () => {
      const component_any = component as any;
      const horizontalClue = mockPuzzleData.clues.find(c => c.direction === 'horizontal')!;
      
      const cells = component_any.getClueCells(horizontalClue);
      
      expect(cells).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 }
      ]);
    });

    it('should order clues by position', () => {
      const component_any = component as any;
      
      const verticalClues = component_any.getOrderedCluesByDirection('vertical');
      
      // Should be ordered by row, then column
      expect(verticalClues[0].start_index).toEqual([0, 0]);
      expect(verticalClues[1].start_index).toEqual([1, 2]);
    });

    it('should find next clue in sequence', () => {
      const component_any = component as any;
      const firstVerticalClue = mockPuzzleData.clues.find(c => 
        c.direction === 'vertical' && c.start_index[0] === 0
      )!;
      
      const nextClue = component_any.findNextClue(firstVerticalClue);
      
      expect(nextClue.start_index).toEqual([1, 2]);
      expect(nextClue.direction).toBe('vertical');
    });

    it('should wrap to other direction when reaching end of clue list', () => {
      const component_any = component as any;
      const lastVerticalClue = mockPuzzleData.clues.find(c => 
        c.direction === 'vertical' && c.start_index[0] === 1
      )!;
      
      const nextClue = component_any.findNextClue(lastVerticalClue);
      
      expect(nextClue.direction).toBe('horizontal');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null puzzle gracefully', () => {
      expect((component as any).get_across_clues(null)).toEqual([]);
      expect((component as any).get_down_clues(null)).toEqual([]);
    });

    it('should handle empty clue lists', () => {
      const emptyPuzzle = { grid: mockPuzzleData.grid, clues: [] };
      (component as any).puzzle.set(emptyPuzzle);
      
      expect((component as any).across_clues()).toEqual([]);
      expect((component as any).down_clues()).toEqual([]);
    });

    it('should handle grid boundary navigation', () => {
      const component_any = component as any;
      
      // Try to navigate beyond grid boundaries
      component_any.navigateToCell(0, 0, 'ArrowUp');    // Should stay at (0,0)
      component_any.navigateToCell(0, 0, 'ArrowLeft');  // Should stay at (0,0)
      
      expect(component_any.activeCell()).toEqual({ row: 0, col: 0 });
    });

    it('should handle invalid cell positions', fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
      
      // Try to access invalid positions
      expect((component as any).isEditable(-1, 0)).toBeFalsy();
      expect((component as any).isEditable(0, -1)).toBeFalsy();
      expect((component as any).isEditable(10, 0)).toBeFalsy();
      expect((component as any).isEditable(0, 10)).toBeFalsy();
    }));
  });

  describe('Integration with DOM', () => {
    beforeEach(fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
    }));

    it('should render grid cells', () => {
      const cells = harness.getGridCells();
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should render clues', () => {
      const clueElements = harness.getClueElements();
      expect(clueElements.length).toBe(mockPuzzleData.clues.length);
    });

    it('should focus cells correctly', fakeAsync(() => {
      harness.focusCell(0, 0);
      tick();
      
      const focusedInput = harness.getCellInput(0, 0);
      expect(document.activeElement).toBe(focusedInput);
    }));
  });

  describe('Performance Considerations', () => {
    it('should handle rapid input without errors', fakeAsync(() => {
      (component as any).loadPuzzle();
      tick();
      fixture.detectChanges();
      
      // Rapidly input values
      for (let i = 0; i < 10; i++) {
        harness.setCellValue(0, 0, 'A');
        harness.setCellValue(0, 0, 'B');
        harness.setCellValue(0, 0, 'C');
        tick(1);
      }
      
      expect(component).toBeTruthy();
    }));

    it('should handle frequent direction changes', () => {
      for (let i = 0; i < 100; i++) {
        (component as any).toggleDirection();
      }
      
      expect((component as any).activeDirection()).toBe('horizontal'); // Should end up back at start
    });
  });
});
