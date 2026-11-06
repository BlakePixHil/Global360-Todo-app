import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { TodoApi } from './todos/todo-api';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: TodoApi, useValue: { getAll: () => of([]) } }],
    });
  });

  it('renders the heading and the todo list', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Todo list');
    expect(element.querySelector('app-todo-list')).not.toBeNull();
  });
});
