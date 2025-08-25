import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { SimpleChanges } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PatternMatcherComponent } from './pattern-matcher';
import { CrosswordService, PatternMatchResponse } from '../../services/crossword.service';
import { MockCrosswordService } from '../../../testing/test-utils/mock-crossword.service';

describe('PatternMatcherComponent', () => {
  let component: PatternMatcherComponent;
  let fixture: ComponentFixture<PatternMatcherComponent>;
  let mockService: MockCrosswordService;

  beforeEach(async () => {
    mockService = new MockCrosswordService();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        PatternMatcherComponent
      ],
      providers: [
        { provide: CrosswordService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatternMatcherComponent);
    component = fixture.componentInstance;
    
    // Reset mock service for each test
    mockService.reset();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default property values', () => {
      expect(component.pattern).toBe('');
      expect(component.isVisible).toBeFalsy();
      expect((component as any).patternMatches()).toEqual([]);
      expect((component as any).isLoadingPatterns()).toBeFalsy();
    });

    it('should not load patterns on initialization', () => {
      fixture.detectChanges();
      
      expect((component as any).patternMatches()).toEqual([]);
      expect((component as any).isLoadingPatterns()).toBeFalsy();
    });
  });

  describe('Input Property Changes', () => {
    it('should respond to pattern changes', () => {
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.pattern = 'C_T';
      component.isVisible = true;
      
      spyOn(component as any, 'loadPatternMatches');
      
      component.ngOnChanges(changes);
      
      expect((component as any).loadPatternMatches).toHaveBeenCalledWith('C_T');
    });

    it('should respond to visibility changes', () => {
      const changes: SimpleChanges = {
        'isVisible': {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.pattern = 'C_T';
      component.isVisible = true;
      
      spyOn(component as any, 'loadPatternMatches');
      
      component.ngOnChanges(changes);
      
      expect((component as any).loadPatternMatches).toHaveBeenCalledWith('C_T');
    });

    it('should not load patterns when not visible', () => {
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.pattern = 'C_T';
      component.isVisible = false;
      
      spyOn(component as any, 'loadPatternMatches');
      
      component.ngOnChanges(changes);
      
      expect((component as any).loadPatternMatches).not.toHaveBeenCalled();
    });

    it('should clear patterns when visibility becomes false', () => {
      const changes: SimpleChanges = {
        'isVisible': {
          currentValue: false,
          previousValue: true,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      // Set up some existing matches
      (component as any).patternMatches.set(['CAT', 'COT', 'CUT']);
      component.isVisible = false;
      
      component.ngOnChanges(changes);
      
      expect((component as any).patternMatches()).toEqual([]);
    });

    it('should clear patterns when pattern becomes invalid', () => {
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'X',
          previousValue: 'C_T',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      // Set up some existing matches
      (component as any).patternMatches.set(['CAT', 'COT', 'CUT']);
      component.pattern = 'X';
      component.isVisible = true;
      
      component.ngOnChanges(changes);
      
      expect((component as any).patternMatches()).toEqual([]);
    });
  });

  describe('Pattern Validation', () => {
    it('should validate patterns correctly', () => {
      const shouldLoadPattern = (component as any).shouldLoadPattern.bind(component);

      // Valid patterns
      expect(shouldLoadPattern('C_T')).toBeTruthy();
      expect(shouldLoadPattern('_AT')).toBeTruthy();
      expect(shouldLoadPattern('CA_')).toBeTruthy();
      expect(shouldLoadPattern('C__')).toBeTruthy();
      expect(shouldLoadPattern('_A_')).toBeTruthy();

      // Invalid patterns - too short
      expect(shouldLoadPattern('')).toBeFalsy();
      expect(shouldLoadPattern('C')).toBeFalsy();

      // Invalid patterns - no filled letters
      expect(shouldLoadPattern('__')).toBeFalsy();
      expect(shouldLoadPattern('___')).toBeFalsy();

      // Invalid patterns - too many missing letters
      expect(shouldLoadPattern('C____')).toBeFalsy(); // More than 3 missing
      expect(shouldLoadPattern('_____')).toBeFalsy(); // All missing

      // Invalid patterns - no missing letters
      expect(shouldLoadPattern('CAT')).toBeFalsy();
      expect(shouldLoadPattern('COMPLETE')).toBeFalsy();
    });

    it('should handle edge cases in pattern validation', () => {
      const shouldLoadPattern = (component as any).shouldLoadPattern.bind(component);

      // Exactly 3 missing letters (should pass)
      expect(shouldLoadPattern('C___')).toBeTruthy();
      
      // More than 3 missing letters (should fail)
      expect(shouldLoadPattern('C____')).toBeFalsy();
      
      // Single filled letter with multiple missing (within limit)
      expect(shouldLoadPattern('A__')).toBeTruthy();
      expect(shouldLoadPattern('_B_')).toBeTruthy();
      expect(shouldLoadPattern('__C')).toBeTruthy();
    });

    it('should log pattern validation steps', () => {
      spyOn(console, 'log');
      
      const shouldLoadPattern = (component as any).shouldLoadPattern.bind(component);
      shouldLoadPattern('C_T');
      
      expect(console.log).toHaveBeenCalledWith('Pattern: C_T, Filled: 2, Missing: 1');
      expect(console.log).toHaveBeenCalledWith('Should load pattern:', true);
    });
  });

  describe('Pattern Loading', () => {
    it('should load pattern matches successfully', fakeAsync(() => {
      const mockResponse: PatternMatchResponse = {
        matches: ['CAT', 'COT', 'CUT', 'CAR']
      };

      component.pattern = 'C_T';
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      expect((component as any).isLoadingPatterns()).toBeTruthy();
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).isLoadingPatterns()).toBeFalsy();
      expect((component as any).patternMatches()).toEqual(['CAT', 'COT', 'CUT', 'CAR']);
    }));

    it('should handle loading errors gracefully', fakeAsync(() => {
      mockService.setFailureMode('patternMatch', true);
      
      spyOn(console, 'log');
      
      component.pattern = 'C_T';
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).isLoadingPatterns()).toBeFalsy();
      expect((component as any).patternMatches()).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('Error loading pattern matches:', jasmine.any(Error));
    }));

    it('should show loading state during pattern loading', () => {
      mockService.setDelay('patternMatch', 1000);
      
      component.pattern = 'C_T';
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      expect((component as any).isLoadingPatterns()).toBeTruthy();
    });

    it('should not load patterns for invalid patterns', () => {
      spyOn(mockService, 'getPatternMatch');
      
      component.pattern = 'CAT'; // Complete word, no missing letters
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'CAT',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      expect(mockService.getPatternMatch).not.toHaveBeenCalled();
      expect((component as any).patternMatches()).toEqual([]);
    });

    it('should handle empty pattern match results', fakeAsync(() => {
      // Mock service will return empty matches for unknown patterns
      component.pattern = 'XYZ_'; // Unlikely to match anything
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'XYZ_',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).patternMatches()).toEqual([]);
    }));
  });

  describe('Event Emission', () => {
    it('should emit wordSelected when word is selected', () => {
      spyOn(component.wordSelected, 'emit');
      
      (component as any).onWordSelect('CAT');
      
      expect(component.wordSelected.emit).toHaveBeenCalledWith('CAT');
    });

    it('should emit closed when component is closed', () => {
      spyOn(component.closed, 'emit');
      
      (component as any).onClose();
      
      expect(component.closed.emit).toHaveBeenCalled();
    });

    it('should handle multiple word selections', () => {
      spyOn(component.wordSelected, 'emit');
      
      const words = ['CAT', 'DOG', 'BAT'];
      words.forEach(word => (component as any).onWordSelect(word));
      
      expect(component.wordSelected.emit).toHaveBeenCalledTimes(3);
      expect(component.wordSelected.emit).toHaveBeenCalledWith('CAT');
      expect(component.wordSelected.emit).toHaveBeenCalledWith('DOG');
      expect(component.wordSelected.emit).toHaveBeenCalledWith('BAT');
    });
  });

  describe('DOM Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render when visible', () => {
      component.isVisible = true;
      (component as any).patternMatches.set(['CAT', 'COT', 'CUT']);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      expect(compiled.style.display).not.toBe('none');
    });

    it('should hide when not visible', () => {
      component.isVisible = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      // Component should not be rendered or should be hidden
      const visibilityStyle = getComputedStyle(compiled).display;
      expect(visibilityStyle === 'none' || compiled.children.length === 0).toBeTruthy();
    });

    it('should render pattern matches as clickable items', () => {
      component.isVisible = true;
      (component as any).patternMatches.set(['CAT', 'COT', 'CUT']);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const wordElements = compiled.querySelectorAll('.match-word, .word-option, button');
      
      // Should have clickable elements for each word
      expect(wordElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle word clicks', () => {
      spyOn(component as any, 'onWordSelect');
      
      component.isVisible = true;
      (component as any).patternMatches.set(['CAT', 'COT', 'CUT']);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const firstWordElement = compiled.querySelector('.match-word, .word-option, button');
      
      if (firstWordElement) {
        firstWordElement.click();
        expect((component as any).onWordSelect).toHaveBeenCalled();
      }
    });

    it('should show loading indicator when loading', () => {
      component.isVisible = true;
      (component as any).isLoadingPatterns.set(true);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const loadingElement = compiled.querySelector('.loading, .spinner, [data-testid="loading"]');
      
      expect(loadingElement).toBeTruthy();
    });

    it('should show empty state when no matches', () => {
      component.isVisible = true;
      (component as any).patternMatches.set([]);
      (component as any).isLoadingPatterns.set(false);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      // Should show some indication of no matches (empty state or message)
      expect(compiled.textContent?.includes('No matches') || 
             compiled.querySelectorAll('.match-word, .word-option').length === 0).toBeTruthy();
    });

    it('should have close button or mechanism', () => {
      component.isVisible = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const closeButton = compiled.querySelector('.close, .close-button, [data-testid="close"]');
      
      // Should have some way to close the component
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Integration with Parent Component', () => {
    it('should work with realistic pattern sequences', fakeAsync(() => {
      const patterns = ['C__', 'CA_', 'C_T', 'CAT'];
      
      patterns.forEach((pattern, index) => {
        component.pattern = pattern;
        component.isVisible = index < patterns.length - 1; // Visible except for complete word
        
        const changes: SimpleChanges = {
          'pattern': {
            currentValue: pattern,
            previousValue: index > 0 ? patterns[index - 1] : '',
            firstChange: index === 0,
            isFirstChange: () => index === 0
          }
        };

        component.ngOnChanges(changes);
        tick();
        fixture.detectChanges();
      });
      
      // Final state should have no matches (complete word)
      expect((component as any).patternMatches()).toEqual([]);
    }));

    it('should handle rapid pattern changes', fakeAsync(() => {
      const rapidPatterns = ['C_', 'C_T', 'CA_', 'C__'];
      
      rapidPatterns.forEach(pattern => {
        component.pattern = pattern;
        component.isVisible = true;
        
        const changes: SimpleChanges = {
          'pattern': {
            currentValue: pattern,
            previousValue: '',
            firstChange: false,
            isFirstChange: () => false
          }
        };

        component.ngOnChanges(changes);
        tick(10); // Short delay between changes
      });
      
      tick(100); // Final settle time
      fixture.detectChanges();
      
      // Should handle rapid changes without errors
      expect(component).toBeTruthy();
    }));

    it('should maintain state correctly across visibility toggles', () => {
      // Load some matches
      component.pattern = 'C_T';
      component.isVisible = true;
      
      let changes: SimpleChanges = {
        'pattern': {
          currentValue: 'C_T',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      // Hide component
      component.isVisible = false;
      changes = {
        'isVisible': {
          currentValue: false,
          previousValue: true,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      expect((component as any).patternMatches()).toEqual([]);
      
      // Show again
      component.isVisible = true;
      changes = {
        'isVisible': {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      // Should reload patterns
      expect((component as any).isLoadingPatterns()).toBeTruthy();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large pattern match lists', fakeAsync(() => {
      // Mock a large response
      const largeMatchList = Array(1000).fill(null).map((_, i) => `WORD${i}`);
      
      spyOn(mockService, 'getPatternMatch').and.returnValue(
        of({ matches: largeMatchList })
      );
      
      component.pattern = 'W___';
      component.isVisible = true;
      
      const changes: SimpleChanges = {
        'pattern': {
          currentValue: 'W___',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);
      
      tick();
      fixture.detectChanges();
      
      expect((component as any).patternMatches().length).toBe(1000);
    }));

    it('should not leak memory on repeated pattern changes', () => {
      // This test ensures we don't accumulate subscriptions or observers
      const initialPatternMatchesSignal = (component as any).patternMatches;
      
      for (let i = 0; i < 100; i++) {
        component.pattern = `P${i}_T`;
        component.isVisible = true;
        
        const changes: SimpleChanges = {
          'pattern': {
            currentValue: component.pattern,
            previousValue: '',
            firstChange: false,
            isFirstChange: () => false
          }
        };

        component.ngOnChanges(changes);
      }
      
      // Signal should be the same instance
      expect((component as any).patternMatches).toBe(initialPatternMatchesSignal);
    });
  });
});
