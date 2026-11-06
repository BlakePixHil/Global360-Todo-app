import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Todo } from './todo';

@Injectable({ providedIn: 'root' })
export class TodoApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/todos';

  getAll(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.url);
  }

  create(title: string): Observable<Todo> {
    return this.http.post<Todo>(this.url, { title });
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/${id}`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound
            ? of(undefined)
            : throwError(() => error),
        ),
      );
  }
}
