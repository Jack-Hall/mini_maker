import { ComponentFixture } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

/**
 * Test utilities for crossword components
 */
export class CrosswordTestHarness {
  constructor(private fixture: ComponentFixture<any>) {}

  /**
   * Get all grid cells as DebugElements
   */
  getGridCells(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('.editor-cell, .editable-cell'));
  }

  /**
   * Get a specific grid cell by row and column
   */
  getGridCell(row: number, col: number): DebugElement | null {
    return this.fixture.debugElement.query(
      By.css(`[data-row="${row}"][data-col="${col}"]`)
    );
  }

  /**
   * Get the input element for a specific cell
   */
  getCellInput(row: number, col: number): HTMLInputElement | null {
    const cell = this.getGridCell(row, col);
    return cell?.nativeElement as HTMLInputElement;
  }

  /**
   * Set a value in a grid cell and trigger events
   */
  setCellValue(row: number, col: number, value: string): void {
    const input = this.getCellInput(row, col);
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      this.fixture.detectChanges();
    }
  }

  /**
   * Simulate keyboard event on a cell
   */
  sendKeyToCell(row: number, col: number, key: string, eventType: 'keydown' | 'keyup' = 'keydown'): void {
    const input = this.getCellInput(row, col);
    if (input) {
      const event = new KeyboardEvent(eventType, {
        key,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(event);
      this.fixture.detectChanges();
    }
  }

  /**
   * Click on a grid cell
   */
  clickCell(row: number, col: number): void {
    const cell = this.getGridCell(row, col);
    if (cell) {
      cell.nativeElement.click();
      this.fixture.detectChanges();
    }
  }

  /**
   * Right-click on a grid cell
   */
  rightClickCell(row: number, col: number): void {
    const cell = this.getGridCell(row, col);
    if (cell) {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2
      });
      
      // Prevent the default context menu
      event.preventDefault = jasmine.createSpy('preventDefault');
      
      cell.nativeElement.dispatchEvent(event);
      this.fixture.detectChanges();
      
      // Also trigger the component's right-click handler directly if needed
      const component = this.fixture.componentInstance;
      if (component && typeof component.onCellRightClick === 'function') {
        component.onCellRightClick(row, col, event);
        this.fixture.detectChanges();
      }
    }
  }

  /**
   * Focus a specific cell
   */
  focusCell(row: number, col: number): void {
    const input = this.getCellInput(row, col);
    if (input) {
      input.focus();
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      this.fixture.detectChanges();
    }
  }

  /**
   * Get all clue elements
   */
  getClueElements(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('.clue-item, .clue'));
  }

  /**
   * Get clue elements by direction
   */
  getCluesByDirection(direction: 'across' | 'down' | 'horizontal' | 'vertical'): DebugElement[] {
    const selector = direction === 'across' || direction === 'horizontal' 
      ? '.across-clues .clue-item, .horizontal-clues .clue-item'
      : '.down-clues .clue-item, .vertical-clues .clue-item';
    return this.fixture.debugElement.queryAll(By.css(selector));
  }

  /**
   * Click on a specific clue
   */
  clickClue(clueIndex: number, direction: 'across' | 'down' | 'horizontal' | 'vertical'): void {
    const clues = this.getCluesByDirection(direction);
    if (clues[clueIndex]) {
      clues[clueIndex].nativeElement.click();
      this.fixture.detectChanges();
    }
  }

  /**
   * Get button by text content
   */
  getButtonByText(text: string): DebugElement | null {
    const buttons = this.fixture.debugElement.queryAll(By.css('button'));
    return buttons.find(button => 
      button.nativeElement.textContent?.trim().includes(text)
    ) || null;
  }

  /**
   * Click button by text content
   */
  clickButtonByText(text: string): void {
    const button = this.getButtonByText(text);
    if (button) {
      button.nativeElement.click();
      this.fixture.detectChanges();
    }
  }

  /**
   * Get the current grid state as a 2D array
   */
  getGridState(): string[][] {
    const grid: string[][] = [];
    const cells = this.getGridCells();
    
    cells.forEach(cell => {
      const row = parseInt(cell.nativeElement.dataset['row'] || '0');
      const col = parseInt(cell.nativeElement.dataset['col'] || '0');
      
      if (!grid[row]) grid[row] = [];
      
      const input = cell.nativeElement as HTMLInputElement;
      grid[row][col] = input.value || '';
    });
    
    return grid;
  }

  /**
   * Check if a cell has a specific CSS class
   */
  cellHasClass(row: number, col: number, className: string): boolean {
    const cell = this.getGridCell(row, col);
    return cell?.nativeElement.classList.contains(className) || false;
  }

  /**
   * Check if a cell is active/selected
   */
  isCellActive(row: number, col: number): boolean {
    return this.cellHasClass(row, col, 'active') || this.cellHasClass(row, col, 'selected');
  }

  /**
   * Check if a cell is highlighted as part of active word
   */
  isCellHighlighted(row: number, col: number): boolean {
    return this.cellHasClass(row, col, 'highlighted') || this.cellHasClass(row, col, 'highlighted-cell');
  }

  /**
   * Check if a cell is blocked/black
   */
  isCellBlocked(row: number, col: number): boolean {
    return this.cellHasClass(row, col, 'blocked') || this.cellHasClass(row, col, 'black-cell');
  }

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(): Promise<void> {
    await this.fixture.whenStable();
    this.fixture.detectChanges();
  }

  /**
   * Get loading indicator
   */
  getLoadingIndicator(): DebugElement | null {
    return this.fixture.debugElement.query(By.css('.loading, .spinner, [data-testid="loading"]'));
  }

  /**
   * Check if component is in loading state
   */
  isLoading(): boolean {
    return !!this.getLoadingIndicator();
  }

  /**
   * Get error message element
   */
  getErrorMessage(): DebugElement | null {
    return this.fixture.debugElement.query(By.css('.error, .error-message, [data-testid="error"]'));
  }

  /**
   * Get error message text
   */
  getErrorText(): string {
    const errorElement = this.getErrorMessage();
    return errorElement?.nativeElement.textContent?.trim() || '';
  }
}
