import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Todo } from './todo';
import { TodoApi } from './todo-api';

describe('TodoApi', () => {
  let api: TodoApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TodoApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets all todos', () => {
    const todos: Todo[] = [{ id: 1, title: 'Buy milk' }];
    let result: Todo[] | undefined;

    api.getAll().subscribe((response) => (result = response));
    const request = http.expectOne('/api/todos');
    request.flush(todos);

    expect(request.request.method).toBe('GET');
    expect(result).toEqual(todos);
  });

  it('creates a todo', () => {
    const todo: Todo = { id: 1, title: 'Buy milk' };
    let result: Todo | undefined;

    api.create('Buy milk').subscribe((response) => (result = response));
    const request = http.expectOne('/api/todos');
    request.flush(todo);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ title: 'Buy milk' });
    expect(result).toEqual(todo);
  });

  it('deletes a todo by id', () => {
    let completed = false;

    api.delete(7).subscribe({ complete: () => (completed = true) });
    const request = http.expectOne('/api/todos/7');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    expect(completed).toBe(true);
  });

  it('treats deleting a todo that no longer exists as success', () => {
    let deleted = false;

    api.delete(7).subscribe({ next: () => (deleted = true) });
    http.expectOne('/api/todos/7').flush(null, { status: 404, statusText: 'Not Found' });

    expect(deleted).toBe(true);
  });

  it('passes on other delete failures', () => {
    let failed = false;

    api.delete(7).subscribe({ error: () => (failed = true) });
    http.expectOne('/api/todos/7').flush(null, { status: 500, statusText: 'Server Error' });

    expect(failed).toBe(true);
  });
});
