import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PuzzleSolverComponent } from './components/puzzle-solver/puzzle-solver.component';
import { PuzzleCreatorComponent } from './components/puzzle-creator/puzzle-creator.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'solve', component: PuzzleSolverComponent },
  { path: 'create', component: PuzzleCreatorComponent },
  { path: '**', redirectTo: '' }
];
