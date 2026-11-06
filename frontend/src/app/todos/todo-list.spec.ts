import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Todo } from './todo';
import { TodoApi } from './todo-api';
import { TITLE_MAX_LENGTH, TodoList } from './todo-list';

describe('TodoList', () => {
  const api = {
    getAll: vi.fn<TodoApi['getAll']>(),
    create: vi.fn<TodoApi['create']>(),
    delete: vi.fn<TodoApi['delete']>(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: TodoApi, useValue: api }] });
  });

  async function render(todos: Observable<Todo[]> = of([])): Promise<ComponentFixture<TodoList>> {
    api.getAll.mockReturnValue(todos);
    const fixture = TestBed.createComponent(TodoList);
    await fixture.whenStable();
    return fixture;
  }

  function element(fixture: ComponentFixture<TodoList>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function query<T extends Element>(fixture: ComponentFixture<TodoList>, selector: string): T {
    return element(fixture).querySelector<T>(selector)!;
  }

  function titles(fixture: ComponentFixture<TodoList>): string[] {
    const items = element(fixture).querySelectorAll('.todo-title');
    return Array.from(items, (item) => item.textContent!.trim());
  }

  async function typeTitle(fixture: ComponentFixture<TodoList>, value: string): Promise<void> {
    const input = query<HTMLInputElement>(fixture, 'input');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(fixture: ComponentFixture<TodoList>): Promise<void> {
    query<HTMLButtonElement>(fixture, 'button[type="submit"]').click();
    await fixture.whenStable();
  }

  async function clickDelete(fixture: ComponentFixture<TodoList>, title: string): Promise<void> {
    query<HTMLButtonElement>(fixture, `button[aria-label="Delete ${title}"]`).click();
    await fixture.whenStable();
  }

  it('shows a loading indicator until the todos arrive', async () => {
    const todos = new Subject<Todo[]>();
    const fixture = await render(todos);

    expect(element(fixture).querySelector('mat-progress-bar')).not.toBeNull();

    todos.next([{ id: 1, title: 'Buy milk' }]);
    todos.complete();
    await fixture.whenStable();

    expect(element(fixture).querySelector('mat-progress-bar')).toBeNull();
    expect(titles(fixture)).toEqual(['Buy milk']);
  });

  it('shows the todos returned by the API', async () => {
    const fixture = await render(
      of([
        { id: 1, title: 'Buy milk' },
        { id: 2, title: 'Walk the dog' },
      ]),
    );

    expect(titles(fixture)).toEqual(['Buy milk', 'Walk the dog']);
  });

  it('shows an empty state when there are no todos', async () => {
    const fixture = await render();

    expect(query(fixture, '.status').textContent).toContain('Nothing to do yet');
    expect(element(fixture).querySelector('.todos')).toBeNull();
  });

  it('shows an error instead of the empty state when the todos cannot be loaded', async () => {
    const fixture = await render(throwError(() => new Error('offline')));

    expect(query(fixture, '[role="alert"]').textContent).toContain('Could not load your todos');
    expect(element(fixture).textContent).not.toContain('Nothing to do yet');
  });

  it('only enables the add button once a title has been entered', async () => {
    const fixture = await render();
    const button = query<HTMLButtonElement>(fixture, 'button[type="submit"]');

    expect(button.disabled).toBe(true);
    await typeTitle(fixture, '   ');
    expect(button.disabled).toBe(true);
    await typeTitle(fixture, 'Buy milk');
    expect(button.disabled).toBe(false);
  });

  it('does not allow titles longer than the maximum length', async () => {
    const fixture = await render();

    await typeTitle(fixture, 'a'.repeat(TITLE_MAX_LENGTH + 1));

    expect(query<HTMLButtonElement>(fixture, 'button[type="submit"]').disabled).toBe(true);
  });

  it('adds a trimmed todo to the end of the list and clears the input', async () => {
    const fixture = await render(of([{ id: 1, title: 'Buy milk' }]));
    api.create.mockReturnValue(of({ id: 2, title: 'Walk the dog' }));

    await typeTitle(fixture, '  Walk the dog  ');
    await submit(fixture);

    expect(api.create).toHaveBeenCalledWith('Walk the dog');
    expect(titles(fixture)).toEqual(['Buy milk', 'Walk the dog']);
    expect(query<HTMLInputElement>(fixture, 'input').value).toBe('');
    expect(query(fixture, 'mat-form-field').classList).not.toContain('mat-form-field-invalid');
  });

  it('blocks a second submit while a todo is being saved', async () => {
    const fixture = await render();
    const pending = new Subject<Todo>();
    api.create.mockReturnValue(pending);

    await typeTitle(fixture, 'Buy milk');
    await submit(fixture);

    expect(query<HTMLInputElement>(fixture, 'input').readOnly).toBe(true);
    expect(query<HTMLButtonElement>(fixture, 'button[type="submit"]').disabled).toBe(true);
    query<HTMLFormElement>(fixture, 'form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.create).toHaveBeenCalledTimes(1);

    pending.next({ id: 1, title: 'Buy milk' });
    pending.complete();
    await fixture.whenStable();

    expect(titles(fixture)).toEqual(['Buy milk']);
    expect(query<HTMLInputElement>(fixture, 'input').readOnly).toBe(false);
  });

  it('shows an error and keeps the input when adding fails', async () => {
    const fixture = await render();
    api.create.mockReturnValue(throwError(() => new Error('offline')));

    await typeTitle(fixture, 'Buy milk');
    await submit(fixture);

    expect(query(fixture, '[role="alert"]').textContent).toContain('Could not add your todo');
    expect(query<HTMLInputElement>(fixture, 'input').value).toBe('Buy milk');
  });

  it('clears the error after the next successful change', async () => {
    const fixture = await render();
    api.create.mockReturnValueOnce(throwError(() => new Error('offline')));
    api.create.mockReturnValueOnce(of({ id: 1, title: 'Buy milk' }));

    await typeTitle(fixture, 'Buy milk');
    await submit(fixture);
    await submit(fixture);

    expect(titles(fixture)).toEqual(['Buy milk']);
    expect(element(fixture).querySelector('[role="alert"]')).toBeNull();
  });

  it('deletes a todo', async () => {
    const fixture = await render(
      of([
        { id: 1, title: 'Buy milk' },
        { id: 2, title: 'Walk the dog' },
      ]),
    );
    api.delete.mockReturnValue(of(undefined));

    await clickDelete(fixture, 'Buy milk');

    expect(api.delete).toHaveBeenCalledWith(1);
    expect(titles(fixture)).toEqual(['Walk the dog']);
  });

  it('keeps the todo and shows an error when deleting fails', async () => {
    const fixture = await render(of([{ id: 1, title: 'Buy milk' }]));
    api.delete.mockReturnValue(throwError(() => new Error('offline')));

    await clickDelete(fixture, 'Buy milk');

    expect(titles(fixture)).toEqual(['Buy milk']);
    expect(query(fixture, '[role="alert"]').textContent).toContain('Could not delete "Buy milk"');
  });
});
