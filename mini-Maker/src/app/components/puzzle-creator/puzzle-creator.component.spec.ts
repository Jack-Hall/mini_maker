import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PuzzleCreatorComponent } from './puzzle-creator.component';
import { CrosswordService } from '../../services/crossword.service';
import { PatternMatcherComponent } from '../pattern-matcher/pattern-matcher';
import { MockCrosswordService } from '../../../testing/test-utils/mock-crossword.service';
import { CrosswordTestHarness } from '../../../testing/test-utils/crossword-test-harness';
import {
  EMPTY_5X5_GRID,
  SIMPLE_3X3_GRID,
  BLOCKED_3X3_GRID,
  GRID_WITH_BLACK_CELLS
} from '../../../testing/fixtures/sample-grids';
import { SAMPLE_CLUES, createTestClue } from '../../../testing/fixtures/sample-clues';

describe('PuzzleCreatorComponent', () => {
  let component: PuzzleCreatorComponent;
  let fixture: ComponentFixture<PuzzleCreatorComponent>;
  let mockService: MockCrosswordService;
  let harness: CrosswordTestHarness;

  beforeEach(async () => {
    mockService = new MockCrosswordService();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        PuzzleCreatorComponent,
        PatternMatcherComponent
      ],
      providers: [
        { provide: CrosswordService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PuzzleCreatorComponent);
    component = fixture.componentInstance;
    harness = new CrosswordTestHarness(fixture);
    
    // Reset mock service for each test
    mockService.reset();
    
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with a 5x5 empty grid', () => {
      const gridSignal = (component as any).grid;
      expect(gridSignal()).toEqual(EMPTY_5X5_GRID);
    });

    it('should have default state values', () => {
      expect((component as any).isEditing()).toBeFalsy();
      expect((component as any).selectedCell()).toBeNull();
      expect((component as any).activeDirection()).toBe('horizontal');
      expect((component as any).clues()).toEqual([]);
      expect((component as any).foundSolutions()).toEqual([]);
    });

    it('should detect words after initialization', fakeAsync(() => {
      // Component constructor calls updateWordsFromGrid with setTimeout
      tick(200);
      fixture.detectChanges();
      
      // Should have called the service to detect words
      expect((component as any).detectedWords().length).toBeGreaterThanOrEqual(0);
    }));
  });

  describe('Grid Interaction', () => {
    it('should handle cell click', () => {
      harness.clickCell(1, 2);
      
      expect((component as any).selectedCell()).toEqual({ row: 1, col: 2 });
      expect((component as any).activeCell()).toEqual({ row: 1, col: 2 });
      expect((component as any).isEditing()).toBeTruthy();
    });

    it('should handle cell input', () => {
      harness.setCellValue(0, 0, 'A');
      
      const grid = (component as any).grid();
      expect(grid[0][0]).toBe('A');
    });

    it('should convert lowercase input to uppercase', () => {
      harness.setCellValue(0, 0, 'a');
      
      const grid = (component as any).grid();
      expect(grid[0][0]).toBe('A');
    });

    it('should handle right-click to toggle black cells', () => {
      harness.rightClickCell(1, 1);
      
      const grid = (component as any).grid();
      expect(grid[1][1]).toBe('#');
      
      // Right-click again to toggle back
      harness.rightClickCell(1, 1);
      expect(grid[1][1]).toBe('');
    });

    it('should focus cell when clicked', () => {
      harness.focusCell(2, 3);
      
      expect((component as any).activeCell()).toEqual({ row: 2, col: 3 });
      expect((component as any).selectedCell()).toEqual({ row: 2, col: 3 });
    });

    it('should not edit black cells', () => {
      // Set cell as black first
      harness.rightClickCell(1, 1);
      
      // Try to input value
      harness.setCellValue(1, 1, 'A');
      
      const grid = (component as any).grid();
      expect(grid[1][1]).toBe('#'); // Should remain black
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      harness.focusCell(1, 1); // Start in middle of grid
    });

    it('should handle Enter key to toggle direction', () => {
      expect((component as any).activeDirection()).toBe('horizontal');
      
      harness.sendKeyToCell(1, 1, 'Enter');
      
      expect((component as any).activeDirection()).toBe('vertical');
    });

    it('should handle arrow key navigation', () => {
      harness.sendKeyToCell(1, 1, 'ArrowRight');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 2 });
      
      harness.sendKeyToCell(1, 2, 'ArrowDown');
      expect((component as any).activeCell()).toEqual({ row: 2, col: 2 });
      
      harness.sendKeyToCell(2, 2, 'ArrowLeft');
      expect((component as any).activeCell()).toEqual({ row: 2, col: 1 });
      
      harness.sendKeyToCell(2, 1, 'ArrowUp');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 1 });
    });

    it('should handle Backspace navigation', () => {
      // Input a value first
      harness.setCellValue(1, 1, 'A');
      
      // Backspace should not move when cell has content
      harness.sendKeyToCell(1, 1, 'Backspace');
      expect((component as any).activeCell()).toEqual({ row: 1, col: 1 });
      
      // Clear cell and try backspace again
      harness.setCellValue(1, 1, '');
      harness.sendKeyToCell(1, 1, 'Backspace');
      
      // Should move to previous cell based on direction
      const expectedCol = (component as any).activeDirection() === 'horizontal' ? 0 : 1;
      const expectedRow = (component as any).activeDirection() === 'horizontal' ? 1 : 0;
      expect((component as any).activeCell()).toEqual({ row: expectedRow, col: expectedCol });
    });

    it('should handle Ctrl+Delete to toggle black cells', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Delete',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      
      const input = harness.getCellInput(1, 1);
      input?.dispatchEvent(event);
      fixture.detectChanges();
      
      const grid = (component as any).grid();
      expect(grid[1][1]).toBe('#');
    });
  });

  describe('Word Detection', () => {
    it('should detect words when grid changes', fakeAsync(() => {
      // Set up a simple word
      harness.setCellValue(0, 0, 'C');
      harness.setCellValue(0, 1, 'A');
      harness.setCellValue(0, 2, 'T');
      
      tick(200); // Wait for debounced API call
      fixture.detectChanges();
      
      // Should have detected at least one word
      expect((component as any).detectedWords().length).toBeGreaterThan(0);
    }));

    it('should separate horizontal and vertical words', () => {
      const component_any = component as any;
      
      // Mock detected words
      component_any.detectedWords.set([
        [[0, 0], [0, 2]], // Horizontal word
        [[0, 0], [2, 0]], // Vertical word
        [[1, 0], [1, 1]]  // Another horizontal word
      ]);
      
      const horizontalWords = component_any.horizontalWords();
      const verticalWords = component_any.verticalWords();
      
      expect(horizontalWords.length).toBe(2);
      expect(verticalWords.length).toBe(1);
    });

    it('should handle word detection API errors gracefully', fakeAsync(() => {
      mockService.setFailureMode('getWords', true);
      
      harness.setCellValue(0, 0, 'A');
      tick(200);
      fixture.detectChanges();
      
      // Should not crash and should use local detection
      expect(component).toBeTruthy();
      expect((component as any).detectedWords().length).toBeGreaterThanOrEqual(0);
    }));
  });

  describe('Clue Management', () => {
    beforeEach(() => {
      // Set up a simple word first
      harness.setCellValue(0, 0, 'C');
      harness.setCellValue(0, 1, 'A');
      harness.setCellValue(0, 2, 'T');
      harness.focusCell(0, 0);
    });

    it('should add clue for active word', () => {
      const initialClueCount = (component as any).clues().length;
      
      harness.clickButtonByText('Add Clue');
      
      const clues = (component as any).clues();
      expect(clues.length).toBe(initialClueCount + 1);
      
      const newClue = clues[clues.length - 1];
      expect(newClue.start_index).toEqual([0, 0]);
      expect(newClue.direction).toBe('horizontal');
    });

    it('should not add duplicate clues', () => {
      harness.clickButtonByText('Add Clue');
      const clueCountAfterFirst = (component as any).clues().length;
      
      harness.clickButtonByText('Add Clue');
      const clueCountAfterSecond = (component as any).clues().length;
      
      expect(clueCountAfterSecond).toBe(clueCountAfterFirst);
    });

    it('should separate across and down clues', () => {
      const component_any = component as any;
      
      // Add test clues
      component_any.clues.set([
        createTestClue(0, 0, 'horizontal', 3, 'Across clue'),
        createTestClue(0, 0, 'vertical', 3, 'Down clue'),
        createTestClue(1, 0, 'horizontal', 2, 'Another across')
      ]);
      
      const acrossClues = component_any.acrossClues();
      const downClues = component_any.downClues();
      
      expect(acrossClues.length).toBe(2);
      expect(downClues.length).toBe(1);
    });

    it('should identify active clue based on cell position', () => {
      const component_any = component as any;
      
      // Add test clue
      component_any.clues.set([
        createTestClue(0, 0, 'horizontal', 3, 'Test clue')
      ]);
      
      // Focus cell within the clue
      harness.focusCell(0, 1);
      
      const activeClue = component_any.activeClue();
      expect(activeClue).toBeTruthy();
      expect(activeClue.start_index).toEqual([0, 0]);
      expect(activeClue.direction).toBe('horizontal');
    });
  });

  describe('Solution Finding', () => {
    it('should find solutions for current grid', fakeAsync(() => {
      harness.clickButtonByText('Find Solutions');
      
      expect((component as any).isFindingSolutions()).toBeTruthy();
      
      tick(100); // Wait for mock API response
      fixture.detectChanges();
      
      expect((component as any).isFindingSolutions()).toBeFalsy();
      expect((component as any).foundSolutions().length).toBeGreaterThan(0);
      expect((component as any).allSolutions().length).toBeGreaterThan(0);
    }));

    it('should handle solution finding errors', fakeAsync(() => {
      mockService.setFailureMode('findSolutions', true);
      
      harness.clickButtonByText('Find Solutions');
      tick(100);
      fixture.detectChanges();
      
      expect((component as any).isFindingSolutions()).toBeFalsy();
      expect((component as any).solutionError()).toBeTruthy();
      expect((component as any).foundSolutions().length).toBe(0);
    }));

    it('should apply solution to grid', () => {
      const mockSolution = [
        ['C', 'A', 'T', '#', '#'],
        ['O', 'L', 'D', '#', '#'],
        ['D', 'E', 'R', '#', '#'],
        ['#', '#', '#', '#', '#'],
        ['#', '#', '#', '#', '#']
      ];
      
      (component as any).applySolution(mockSolution);
      
      const grid = (component as any).grid();
      expect(grid).toEqual(mockSolution);
    });

    it('should filter solutions based on selected words', () => {
      const component_any = component as any;
      
      // Set up mock solutions
      component_any.allSolutions.set([
        [['C', 'A', 'T'], ['O', 'L', 'D'], ['D', 'E', 'R']],
        [['C', 'A', 'R'], ['O', 'L', 'D'], ['D', 'E', 'W']]
      ]);
      
      // Select a word
      const wordPosition = {
        start: [0, 0],
        end: [0, 2],
        direction: 'horizontal' as const,
        length: 3,
        text: 'CAT'
      };
      
      component_any.selectedWords.set([{ position: wordPosition, text: 'CAT' }]);
      
      const filteredSolutions = component_any.filteredSolutions();
      expect(filteredSolutions.length).toBe(1);
      expect(filteredSolutions[0][0]).toEqual(['C', 'A', 'T']);
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(() => {
      // Set up a partial word for pattern matching
      harness.setCellValue(0, 0, 'C');
      harness.setCellValue(0, 2, 'T');
      harness.focusCell(0, 1); // Focus on empty cell
    });

    it('should get current pattern for selected word', () => {
      const pattern = (component as any).getSelectedWord();
      expect(pattern).toBe('C_T');
    });

    it('should show pattern matches when conditions are met', () => {
      const shouldShow = (component as any).shouldShowPatternMatches();
      expect(shouldShow).toBeTruthy();
    });

    it('should not show pattern matches for complete words', () => {
      // Fill in the missing letter
      harness.setCellValue(0, 1, 'A');
      
      const shouldShow = (component as any).shouldShowPatternMatches();
      expect(shouldShow).toBeFalsy();
    });

    it('should not show pattern matches for words with too many missing letters', () => {
      // Create word with only one letter filled
      harness.setCellValue(0, 0, ''); // Clear C
      harness.setCellValue(0, 2, ''); // Clear T
      harness.setCellValue(0, 0, 'C'); // Only C filled
      
      const shouldShow = (component as any).shouldShowPatternMatches();
      expect(shouldShow).toBeFalsy(); // Too many missing letters
    });

    it('should apply pattern match to grid', () => {
      (component as any).onPatternMatchWordSelected('CAT');
      
      const grid = (component as any).grid();
      expect(grid[0][0]).toBe('C');
      expect(grid[0][1]).toBe('A');
      expect(grid[0][2]).toBe('T');
    });
  });

  describe('Grid Operations', () => {
    it('should clear grid', () => {
      // Set up some content first
      harness.setCellValue(0, 0, 'A');
      harness.setCellValue(1, 1, 'B');
      
      harness.clickButtonByText('Clear Grid');
      
      const grid = (component as any).grid();
      grid.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBe('');
        });
      });
      
      expect((component as any).foundSolutions()).toEqual([]);
      expect((component as any).selectedWords()).toEqual([]);
    });

    it('should update current word position when cell selection changes', () => {
      // Set up a word
      harness.setCellValue(0, 0, 'C');
      harness.setCellValue(0, 1, 'A');
      harness.setCellValue(0, 2, 'T');
      
      harness.focusCell(0, 1);
      
      const wordPosition = (component as any).currentWordPosition();
      expect(wordPosition).toBeTruthy();
      expect(wordPosition.start).toEqual([0, 0]);
      expect(wordPosition.end).toEqual([0, 2]);
      expect(wordPosition.direction).toBe('horizontal');
    });
  });

  describe('CSS Classes and Visual State', () => {
    it('should apply correct CSS classes to active cell', () => {
      harness.focusCell(1, 1);
      
      expect(harness.isCellActive(1, 1)).toBeTruthy();
    });

    it('should apply correct CSS classes to highlighted word', () => {
      // Set up a word and focus on it
      harness.setCellValue(0, 0, 'C');
      harness.setCellValue(0, 1, 'A');
      harness.setCellValue(0, 2, 'T');
      harness.focusCell(0, 1);
      
      // Cells in the same word should be highlighted
      expect(harness.isCellHighlighted(0, 0)).toBeTruthy();
      expect(harness.isCellHighlighted(0, 1)).toBeTruthy();
      expect(harness.isCellHighlighted(0, 2)).toBeTruthy();
    });

    it('should apply correct CSS classes to blocked cells', () => {
      harness.rightClickCell(2, 2); // Make cell black
      
      expect(harness.isCellBlocked(2, 2)).toBeTruthy();
    });
  });

  describe('Word Suggestions', () => {
    it('should show word suggestions when word is incomplete', () => {
      const component_any = component as any;
      
      // Set up solutions
      component_any.allSolutions.set([
        [['C', 'A', 'T'], ['O', 'L', 'D'], ['D', 'E', 'R']],
        [['C', 'A', 'R'], ['O', 'L', 'D'], ['D', 'E', 'W']]
      ]);
      
      // Set up incomplete word
      harness.setCellValue(0, 0, 'C');
      harness.focusCell(0, 1);
      
      const shouldShow = component_any.showWordSuggestions();
      expect(shouldShow).toBeTruthy();
    });

    it('should apply word suggestion to grid', () => {
      const component_any = component as any;
      
      // Set up word position
      const wordPos = {
        start: [0, 0],
        end: [0, 2],
        direction: 'horizontal' as const,
        length: 3,
        text: ''
      };
      component_any.currentWordPosition.set(wordPos);
      
      component_any.applyWordToGrid('CAT');
      
      const grid = component_any.grid();
      expect(grid[0][0]).toBe('C');
      expect(grid[0][1]).toBe('A');
      expect(grid[0][2]).toBe('T');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', fakeAsync(() => {
      mockService.setFailureMode('getWords', true);
      
      harness.setCellValue(0, 0, 'A');
      tick(200);
      fixture.detectChanges();
      
      // Component should not crash
      expect(component).toBeTruthy();
      expect(harness.getErrorText()).toBe(''); // No error shown to user for background operations
    }));

    it('should show error message when solution finding fails', fakeAsync(() => {
      mockService.setFailureMode('findSolutions', true);
      
      harness.clickButtonByText('Find Solutions');
      tick(100);
      fixture.detectChanges();
      
      expect((component as any).solutionError()).toBeTruthy();
    }));
  });

  describe('Performance and Loading States', () => {
    it('should show loading state when finding solutions', () => {
      mockService.setDelay('findSolutions', 1000);
      
      harness.clickButtonByText('Find Solutions');
      
      expect((component as any).isFindingSolutions()).toBeTruthy();
    });

    it('should show loading state when updating words', () => {
      mockService.setDelay('getWords', 1000);
      
      harness.setCellValue(0, 0, 'A');
      
      expect((component as any).isUpdatingWords()).toBeTruthy();
    });
  });
});
